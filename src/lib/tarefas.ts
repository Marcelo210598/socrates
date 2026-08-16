import { Recorrencia, type Tarefa } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  diaDaSemana,
  diaDoMes,
  horaParaMinutos,
  hojeNoFuso,
  minutosDoDia,
  NOMES_DIAS_SEMANA,
} from "@/lib/datas";

/**
 * Regras do Módulo 1 — tarefas rotineiras.
 *
 * O "check do dia" fica em `TarefaExecucao`, um registro por (tarefa, dia).
 * Não criamos esses registros antecipadamente: eles nascem no momento em que
 * você marca a tarefa como feita. Uma tarefa sem execução no dia = não feita.
 */

/** A tarefa cai neste dia? */
export function valeNoDia(tarefa: Pick<Tarefa, "recorrencia" | "diasSemana" | "diaDoMes">, data: Date): boolean {
  switch (tarefa.recorrencia) {
    case Recorrencia.DIARIA:
      return true;

    case Recorrencia.SEMANAL:
    case Recorrencia.DIAS_SEMANA:
      return tarefa.diasSemana.includes(diaDaSemana(data));

    case Recorrencia.MENSAL:
      return tarefa.diaDoMes === diaDoMes(data);

    case Recorrencia.UNICA:
      // Compromissos avulsos (Módulo 2) cobrem tarefa de data única.
      return false;

    default:
      return false;
  }
}

export type TarefaDoDia = {
  id: string;
  titulo: string;
  descricao: string | null;
  horaAlvo: string | null;
  recorrencia: Recorrencia;
  diasSemana: number[];
  diaDoMes: number | null;
  feita: boolean;
  /** Já passou da hora alvo e continua não feita. */
  atrasada: boolean;
};

/** Tarefas que caem no dia, com o check já resolvido. */
export async function listarTarefasDoDia(params: {
  userId: string;
  data: Date;
  /** Minutos desde a meia-noite, pra saber o que já está atrasado. */
  agoraEmMinutos: number;
}): Promise<TarefaDoDia[]> {
  const { userId, data, agoraEmMinutos } = params;

  const tarefas = await prisma.tarefa.findMany({
    where: { userId, ativa: true },
    include: {
      execucoes: {
        where: { data },
        select: { feita: true },
      },
    },
    orderBy: [{ ordem: "asc" }, { criadaEm: "asc" }],
  });

  return tarefas
    .filter((t) => valeNoDia(t, data))
    .map((t) => {
      const feita = t.execucoes[0]?.feita ?? false;
      const minutosAlvo = horaParaMinutos(t.horaAlvo);

      return {
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao,
        horaAlvo: t.horaAlvo,
        recorrencia: t.recorrencia,
        diasSemana: t.diasSemana,
        diaDoMes: t.diaDoMes,
        feita,
        atrasada: !feita && minutosAlvo !== null && agoraEmMinutos > minutosAlvo,
      };
    })
    .sort((a, b) => {
      // Com hora definida primeiro, em ordem cronológica; sem hora, no fim.
      const ma = horaParaMinutos(a.horaAlvo);
      const mb = horaParaMinutos(b.horaAlvo);
      if (ma === null && mb === null) return 0;
      if (ma === null) return 1;
      if (mb === null) return -1;
      return ma - mb;
    });
}

/** Marca/desmarca o check do dia. Cria o registro na primeira vez. */
export async function definirFeita(params: {
  userId: string;
  tarefaId: string;
  data: Date;
  feita: boolean;
}): Promise<void> {
  const { userId, tarefaId, data, feita } = params;

  // Confirma que a tarefa é DESTE usuário antes de mexer — sem isso, um id
  // chutado deixaria alterar a tarefa de outra pessoa.
  const tarefa = await prisma.tarefa.findFirst({
    where: { id: tarefaId, userId },
    select: { id: true },
  });

  if (!tarefa) throw new Error("Tarefa não encontrada");

  await prisma.tarefaExecucao.upsert({
    where: { tarefaId_data: { tarefaId, data } },
    update: { feita, feitaEm: feita ? new Date() : null },
    create: {
      userId,
      tarefaId,
      data,
      feita,
      feitaEm: feita ? new Date() : null,
    },
  });
}

/** Inverte o check de hoje (usado pelo botão do Telegram, que não sabe o estado atual). */
export async function alternarFeitaHoje(params: {
  userId: string;
  tarefaId: string;
  fuso: string;
}): Promise<boolean> {
  const { userId, tarefaId, fuso } = params;
  const data = hojeNoFuso(fuso);

  const execucao = await prisma.tarefaExecucao.findUnique({
    where: { tarefaId_data: { tarefaId, data } },
  });
  const novoEstado = !(execucao?.feita ?? false);

  await definirFeita({ userId, tarefaId, data, feita: novoEstado });
  return novoEstado;
}

/** Texto curto descrevendo a recorrência. Ex.: "Seg, Qua, Sex · 07:00". */
export function descreverRecorrencia(
  tarefa: Pick<TarefaDoDia, "recorrencia" | "diasSemana" | "diaDoMes" | "horaAlvo">,
  nomesDias: readonly string[],
): string {
  const partes: string[] = [];

  switch (tarefa.recorrencia) {
    case Recorrencia.DIARIA:
      partes.push("Todo dia");
      break;

    case Recorrencia.SEMANAL:
    case Recorrencia.DIAS_SEMANA:
      partes.push(
        tarefa.diasSemana.length > 0
          ? [...tarefa.diasSemana].sort((a, b) => a - b).map((d) => nomesDias[d]).join(", ")
          : "Sem dia definido",
      );
      break;

    case Recorrencia.MENSAL:
      partes.push(tarefa.diaDoMes ? `Todo dia ${tarefa.diaDoMes}` : "Todo mês");
      break;

    default:
      break;
  }

  if (tarefa.horaAlvo) partes.push(tarefa.horaAlvo);

  return partes.join(" · ");
}

/** Criação reaproveitada pelo formulário web (`/tarefas/acoes.ts`) e pelo bot do Telegram. */
export async function criarTarefaAtiva(params: {
  userId: string;
  titulo: string;
  recorrencia: Recorrencia;
  diasSemana?: number[];
  diaDoMes?: number | null;
  horaAlvo?: string | null;
}): Promise<Tarefa> {
  const { userId, titulo, recorrencia, diasSemana = [], diaDoMes: diaDoMesAlvo = null, horaAlvo = null } = params;

  const agregado = await prisma.tarefa.aggregate({ where: { userId }, _max: { ordem: true } });

  return prisma.tarefa.create({
    data: {
      userId,
      titulo,
      recorrencia,
      diasSemana: recorrencia === Recorrencia.DIAS_SEMANA ? diasSemana : [],
      diaDoMes: recorrencia === Recorrencia.MENSAL ? diaDoMesAlvo : null,
      horaAlvo,
      ordem: (agregado._max.ordem ?? 0) + 1,
    },
  });
}

/** Pula a ocorrência de hoje: não conta atraso, não repete lembrete até amanhã. */
export async function marcarPulada(params: {
  userId: string;
  tarefaId: string;
  data: Date;
}): Promise<void> {
  const { userId, tarefaId, data } = params;

  const tarefa = await prisma.tarefa.findFirst({ where: { id: tarefaId, userId }, select: { id: true } });
  if (!tarefa) throw new Error("Tarefa não encontrada");

  await prisma.tarefaExecucao.upsert({
    where: { tarefaId_data: { tarefaId, data } },
    update: { pulada: true },
    create: { userId, tarefaId, data, pulada: true },
  });
}

/** Adia o próximo lembrete (botão "+1h", por exemplo) sem mexer no horário alvo da tarefa. */
export async function adiarLembrete(params: {
  userId: string;
  tarefaId: string;
  data: Date;
  minutos: number;
}): Promise<void> {
  const { userId, tarefaId, data, minutos } = params;

  const tarefa = await prisma.tarefa.findFirst({ where: { id: tarefaId, userId }, select: { id: true } });
  if (!tarefa) throw new Error("Tarefa não encontrada");

  const proximoLembreteEm = new Date(Date.now() + minutos * 60 * 1000);

  await prisma.tarefaExecucao.upsert({
    where: { tarefaId_data: { tarefaId, data } },
    update: { proximoLembreteEm },
    create: { userId, tarefaId, data, proximoLembreteEm },
  });
}

export type TarefaParaLembrar = {
  tarefaId: string;
  titulo: string;
  descricaoRecorrencia: string;
};

/**
 * Tarefas do dia que venceram e ainda não foram marcadas (nem puladas) e cujo
 * lembrete está liberado pra repetir agora. Já grava o "lembrei agora" no
 * mesmo passo, pra dois ticks do cron não mandarem a mesma mensagem em cima.
 */
export async function listarTarefasParaLembrete(params: {
  userId: string;
  fuso: string;
  agora: Date;
  horaFechamentoDia: string;
  intervaloMinutos?: number;
}): Promise<TarefaParaLembrar[]> {
  const { userId, fuso, agora, horaFechamentoDia, intervaloMinutos = 10 } = params;

  const hoje = hojeNoFuso(fuso, agora);
  const agoraMin = minutosDoDia(fuso, agora);
  const minutosFechamento = horaParaMinutos(horaFechamentoDia) ?? 22 * 60;

  const tarefas = await prisma.tarefa.findMany({
    where: { userId, ativa: true },
    include: { execucoes: { where: { data: hoje } } },
    orderBy: [{ ordem: "asc" }, { criadaEm: "asc" }],
  });

  const resultado: TarefaParaLembrar[] = [];

  for (const t of tarefas) {
    if (!valeNoDia(t, hoje)) continue;

    const execucao = t.execucoes[0];
    if (execucao?.feita || execucao?.pulada) continue;

    // Sem horário definido? Só cutuca a partir do fechamento do dia.
    const minutosAlvo = horaParaMinutos(t.horaAlvo) ?? minutosFechamento;
    if (agoraMin < minutosAlvo) continue;

    if (execucao?.proximoLembreteEm && agora < execucao.proximoLembreteEm) continue;

    resultado.push({
      tarefaId: t.id,
      titulo: t.titulo,
      descricaoRecorrencia: descreverRecorrencia(t, NOMES_DIAS_SEMANA),
    });

    const proximoLembreteEm = new Date(agora.getTime() + intervaloMinutos * 60 * 1000);
    await prisma.tarefaExecucao.upsert({
      where: { tarefaId_data: { tarefaId: t.id, data: hoje } },
      update: { proximoLembreteEm },
      create: { userId, tarefaId: t.id, data: hoje, proximoLembreteEm },
    });
  }

  return resultado;
}
