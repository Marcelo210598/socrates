"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Recorrencia } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { definirFeita } from "@/lib/tarefas";
import { hojeNoFuso } from "@/lib/datas";

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

/** Marca ou desmarca o check de hoje. */
export async function alternarFeita(tarefaId: string, feita: boolean): Promise<ResultadoAcao> {
  try {
    const usuario = await obterUsuarioAtual();

    await definirFeita({
      userId: usuario.id,
      tarefaId,
      data: hojeNoFuso(usuario.timezone),
      feita,
    });

    revalidatePath("/tarefas");
    return { ok: true };
  } catch (erro) {
    console.error("[tarefas] alternarFeita", erro);
    return { ok: false, erro: "Não consegui salvar. Tenta de novo." };
  }
}

const esquemaNovaTarefa = z
  .object({
    titulo: z.string().trim().min(1, "Dá um nome pra tarefa.").max(120, "Título muito longo."),
    recorrencia: z.enum([Recorrencia.DIARIA, Recorrencia.DIAS_SEMANA, Recorrencia.MENSAL]),
    diasSemana: z.array(z.number().int().min(0).max(6)).default([]),
    diaDoMes: z.number().int().min(1).max(31).nullable().default(null),
    horaAlvo: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.")
      .nullable()
      .default(null),
  })
  .refine((d) => d.recorrencia !== Recorrencia.DIAS_SEMANA || d.diasSemana.length > 0, {
    message: "Escolhe pelo menos um dia da semana.",
    path: ["diasSemana"],
  })
  .refine((d) => d.recorrencia !== Recorrencia.MENSAL || d.diaDoMes !== null, {
    message: "Escolhe o dia do mês.",
    path: ["diaDoMes"],
  });

export type NovaTarefa = z.input<typeof esquemaNovaTarefa>;

export async function criarTarefa(entrada: NovaTarefa): Promise<ResultadoAcao> {
  const analise = esquemaNovaTarefa.safeParse(entrada);

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = analise.data;

  try {
    const usuario = await obterUsuarioAtual();

    // Nova tarefa entra no fim da lista.
    const agregado = await prisma.tarefa.aggregate({
      where: { userId: usuario.id },
      _max: { ordem: true },
    });

    await prisma.tarefa.create({
      data: {
        userId: usuario.id,
        titulo: dados.titulo,
        recorrencia: dados.recorrencia,
        diasSemana: dados.recorrencia === Recorrencia.DIAS_SEMANA ? dados.diasSemana : [],
        diaDoMes: dados.recorrencia === Recorrencia.MENSAL ? dados.diaDoMes : null,
        horaAlvo: dados.horaAlvo,
        ordem: (agregado._max.ordem ?? 0) + 1,
      },
    });

    revalidatePath("/tarefas");
    return { ok: true };
  } catch (erro) {
    console.error("[tarefas] criarTarefa", erro);
    return { ok: false, erro: "Não consegui criar a tarefa." };
  }
}

/**
 * Arquiva a tarefa (ativa = false) em vez de apagar.
 * O histórico de execuções continua valendo pros relatórios.
 */
export async function arquivarTarefa(tarefaId: string): Promise<ResultadoAcao> {
  try {
    const usuario = await obterUsuarioAtual();

    const alterados = await prisma.tarefa.updateMany({
      where: { id: tarefaId, userId: usuario.id },
      data: { ativa: false },
    });

    if (alterados.count === 0) return { ok: false, erro: "Tarefa não encontrada." };

    revalidatePath("/tarefas");
    return { ok: true };
  } catch (erro) {
    console.error("[tarefas] arquivarTarefa", erro);
    return { ok: false, erro: "Não consegui arquivar." };
  }
}
