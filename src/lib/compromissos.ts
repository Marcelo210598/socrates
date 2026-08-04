import { prisma } from "@/lib/prisma";
import { StatusCompromisso } from "@prisma/client";

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
