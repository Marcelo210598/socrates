import { StatusConta, type TamanhoConta, type TipoDrawdown } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calcularConta,
  type DiagnosticoConta,
  type RegraApexCalculo,
} from "@/lib/apex/motor";

/**
 * Camada de dados do Módulo 5. Aqui é onde o banco encontra o motor de
 * cálculo puro (`motor.ts`) — converte Decimal→number, monta o histórico de
 * pregões e devolve o diagnóstico pronto pra tela.
 */

/** A regra vigente pra um tamanho×tipo numa data (hoje, por padrão). */
export async function regraVigente(
  tamanho: TamanhoConta,
  tipo: TipoDrawdown,
  data: Date = new Date(),
) {
  return prisma.regraApex.findFirst({
    where: {
      tamanho,
      tipo,
      vigenteDe: { lte: data },
      OR: [{ vigenteAte: null }, { vigenteAte: { gte: data } }],
    },
    orderBy: { vigenteDe: "desc" },
  });
}

function paraCalculo(regra: {
  saldoInicial: { toNumber(): number };
  diasQualificadosMin: number;
  lucroMinDia: { toNumber(): number };
  drawdownLimite: { toNumber(): number };
  safetyNet: { toNumber(): number };
  saldoMinSaque: { toNumber(): number };
  saqueMinimo: { toNumber(): number };
  maxSaques: number;
  consistenciaPct: { toNumber(): number };
}): RegraApexCalculo {
  return {
    saldoInicial: regra.saldoInicial.toNumber(),
    diasQualificadosMin: regra.diasQualificadosMin,
    lucroMinDia: regra.lucroMinDia.toNumber(),
    drawdownLimite: regra.drawdownLimite.toNumber(),
    safetyNet: regra.safetyNet.toNumber(),
    saldoMinSaque: regra.saldoMinSaque.toNumber(),
    saqueMinimo: regra.saqueMinimo.toNumber(),
    maxSaques: regra.maxSaques,
    consistenciaPct: regra.consistenciaPct.toNumber(),
  };
}

const INCLUDE_CONTA = {
  regra: true,
  pregoes: { orderBy: { data: "asc" as const } },
  saques: { orderBy: { numero: "asc" as const } },
};

type ContaComRelacoes = NonNullable<
  Awaited<ReturnType<typeof prisma.contaApex.findFirst<{ include: typeof INCLUDE_CONTA }>>>
>;

export type ContaComDiagnostico = {
  conta: ContaComRelacoes;
  diagnostico: DiagnosticoConta;
};

function montarDiagnostico(conta: ContaComRelacoes): DiagnosticoConta {
  const ultimoSaqueAprovado = conta.saques
    .filter((s) => s.status === "APROVADO" || s.status === "PAGO")
    .sort((a, b) => (b.aprovadoEm?.getTime() ?? 0) - (a.aprovadoEm?.getTime() ?? 0))[0];

  return calcularConta({
    regra: paraCalculo(conta.regra),
    pregoes: conta.pregoes.map((p) => ({ data: p.data, resultado: p.resultado.toNumber() })),
    ultimoSaqueAprovadoEm: ultimoSaqueAprovado?.aprovadoEm ?? null,
    saquesJaFeitos: conta.saques.filter((s) => s.status !== "NEGADO").length,
  });
}

/** Todas as contas do usuário, com diagnóstico calculado. */
export async function listarContasComDiagnostico(userId: string): Promise<ContaComDiagnostico[]> {
  const contas = await prisma.contaApex.findMany({
    where: { userId },
    include: INCLUDE_CONTA,
    orderBy: { criadaEm: "asc" },
  });

  return contas.map((conta) => ({ conta, diagnostico: montarDiagnostico(conta) }));
}

/** Uma conta específica (confere que é do usuário), com diagnóstico. */
export async function obterContaComDiagnostico(
  userId: string,
  contaId: string,
): Promise<ContaComDiagnostico | null> {
  const conta = await prisma.contaApex.findFirst({
    where: { id: contaId, userId },
    include: INCLUDE_CONTA,
  });

  if (!conta) return null;
  return { conta, diagnostico: montarDiagnostico(conta) };
}

/** Deriva o status "de prateleira" a partir do diagnóstico calculado. */
function statusDerivado(atual: StatusConta, diagnostico: DiagnosticoConta): StatusConta {
  // Status manuais (pausada/encerrada) não são sobrescritos automaticamente.
  if (atual === StatusConta.PAUSADA || atual === StatusConta.ENCERRADA) return atual;
  if (diagnostico.saldoAtual <= diagnostico.nivelViolacao) return StatusConta.VIOLADA;
  if (diagnostico.liberadaParaSaque) return StatusConta.LIBERADA_SAQUE;
  return StatusConta.ATIVA;
}

/**
 * Recalcula o diagnóstico de uma conta e grava o "cache" (saldoAtual/status
 * em ContaApex, saldoApos/qualificado em cada PregaoApex). Chamada depois de
 * qualquer escrita em pregão ou saque — refazer os snapshots do zero é mais
 * simples e mais seguro do que tentar corrigir só o que mudou.
 */
async function sincronizarCache(contaId: string): Promise<ContaComDiagnostico> {
  const conta = await prisma.contaApex.findFirstOrThrow({
    where: { id: contaId },
    include: INCLUDE_CONTA,
  });

  const diagnostico = montarDiagnostico(conta);
  const status = statusDerivado(conta.status, diagnostico);

  let saldoCorrido = conta.saldoInicial.toNumber();
  const atualizacoesPregoes = conta.pregoes.map((p) => {
    saldoCorrido += p.resultado.toNumber();
    return prisma.pregaoApex.update({
      where: { id: p.id },
      data: {
        saldoApos: saldoCorrido,
        qualificado: p.resultado.toNumber() >= paraCalculo(conta.regra).lucroMinDia,
      },
    });
  });

  await prisma.$transaction([
    prisma.contaApex.update({
      where: { id: contaId },
      data: { saldoAtual: diagnostico.saldoAtual, status },
    }),
    ...atualizacoesPregoes,
  ]);

  return obterContaComDiagnostico(conta.userId, contaId) as Promise<ContaComDiagnostico>;
}

export type CriarContaInput = {
  userId: string;
  apelido: string;
  tamanho: TamanhoConta;
  tipo: TipoDrawdown;
  iniciadaEm: Date;
  ehMestre: boolean;
  contaMestreId: string | null;
};

export async function criarConta(input: CriarContaInput) {
  const regra = await regraVigente(input.tamanho, input.tipo, input.iniciadaEm);
  if (!regra) {
    throw new Error(
      `Não achei regra vigente pra ${input.tamanho}/${input.tipo} em ${input.iniciadaEm.toISOString()}.`,
    );
  }

  return prisma.contaApex.create({
    data: {
      userId: input.userId,
      apelido: input.apelido,
      tamanho: input.tamanho,
      tipo: input.tipo,
      regraId: regra.id,
      saldoInicial: regra.saldoInicial,
      saldoAtual: regra.saldoInicial,
      iniciadaEm: input.iniciadaEm,
      ehMestre: input.ehMestre,
      contaMestreId: input.contaMestreId,
    },
  });
}

export type LancarPregaoInput = {
  userId: string;
  contaId: string;
  data: Date;
  resultado: number;
  notas: string | null;
};

/** Lança (ou corrige, se já existir) o resultado do dia numa conta. */
export async function lancarPregao(input: LancarPregaoInput): Promise<ContaComDiagnostico> {
  const conta = await prisma.contaApex.findFirst({
    where: { id: input.contaId, userId: input.userId },
    select: { id: true, saldoInicial: true },
  });
  if (!conta) throw new Error("Conta não encontrada.");

  await prisma.pregaoApex.upsert({
    where: { contaId_data: { contaId: input.contaId, data: input.data } },
    update: { resultado: input.resultado, notas: input.notas },
    create: {
      userId: input.userId,
      contaId: input.contaId,
      data: input.data,
      resultado: input.resultado,
      notas: input.notas,
      // Placeholder — sincronizarCache recalcula o snapshot certo logo abaixo.
      saldoApos: conta.saldoInicial.toNumber() + input.resultado,
    },
  });

  return sincronizarCache(input.contaId);
}

export async function registrarSaque(params: {
  userId: string;
  contaId: string;
}): Promise<ContaComDiagnostico> {
  const item = await obterContaComDiagnostico(params.userId, params.contaId);
  if (!item) throw new Error("Conta não encontrada.");
  if (!item.diagnostico.liberadaParaSaque) {
    throw new Error("Essa conta ainda não bateu as condições pra saque.");
  }

  const proximoNumero = item.conta.saques.length + 1;

  await prisma.saqueApex.create({
    data: {
      userId: params.userId,
      contaId: params.contaId,
      numero: proximoNumero,
      valor: item.diagnostico.valorSacavelHoje,
      status: "SOLICITADO",
    },
  });

  return sincronizarCache(params.contaId);
}

/** Contas que já existem e podem servir de mestre pro replicador. */
export async function listarPossiveisMestres(userId: string) {
  return prisma.contaApex.findMany({
    where: { userId, ehMestre: true, status: { notIn: [StatusConta.ENCERRADA] } },
    select: { id: true, apelido: true },
    orderBy: { criadaEm: "asc" },
  });
}
