/**
 * Datas e fusos.
 *
 * Regra do projeto: o banco guarda tudo em UTC. Um campo `@db.Date` (como
 * `TarefaExecucao.data`) representa um DIA no fuso do usuário, gravado como
 * meia-noite UTC daquele dia. Isso evita o clássico "a tarefa de segunda
 * apareceu no domingo" quando o servidor roda em outro fuso.
 */

export const FUSO_PADRAO = "America/Sao_Paulo";

/** Quebra um instante nos componentes de data/hora de um fuso específico. */
function partesNoFuso(instante: Date, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instante);

  const pegar = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? "0");

  return {
    ano: pegar("year"),
    mes: pegar("month"),
    dia: pegar("day"),
    hora: pegar("hour") % 24, // "24:00" acontece em alguns locales
    minuto: pegar("minute"),
  };
}

/**
 * O dia de hoje no fuso do usuário, como meia-noite UTC.
 * É este valor que vai pros campos `@db.Date`.
 */
export function hojeNoFuso(fuso: string = FUSO_PADRAO, agora: Date = new Date()): Date {
  const { ano, mes, dia } = partesNoFuso(agora, fuso);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Hora atual no fuso, em minutos desde a meia-noite. Útil pra "já passou da hora?". */
export function minutosDoDia(fuso: string = FUSO_PADRAO, agora: Date = new Date()): number {
  const { hora, minuto } = partesNoFuso(agora, fuso);
  return hora * 60 + minuto;
}

/** Converte "HH:mm" em minutos desde a meia-noite. Devolve null se o formato não bater. */
export function horaParaMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const casa = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!casa) return null;

  const h = Number(casa[1]);
  const m = Number(casa[2]);
  if (h > 23 || m > 59) return null;

  return h * 60 + m;
}

/** Dia da semana (0 = domingo … 6 = sábado) de uma data `@db.Date`. */
export function diaDaSemana(data: Date): number {
  return data.getUTCDay();
}

/** Dia do mês (1-31) de uma data `@db.Date`. */
export function diaDoMes(data: Date): number {
  return data.getUTCDate();
}

/** Ex.: "segunda-feira, 04 de agosto". */
export function dataPorExtenso(data: Date, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: fuso,
  }).format(data);
}

export const NOMES_DIAS_SEMANA = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;
