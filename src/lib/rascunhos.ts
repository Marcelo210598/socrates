import { TipoRascunho } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExtracaoPendencia } from "@/lib/ia/pendencia";

/**
 * Rascunho = o que a IA extraiu, esperando seu ✅ no Telegram. Guardamos o
 * `dados` como JSON porque o formato depende do tipo (tarefa vs compromisso);
 * estes tipos garantem que quem lê de volta sabe o que esperar.
 */

export type DadosRascunhoTarefa = Extract<ExtracaoPendencia, { tipo: "tarefa" }>;
export type DadosRascunhoCompromisso = Extract<ExtracaoPendencia, { tipo: "compromisso" }>;

/** Cria o rascunho a partir da extração da IA (já não-ambígua). */
export async function criarRascunho(userId: string, extracao: ExtracaoPendencia) {
  return prisma.rascunho.create({
    data: {
      userId,
      tipo: extracao.tipo === "tarefa" ? TipoRascunho.TAREFA : TipoRascunho.COMPROMISSO,
      dados: extracao as unknown as object,
    },
  });
}

export async function buscarRascunho(userId: string, id: string) {
  const rascunho = await prisma.rascunho.findFirst({ where: { id, userId } });
  if (!rascunho) return null;

  if (rascunho.tipo === TipoRascunho.TAREFA) {
    return { id: rascunho.id, tipo: "tarefa" as const, dados: rascunho.dados as unknown as DadosRascunhoTarefa };
  }
  return {
    id: rascunho.id,
    tipo: "compromisso" as const,
    dados: rascunho.dados as unknown as DadosRascunhoCompromisso,
  };
}

export async function apagarRascunho(userId: string, id: string): Promise<void> {
  await prisma.rascunho.deleteMany({ where: { id, userId } });
}

/** Rascunhos morrem sozinhos depois de um tempo — evita lixo se você nunca responder o card. */
export async function limparRascunhosAntigos(horasLimite = 24): Promise<number> {
  const limite = new Date(Date.now() - horasLimite * 60 * 60 * 1000);
  const resultado = await prisma.rascunho.deleteMany({ where: { criadoEm: { lt: limite } } });
  return resultado.count;
}
