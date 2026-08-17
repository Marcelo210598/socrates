import { prisma } from "@/lib/prisma";
import { Importancia, OrigemEntrada, StatusCompromisso, type Compromisso } from "@prisma/client";
import { dataParaInput, hojeNoFuso, horaLocalParaUtc } from "@/lib/datas";

/**
 * Cria o compromisso já confirmado. Reaproveitado pelo formulário web
 * (`confirmarCompromissoAction`) e pelo bot do Telegram — única fonte de
 * verdade pra resolver "sem hora marcada" (usa o horário de fechamento do
 * dia só pra ordenar/lembrar; a UI não deve exibir isso como hora real).
 */
export async function criarCompromissoConfirmado(params: {
  userId: string;
  titulo: string;
  data: string; // "YYYY-MM-DD"
  hora: string | null;
  local?: string | null;
  /** Não informado (undefined/null) = MEDIA, o padrão do schema. */
  importancia?: Importancia | null;
  origem: OrigemEntrada;
  textoOriginal?: string | null;
  transcricao?: string | null;
  confiancaIa?: number | null;
}): Promise<Compromisso> {
  const { userId, titulo, data, hora, local, importancia, origem, textoOriginal, transcricao, confiancaIa } =
    params;

  const usuario = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { preferencia: true },
  });

  const horaDefinida = Boolean(hora);
  const horaEfetiva = hora ?? usuario.preferencia?.horaFechamentoDia ?? "22:00";
  const quando = horaLocalParaUtc(data, horaEfetiva, usuario.timezone);

  return prisma.compromisso.create({
    data: {
      userId,
      titulo,
      quando,
      horaDefinida,
      local: local || null,
      importancia: importancia ?? Importancia.MEDIA,
      status: StatusCompromisso.CONFIRMADO,
      origem,
      textoOriginal: textoOriginal || null,
      transcricao: transcricao || null,
      confiancaIa: confiancaIa ?? null,
    },
  });
}

/** Reagenda (nova data/hora) — usado pelo botão "📅 Reagendar" do Telegram. */
export async function reagendarCompromisso(params: {
  userId: string;
  compromissoId: string;
  data: string;
  hora: string | null;
}): Promise<void> {
  const { userId, compromissoId, data, hora } = params;

  const usuario = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { preferencia: true },
  });

  const horaDefinida = Boolean(hora);
  const horaEfetiva = hora ?? usuario.preferencia?.horaFechamentoDia ?? "22:00";
  const quando = horaLocalParaUtc(data, horaEfetiva, usuario.timezone);

  const alterados = await prisma.compromisso.updateMany({
    where: { id: compromissoId, userId },
    data: { quando, horaDefinida, status: StatusCompromisso.CONFIRMADO, alertaEnviadoEm: null },
  });

  if (alterados.count === 0) throw new Error("Compromisso não encontrado");
}

/**
 * Compromissos vencidos, ainda confirmados (não concluídos/cancelados), cujo
 * lembrete está liberado pra repetir agora — mesmo esquema de `listarTarefasParaLembrete`.
 */
export async function listarCompromissosParaLembrete(params: {
  userId: string;
  agora: Date;
  intervaloMinutos?: number;
}) {
  const { userId, agora, intervaloMinutos = 10 } = params;
  const limite = new Date(agora.getTime() - intervaloMinutos * 60 * 1000);

  return prisma.compromisso.findMany({
    where: {
      userId,
      status: StatusCompromisso.CONFIRMADO,
      quando: { lte: agora },
      OR: [{ alertaEnviadoEm: null }, { alertaEnviadoEm: { lte: limite } }],
    },
    orderBy: { quando: "asc" },
  });
}

export async function registrarLembreteCompromisso(compromissoId: string): Promise<void> {
  await prisma.compromisso.update({ where: { id: compromissoId }, data: { alertaEnviadoEm: new Date() } });
}

/** Compromissos de hoje (fuso do usuário), mais cedo primeiro — usado no `/hoje` do bot. */
export async function listarCompromissosDoDia(userId: string, fuso: string, agora: Date = new Date()) {
  const dataStr = dataParaInput(hojeNoFuso(fuso, agora));
  const inicio = horaLocalParaUtc(dataStr, "00:00", fuso);
  const fim = horaLocalParaUtc(dataStr, "23:59", fuso);

  return prisma.compromisso.findMany({
    where: { userId, status: StatusCompromisso.CONFIRMADO, quando: { gte: inicio, lte: fim } },
    orderBy: { quando: "asc" },
  });
}

/** Próximos compromissos confirmados, mais cedo primeiro. */
export async function listarProximosCompromissos(userId: string, agora: Date = new Date()) {
  return prisma.compromisso.findMany({
    where: {
      userId,
      status: StatusCompromisso.CONFIRMADO,
      quando: { gte: agora },
    },
    orderBy: { quando: "asc" },
  });
}

/** Compromissos concluídos ou cancelados, mais recentes primeiro — histórico curto. */
export async function listarHistoricoCompromissos(userId: string, limite = 10) {
  return prisma.compromisso.findMany({
    where: {
      userId,
      status: { in: [StatusCompromisso.CONCLUIDO, StatusCompromisso.CANCELADO] },
    },
    orderBy: { quando: "desc" },
    take: limite,
  });
}
