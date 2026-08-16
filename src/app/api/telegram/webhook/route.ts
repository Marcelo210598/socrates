import { NextResponse } from "next/server";
import { AguardandoSessao, OrigemEntrada } from "@prisma/client";
import {
  baixarArquivo,
  editarMensagem,
  enviarMensagem,
  responderCallback,
  type TelegramUpdate,
} from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { extrairPendencia } from "@/lib/ia/pendencia";
import { transcreverAudio } from "@/lib/ia/transcricao";
import {
  apagarRascunho,
  buscarRascunho,
  criarRascunho,
  type DadosRascunhoCompromisso,
  type DadosRascunhoTarefa,
} from "@/lib/rascunhos";
import {
  alternarFeitaHoje,
  criarTarefaAtiva,
  listarTarefasDoDia,
  marcarPulada,
  adiarLembrete,
  descreverRecorrencia,
} from "@/lib/tarefas";
import {
  criarCompromissoConfirmado,
  listarCompromissosDoDia,
  reagendarCompromisso,
} from "@/lib/compromissos";
import { concluirCompromissoAction, cancelarCompromissoAction } from "@/app/compromissos/acoes";
import { definirSessao, limparSessao, obterSessao } from "@/lib/sessao";
import { hojeNoFuso, minutosDoDia, NOMES_DIAS_SEMANA } from "@/lib/datas";

/**
 * Webhook do Telegram — roteador de intenção do Sócrates.
 *
 * Texto/áudio livre vira Tarefa (repete) ou Compromisso (pontual) via
 * `extrairPendencia` (Módulos 1+2); comandos são atalho pro mesmo motor.
 * Confirmações e listas usam botões inline — nunca persiste sem seu ✅.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITULO_MAX_BOTAO = 28;

function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/** Só o dono do bot conversa com ele — sem isso, qualquer um que ache o @bot vê suas tarefas. */
function chatAutorizado(chatId: number): boolean {
  const dono = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!dono) return true; // bootstrapping: ainda não configurado, libera pra você pegar o chat id
  return String(chatId) === dono;
}

async function logarMensagem(params: {
  userId: string;
  direcao: "ENTRADA" | "SAIDA";
  texto: string;
  origem?: OrigemEntrada;
  intencao?: string;
}): Promise<void> {
  try {
    await prisma.mensagemLog.create({
      data: {
        userId: params.userId,
        direcao: params.direcao,
        texto: params.texto.slice(0, 2000),
        origem: params.origem ?? OrigemEntrada.TELEGRAM_TEXTO,
        intencao: params.intencao,
      },
    });
  } catch (erro) {
    console.error("[telegram] falha ao logar mensagem", erro);
  }
}

// ============================================================
// Cards e listas
// ============================================================

function cardRascunhoTarefa(dados: DadosRascunhoTarefa): string {
  const descricao = descreverRecorrencia(
    {
      recorrencia: dados.recorrencia,
      diasSemana: dados.diasSemana,
      diaDoMes: dados.diaDoMes,
      horaAlvo: dados.horaAlvo,
    },
    NOMES_DIAS_SEMANA,
  );
  return [
    "🔁 <b>Nova tarefa</b>",
    "",
    `<b>${dados.titulo}</b>`,
    descricao,
  ].join("\n");
}

function cardRascunhoCompromisso(dados: DadosRascunhoCompromisso): string {
  const dataFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${dados.data}T00:00:00`),
  );
  return [
    "📌 <b>Novo compromisso</b>",
    "",
    `<b>${dados.titulo}</b>`,
    `${dataFmt}${dados.hora ? ` · ${dados.hora}` : " · sem hora marcada"}`,
    dados.local ? `📍 ${dados.local}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function enviarListaTarefas(usuario: { id: string; timezone: string }, chatId: number): Promise<void> {
  const hoje = hojeNoFuso(usuario.timezone);
  const tarefas = await listarTarefasDoDia({
    userId: usuario.id,
    data: hoje,
    agoraEmMinutos: minutosDoDia(usuario.timezone),
  });

  if (tarefas.length === 0) {
    await enviarMensagem(chatId, "Sem tarefas pra hoje. 🎉");
    return;
  }

  await enviarMensagem(chatId, "🔁 <b>Tarefas de hoje</b>", {
    botoes: tarefas.map((t) => [
      {
        texto: `${t.feita ? "✅" : t.atrasada ? "🔴" : "⬜"} ${truncar(t.titulo, TITULO_MAX_BOTAO)}`,
        dados: `feita:${t.id}`,
      },
    ]),
  });
}

async function enviarResumoDoDia(usuario: { id: string; timezone: string }, chatId: number): Promise<void> {
  const hoje = hojeNoFuso(usuario.timezone);
  const [tarefas, compromissos] = await Promise.all([
    listarTarefasDoDia({ userId: usuario.id, data: hoje, agoraEmMinutos: minutosDoDia(usuario.timezone) }),
    listarCompromissosDoDia(usuario.id, usuario.timezone),
  ]);

  const linhas: string[] = ["📅 <b>Hoje</b>", ""];

  if (tarefas.length === 0) {
    linhas.push("🔁 Nenhuma tarefa rotineira.");
  } else {
    linhas.push("🔁 <b>Tarefas</b>");
    for (const t of tarefas) {
      linhas.push(`${t.feita ? "✅" : t.atrasada ? "🔴" : "⬜"} ${t.titulo}${t.horaAlvo ? ` · ${t.horaAlvo}` : ""}`);
    }
  }

  linhas.push("");

  if (compromissos.length === 0) {
    linhas.push("📌 Nenhum compromisso.");
  } else {
    linhas.push("📌 <b>Compromissos</b>");
    for (const c of compromissos) {
      const hora = c.horaDefinida
        ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: usuario.timezone }).format(
            c.quando,
          )
        : "sem hora";
      linhas.push(`• ${c.titulo} · ${hora}`);
    }
  }

  await enviarMensagem(chatId, linhas.join("\n"));
}

// ============================================================
// Confirmação de rascunho
// ============================================================

async function confirmarRascunho(usuario: { id: string; timezone: string }, rascunhoId: string): Promise<string> {
  const rascunho = await buscarRascunho(usuario.id, rascunhoId);
  if (!rascunho) return "Esse rascunho já não existe mais (deve ter expirado).";

  if (rascunho.tipo === "tarefa") {
    const d = rascunho.dados;
    await criarTarefaAtiva({
      userId: usuario.id,
      titulo: d.titulo,
      recorrencia: d.recorrencia,
      diasSemana: d.diasSemana,
      diaDoMes: d.diaDoMes,
      horaAlvo: d.horaAlvo,
    });
    await apagarRascunho(usuario.id, rascunhoId);
    return `✅ Tarefa <b>${d.titulo}</b> criada.`;
  }

  const d = rascunho.dados;
  await criarCompromissoConfirmado({
    userId: usuario.id,
    titulo: d.titulo,
    data: d.data,
    hora: d.hora,
    local: d.local,
    origem: OrigemEntrada.TELEGRAM_TEXTO,
    confiancaIa: d.confianca,
  });
  await apagarRascunho(usuario.id, rascunhoId);
  return `✅ Compromisso <b>${d.titulo}</b> confirmado.`;
}

// ============================================================
// Callback query (cliques nos botões)
// ============================================================

async function tratarCallback(callback: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  const dados = callback.data ?? "";
  const [acao, id] = dados.split(":");

  if (!chatId) {
    await responderCallback(callback.id);
    return;
  }

  const usuario = await obterUsuarioAtual();

  try {
    switch (acao) {
      case "rascunho_ok": {
        const texto = await confirmarRascunho(usuario, id);
        if (messageId) await editarMensagem(chatId, messageId, texto);
        await responderCallback(callback.id, "Feito!");
        return;
      }

      case "rascunho_no": {
        await apagarRascunho(usuario.id, id);
        if (messageId) await editarMensagem(chatId, messageId, "🗑️ Descartado.");
        await responderCallback(callback.id);
        return;
      }

      case "feita": {
        const novoEstado = await alternarFeitaHoje({ userId: usuario.id, tarefaId: id, fuso: usuario.timezone });
        await responderCallback(callback.id, novoEstado ? "Marcada como feita ✅" : "Desmarcada");
        if (messageId) await enviarListaTarefas(usuario, chatId).catch(() => undefined);
        return;
      }

      case "pular": {
        await marcarPulada({ userId: usuario.id, tarefaId: id, data: hojeNoFuso(usuario.timezone) });
        if (messageId) await editarMensagem(chatId, messageId, "⏭️ Pulei essa hoje. Volta amanhã.");
        await responderCallback(callback.id);
        return;
      }

      case "snooze": {
        await adiarLembrete({ userId: usuario.id, tarefaId: id, data: hojeNoFuso(usuario.timezone), minutos: 60 });
        await responderCallback(callback.id, "Te lembro em 1h ⏰");
        return;
      }

      case "concluir": {
        await concluirCompromissoAction(id);
        if (messageId) await editarMensagem(chatId, messageId, "✅ Marcado como concluído.");
        await responderCallback(callback.id);
        return;
      }

      case "cancelar": {
        await cancelarCompromissoAction(id);
        if (messageId) await editarMensagem(chatId, messageId, "❌ Cancelado.");
        await responderCallback(callback.id);
        return;
      }

      case "reagendar": {
        await definirSessao(usuario.id, AguardandoSessao.REAGENDAR_COMPROMISSO, id);
        await enviarMensagem(chatId, "Pra quando? Manda tipo \"amanhã 10h\" ou \"sexta às 15h\".");
        await responderCallback(callback.id);
        return;
      }

      default:
        await responderCallback(callback.id);
    }
  } catch (erro) {
    console.error("[telegram] falha no callback", acao, erro);
    await responderCallback(callback.id, "Deu ruim aqui, tenta de novo.");
  }
}

// ============================================================
// Mensagens (texto/áudio)
// ============================================================

async function resolverTextoDaMensagem(
  mensagem: NonNullable<TelegramUpdate["message"]>,
): Promise<{ texto: string; origem: OrigemEntrada } | null> {
  const textoDireto = mensagem.text?.trim();
  if (textoDireto) return { texto: textoDireto, origem: OrigemEntrada.TELEGRAM_TEXTO };

  const audio = mensagem.voice ?? mensagem.audio;
  if (!audio) return null;

  try {
    const bytes = await baixarArquivo(audio.file_id);
    const transcricao = await transcreverAudio({
      bytes,
      nomeArquivo: "audio.ogg",
      mimeType: audio.mime_type ?? "audio/ogg",
    });
    return { texto: transcricao, origem: OrigemEntrada.TELEGRAM_AUDIO };
  } catch (erro) {
    console.error("[telegram] falha na transcrição", erro);
    return null;
  }
}

async function tratarRespostaDeReagendamento(
  usuario: { id: string; timezone: string },
  chatId: number,
  refId: string,
  texto: string,
): Promise<void> {
  const extracao = await extrairPendencia({ texto, agora: new Date(), fuso: usuario.timezone });
  const data = extracao.tipo === "compromisso" ? extracao.data : null;
  const hora = extracao.tipo === "compromisso" ? extracao.hora : null;

  if (!data) {
    await enviarMensagem(chatId, "Não peguei a data. Tenta de novo, tipo \"amanhã 10h\"?");
    return;
  }

  await reagendarCompromisso({ userId: usuario.id, compromissoId: refId, data, hora });
  await limparSessao(usuario.id);
  await enviarMensagem(chatId, "📅 Reagendado!");
}

async function tratarMensagemLivre(usuario: { id: string; timezone: string }, chatId: number, texto: string, origem: OrigemEntrada): Promise<void> {
  let extracao;
  try {
    extracao = await extrairPendencia({ texto, agora: new Date(), fuso: usuario.timezone });
  } catch (erro) {
    console.error("[telegram] falha na extração", erro);
    await enviarMensagem(chatId, "Deu ruim aqui do meu lado pra entender isso. Tenta reformular?");
    return;
  }

  await logarMensagem({ userId: usuario.id, direcao: "ENTRADA", texto, origem, intencao: extracao.tipo });

  if (extracao.ambiguo) {
    await enviarMensagem(chatId, extracao.pergunta ?? "Não peguei direito — manda de novo com mais detalhes?");
    return;
  }

  const rascunho = await criarRascunho(usuario.id, extracao);
  const card = extracao.tipo === "tarefa" ? cardRascunhoTarefa(extracao) : cardRascunhoCompromisso(extracao);

  await enviarMensagem(chatId, card, {
    botoes: [
      [
        { texto: "✅ Confirmar", dados: `rascunho_ok:${rascunho.id}` },
        { texto: "❌ Descartar", dados: `rascunho_no:${rascunho.id}` },
      ],
    ],
  });
}

async function tratarMensagem(mensagem: NonNullable<TelegramUpdate["message"]>): Promise<void> {
  const chatId = mensagem.chat.id;
  const texto0 = mensagem.text?.trim() ?? "";

  if (!chatAutorizado(chatId) && texto0 !== "/start") return;

  const usuario = await obterUsuarioAtual();

  if (texto0 === "/start") {
    if (!usuario.telegramId) {
      await prisma.user.update({ where: { id: usuario.id }, data: { telegramId: String(chatId) } });
    }
    await enviarMensagem(
      chatId,
      [
        "E aí! Sou o <b>Sócrates</b> 🦉",
        "",
        `Seu chat id é <code>${chatId}</code> — cola ele no <code>TELEGRAM_OWNER_CHAT_ID</code> do .env.`,
        "",
        "Manda /ajuda pra ver os comandos, ou só fala comigo normal:",
        "\"treinar academia toda segunda e quarta às 7h\" ou \"revisar contrato amanhã 15h\".",
      ].join("\n"),
    );
    return;
  }

  if (!chatAutorizado(chatId)) return; // dono já configurado, chat errado — ignora em silêncio

  if (texto0 === "/ajuda" || texto0 === "/help") {
    await enviarMensagem(
      chatId,
      [
        "<b>Comandos</b>",
        "/hoje — tarefas + compromissos de hoje",
        "/tarefas — lista com botão de marcar feita",
        "/nova — dica de como criar uma tarefa/compromisso",
        "",
        "Fora isso, fala normal: eu decido se é tarefa (repete) ou compromisso (pontual).",
      ].join("\n"),
    );
    return;
  }

  if (texto0 === "/tarefas") {
    await enviarListaTarefas(usuario, chatId);
    return;
  }

  if (texto0 === "/hoje") {
    await enviarResumoDoDia(usuario, chatId);
    return;
  }

  if (texto0 === "/nova") {
    await enviarMensagem(
      chatId,
      [
        "Me diz o que quer lembrar. Alguns exemplos:",
        "",
        "🔁 <i>\"treinar academia toda segunda e quarta às 7h\"</i>",
        "📌 <i>\"revisar o contrato amanhã às 15h\"</i>",
        "📌 <i>\"comprar presente pro aniversário da mãe\"</i> (sem hora, tudo bem)",
      ].join("\n"),
    );
    return;
  }

  const sessao = await obterSessao(usuario.id);
  const resolvido = await resolverTextoDaMensagem(mensagem);

  if (!resolvido) {
    await enviarMensagem(chatId, "Não entendi — manda texto ou áudio?");
    return;
  }

  if (sessao?.aguardando === AguardandoSessao.REAGENDAR_COMPROMISSO && sessao.refId) {
    await tratarRespostaDeReagendamento(usuario, chatId, sessao.refId, resolvido.texto);
    return;
  }

  await tratarMensagemLivre(usuario, chatId, resolvido.texto, resolvido.origem);
}

// ============================================================
// Entrada HTTP
// ============================================================

export async function POST(req: Request) {
  const segredo = req.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || segredo !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ erro: "json inválido" }, { status: 400 });
  }

  try {
    if (update.callback_query) {
      await tratarCallback(update.callback_query);
    } else if (update.message) {
      await tratarMensagem(update.message);
    }
  } catch (erro) {
    // Nunca deixamos o webhook estourar 500 — o Telegram reenviaria o update em loop.
    console.error("[telegram] erro não tratado", erro);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    rota: "webhook do telegram",
    configurado: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  });
}
