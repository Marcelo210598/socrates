"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TamanhoConta, TipoDrawdown } from "@prisma/client";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { criarConta, lancarPregao, registrarSaque } from "@/lib/apex/contas";
import { diaDoInputParaData, hojeNoFuso } from "@/lib/datas";
import { ROTULO_TAMANHO, ROTULO_TIPO } from "@/lib/apex/rotulos";

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const esquemaNovaConta = z.object({
  apelido: z.string().trim().max(60).optional(),
  tamanho: z.enum([TamanhoConta.T25K, TamanhoConta.T50K, TamanhoConta.T100K, TamanhoConta.T150K]),
  tipo: z.enum([TipoDrawdown.EOD, TipoDrawdown.INTRADAY]),
  iniciadaEm: z.string(), // "YYYY-MM-DD"
  ehMestre: z.boolean().default(false),
  contaMestreId: z.string().nullable().default(null),
});

export type NovaContaInput = z.input<typeof esquemaNovaConta>;

export async function criarContaAction(entrada: NovaContaInput): Promise<ResultadoAcao> {
  const analise = esquemaNovaConta.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = analise.data;

  const iniciadaEm = diaDoInputParaData(dados.iniciadaEm);
  if (!iniciadaEm) return { ok: false, erro: "Data inválida." };

  // Réplica não pode ser sua própria mestre, e mestre não indica outra mestre.
  if (dados.ehMestre && dados.contaMestreId) {
    return { ok: false, erro: "Uma conta mestre não pode ter outra conta mestre." };
  }

  try {
    const usuario = await obterUsuarioAtual();

    const apelido =
      dados.apelido && dados.apelido.length > 0
        ? dados.apelido
        : `${ROTULO_TAMANHO[dados.tamanho]} ${ROTULO_TIPO[dados.tipo]}`;

    await criarConta({
      userId: usuario.id,
      apelido,
      tamanho: dados.tamanho,
      tipo: dados.tipo,
      iniciadaEm,
      ehMestre: dados.ehMestre,
      contaMestreId: dados.contaMestreId,
    });

    revalidatePath("/apex");
    return { ok: true };
  } catch (erro) {
    console.error("[apex] criarContaAction", erro);
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não consegui criar a conta.",
    };
  }
}

const esquemaPregao = z.object({
  contaId: z.string().min(1),
  data: z.string().optional(), // "YYYY-MM-DD"; vazio = hoje
  resultado: z
    .number("Informa o resultado do dia.")
    .refine((n) => Number.isFinite(n), "Resultado inválido.")
    .refine((n) => Math.abs(n) < 1_000_000, "Valor grande demais — confere o número."),
  notas: z.string().trim().max(300).optional(),
});

export type LancarPregaoInput = z.input<typeof esquemaPregao>;

export async function lancarPregaoAction(entrada: LancarPregaoInput): Promise<ResultadoAcao> {
  const analise = esquemaPregao.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = analise.data;

  try {
    const usuario = await obterUsuarioAtual();
    const data = dados.data ? diaDoInputParaData(dados.data) : hojeNoFuso(usuario.timezone);
    if (!data) return { ok: false, erro: "Data inválida." };

    await lancarPregao({
      userId: usuario.id,
      contaId: dados.contaId,
      data,
      resultado: dados.resultado,
      notas: dados.notas || null,
    });

    revalidatePath("/apex");
    revalidatePath(`/apex/${dados.contaId}`);
    return { ok: true };
  } catch (erro) {
    console.error("[apex] lancarPregaoAction", erro);
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não consegui salvar o pregão.",
    };
  }
}

export async function registrarSaqueAction(contaId: string): Promise<ResultadoAcao> {
  try {
    const usuario = await obterUsuarioAtual();
    await registrarSaque({ userId: usuario.id, contaId });

    revalidatePath("/apex");
    revalidatePath(`/apex/${contaId}`);
    return { ok: true };
  } catch (erro) {
    console.error("[apex] registrarSaqueAction", erro);
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não consegui registrar o saque.",
    };
  }
}
