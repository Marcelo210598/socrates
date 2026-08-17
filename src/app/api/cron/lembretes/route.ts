import { NextResponse } from "next/server";
import { enviarMensagem } from "@/lib/telegram";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { listarTarefasParaLembrete } from "@/lib/tarefas";
import { listarCompromissosParaLembrete, registrarLembreteCompromisso } from "@/lib/compromissos";
import { sortearFrase } from "@/lib/frases";
import { prisma } from "@/lib/prisma";

/**
 * Chamado a cada 10 minutos pelo Cron Job do Railway. Manda (e repete) o
 * lembrete de tudo que venceu e ainda não foi resolvido — tarefa (Módulo 1)
 * e compromisso (Módulo 2), sempre com uma frase do Módulo 3 junto.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const segredo = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET) && segredo === process.env.CRON_SECRET;
}

async function legendaComFrase(userId: string, contexto: string): Promise<string> {
  const frase = await sortearFrase(userId, contexto);
  if (!frase) return "";
  return `\n\n💬 <i>${frase.texto}</i>${frase.autor ? ` — ${frase.autor}` : ""}`;
}

export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const usuario = await obterUsuarioAtual();
  const chatId = usuario.telegramId;

  if (!chatId) {
    return NextResponse.json({ ok: true, aviso: "TELEGRAM_OWNER_CHAT_ID não configurado ainda" });
  }

  const preferencia = await prisma.preferencia.findUnique({ where: { userId: usuario.id } });
  const agora = new Date();

  let tarefasLembradas = 0;
  let compromissosLembrados = 0;

  try {
    const tarefas = await listarTarefasParaLembrete({
      userId: usuario.id,
      fuso: usuario.timezone,
      agora,
      horaFechamentoDia: preferencia?.horaFechamentoDia ?? "22:00",
    });

    for (const t of tarefas) {
      const legenda = await legendaComFrase(usuario.id, t.titulo);
      await enviarMensagem(
        chatId,
        `🔴 <b>${t.titulo}</b>\n${t.descricaoRecorrencia}\n\nAinda não marcou hoje.${legenda}`,
        {
          botoes: [
            [
              { texto: "✅ Feita", dados: `feita:${t.tarefaId}` },
              { texto: "⏰ +1h", dados: `snooze:${t.tarefaId}` },
              { texto: "❌ Pular hoje", dados: `pular:${t.tarefaId}` },
            ],
          ],
        },
      );
      tarefasLembradas++;
    }

    const compromissos = await listarCompromissosParaLembrete({ userId: usuario.id, agora });

    for (const c of compromissos) {
      const legenda = await legendaComFrase(usuario.id, c.titulo);
      await enviarMensagem(chatId, `🔴 <b>${c.titulo}</b>\n${c.local ? `📍 ${c.local}\n` : ""}Passou da hora.${legenda}`, {
        botoes: [
          [
            { texto: "✅ Concluído", dados: `concluir:${c.id}` },
            { texto: "📅 Reagendar", dados: `reagendar:${c.id}` },
            { texto: "❌ Cancelar", dados: `cancelar:${c.id}` },
          ],
        ],
      });
      await registrarLembreteCompromisso(c.id);
      compromissosLembrados++;
    }
  } catch (erro) {
    console.error("[cron/lembretes] falha", erro);
    return NextResponse.json({ ok: false, erro: "Falha ao processar lembretes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tarefasLembradas, compromissosLembrados });
}
