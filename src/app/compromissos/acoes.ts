"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Importancia, OrigemEntrada, StatusCompromisso } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { criarCompromissoConfirmado } from "@/lib/compromissos";

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const esquemaConfirmar = z.object({
  titulo: z.string().trim().min(1, "Dá um título pro compromisso.").max(120),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.")
    .nullable(),
  local: z.string().trim().max(120).nullable().optional(),
  importancia: z.enum([Importancia.BAIXA, Importancia.MEDIA, Importancia.ALTA]).optional(),
  origem: z.enum([
    OrigemEntrada.TELEGRAM_TEXTO,
    OrigemEntrada.TELEGRAM_AUDIO,
    OrigemEntrada.WEB,
  ]),
  textoOriginal: z.string().nullable().optional(),
  transcricao: z.string().nullable().optional(),
  confiancaIa: z.number().nullable().optional(),
});

export type ConfirmarCompromissoInput = z.input<typeof esquemaConfirmar>;

/** Persiste o compromisso já revisado/confirmado por você. */
export async function confirmarCompromissoAction(
  entrada: ConfirmarCompromissoInput,
): Promise<ResultadoAcao> {
  const analise = esquemaConfirmar.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = analise.data;

  try {
    const usuario = await obterUsuarioAtual();

    await criarCompromissoConfirmado({
      userId: usuario.id,
      titulo: dados.titulo,
      data: dados.data,
      hora: dados.hora,
      local: dados.local,
      importancia: dados.importancia,
      origem: dados.origem,
      textoOriginal: dados.textoOriginal,
      transcricao: dados.transcricao,
      confiancaIa: dados.confiancaIa,
    });

    revalidatePath("/compromissos");
    revalidatePath("/");
    return { ok: true };
  } catch (erro) {
    console.error("[compromissos] confirmarCompromissoAction", erro);
    return { ok: false, erro: "Não consegui salvar o compromisso." };
  }
}

export async function concluirCompromissoAction(id: string): Promise<ResultadoAcao> {
  try {
    const usuario = await obterUsuarioAtual();
    const alterados = await prisma.compromisso.updateMany({
      where: { id, userId: usuario.id },
      data: { status: StatusCompromisso.CONCLUIDO, concluidoEm: new Date() },
    });
    if (alterados.count === 0) return { ok: false, erro: "Compromisso não encontrado." };

    revalidatePath("/compromissos");
    revalidatePath("/");
    return { ok: true };
  } catch (erro) {
    console.error("[compromissos] concluirCompromissoAction", erro);
    return { ok: false, erro: "Não consegui marcar como concluído." };
  }
}

export async function cancelarCompromissoAction(id: string): Promise<ResultadoAcao> {
  try {
    const usuario = await obterUsuarioAtual();
    const alterados = await prisma.compromisso.updateMany({
      where: { id, userId: usuario.id },
      data: { status: StatusCompromisso.CANCELADO },
    });
    if (alterados.count === 0) return { ok: false, erro: "Compromisso não encontrado." };

    revalidatePath("/compromissos");
    revalidatePath("/");
    return { ok: true };
  } catch (erro) {
    console.error("[compromissos] cancelarCompromissoAction", erro);
    return { ok: false, erro: "Não consegui cancelar." };
  }
}
