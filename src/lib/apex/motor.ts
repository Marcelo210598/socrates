/**
 * Motor de cálculo das contas Apex.
 *
 * Funções PURAS de propósito: recebem números, devolvem números. Nada de banco
 * aqui dentro. Isso deixa a regra fácil de testar e impede que valor de regra
 * vaze pro meio do código — todos os parâmetros chegam da tabela `RegraApex`.
 */

export type RegraApexCalculo = {
  saldoInicial: number;
  diasQualificadosMin: number;
  lucroMinDia: number;
  drawdownLimite: number;
  safetyNet: number;
  saldoMinSaque: number;
  saqueMinimo: number;
  maxSaques: number;
  /** Ex.: 50 = nenhum dia pode ser >= 50% do lucro total. */
  consistenciaPct: number;
};

export type PregaoCalculo = {
  data: Date;
  resultado: number;
};

export type Condicao = {
  chave: string;
  rotulo: string;
  atendida: boolean;
  detalhe: string;
};

export type DiagnosticoConta = {
  saldoAtual: number;
  lucroTotal: number;

  /** Maior saldo já alcançado — é o que puxa o drawdown pra cima. */
  picoSaldo: number;
  /** Saldo em que a conta é violada. Sobe junto com o pico, até congelar. */
  nivelViolacao: number;
  /** Quanto dá pra perder hoje antes de estourar. */
  folgaDrawdown: number;
  /** true quando o trailing drawdown já congelou (não sobe mais). */
  drawdownCongelado: boolean;

  diasQualificados: number;
  diasQualificadosFaltando: number;

  /** Quanto falta de saldo pra poder solicitar saque. 0 = já dá. */
  faltaParaSaque: number;
  /** Quanto dá pra sacar hoje (saldo acima do Safety Net). */
  valorSacavelHoje: number;

  /** Quanto precisa fazer por dia pra chegar lá. */
  metaDiariaSugerida: number;

  consistencia: {
    /** Maior lucro num único dia desde o último saque aprovado. */
    maiorDia: number;
    /** Quanto esse dia representa do lucro total, em %. */
    pctMaiorDia: number;
    limitePct: number;
    ok: boolean;
    /** Lucro total mínimo pra esse dia grande virar aceitável. */
    lucroTotalNecessario: number;
    /** Teto de lucro pra um dia novo sem quebrar a regra. */
    tetoDiaHoje: number;
  };

  liberadaParaSaque: boolean;
  condicoes: Condicao[];
};

/** Arredonda pra centavos, evitando lixo de ponto flutuante (0.1+0.2). */
const c = (n: number) => Math.round(n * 100) / 100;

/**
 * O trailing drawdown da Apex sobe junto com o pico do saldo, mas CONGELA
 * quando chega em `saldoInicial + 100`. É por isso que existe o Safety Net:
 * é o saldo a partir do qual o risco de violar por drawdown some.
 */
const TRAVA_TRAILING = 100;

export function calcularConta(params: {
  regra: RegraApexCalculo;
  pregoes: PregaoCalculo[];
  /** Data do último saque APROVADO. Consistência e contagem de dias resetam aqui. */
  ultimoSaqueAprovadoEm?: Date | null;
  saquesJaFeitos?: number;
}): DiagnosticoConta {
  const { regra, saquesJaFeitos = 0 } = params;
  const corte = params.ultimoSaqueAprovadoEm ?? null;

  // Ordena por data — a série do drawdown depende da ordem cronológica.
  const pregoes = [...params.pregoes].sort((a, b) => a.data.getTime() - b.data.getTime());

  // --- Saldo e trailing drawdown, varrendo a série toda ---
  let saldo = regra.saldoInicial;
  let pico = regra.saldoInicial;

  for (const p of pregoes) {
    saldo += p.resultado;
    if (saldo > pico) pico = saldo;
  }

  const tetoTrailing = regra.saldoInicial + TRAVA_TRAILING;
  const nivelViolacaoBruto = pico - regra.drawdownLimite;
  const drawdownCongelado = nivelViolacaoBruto >= tetoTrailing;
  const nivelViolacao = Math.min(nivelViolacaoBruto, tetoTrailing);

  // --- Janela do ciclo atual (desde o último saque aprovado) ---
  const doCiclo = corte ? pregoes.filter((p) => p.data > corte) : pregoes;

  const diasQualificados = doCiclo.filter((p) => p.resultado >= regra.lucroMinDia).length;
  const lucroCiclo = doCiclo.reduce((acc, p) => acc + p.resultado, 0);

  // --- Regra de consistência ---
  const diasPositivos = doCiclo.filter((p) => p.resultado > 0);
  const maiorDia = diasPositivos.length ? Math.max(...diasPositivos.map((p) => p.resultado)) : 0;
  const limitePct = regra.consistenciaPct;
  const pctMaiorDia = lucroCiclo > 0 ? (maiorDia / lucroCiclo) * 100 : 0;
  // A regra só morde quando existe lucro; conta no zero/negativo não viola consistência.
  const consistenciaOk = lucroCiclo <= 0 || pctMaiorDia < limitePct;
  // Pra um dia de X pontos virar o novo maior dia sem quebrar a regra:
  //   X < pct*(total + X)  →  X < pct*total / (1 - pct)
  const fracao = limitePct / 100;
  const tetoDiaHoje =
    fracao >= 1 ? Number.POSITIVE_INFINITY : c((fracao * Math.max(lucroCiclo, 0)) / (1 - fracao));
  const lucroTotalNecessario = maiorDia > 0 ? c(maiorDia / fracao) : 0;

  // --- Distâncias ---
  const faltaParaSaque = Math.max(0, c(regra.saldoMinSaque - saldo));
  const valorSacavelHoje = Math.max(0, c(saldo - regra.safetyNet));
  const diasQualificadosFaltando = Math.max(0, regra.diasQualificadosMin - diasQualificados);

  // --- Meta diária sugerida ---
  // Divide o que falta pelos dias que ainda precisam ser qualificados, nunca
  // pedindo menos que o lucro mínimo do dia nem mais que o teto da consistência.
  const diasParaDividir = Math.max(diasQualificadosFaltando, 1);
  const metaBruta = Math.max(faltaParaSaque / diasParaDividir, regra.lucroMinDia);
  const metaDiariaSugerida =
    faltaParaSaque === 0 && diasQualificadosFaltando === 0
      ? 0
      : c(tetoDiaHoje > regra.lucroMinDia ? Math.min(metaBruta, tetoDiaHoje) : metaBruta);

  // --- As condições pro saque, uma a uma ---
  const condicoes: Condicao[] = [
    {
      chave: "saldo",
      rotulo: `Saldo mínimo (${brl(regra.saldoMinSaque)})`,
      atendida: saldo >= regra.saldoMinSaque,
      detalhe:
        saldo >= regra.saldoMinSaque
          ? `Saldo ${brl(saldo)} — ok`
          : `Faltam ${brl(faltaParaSaque)}`,
    },
    {
      chave: "dias",
      rotulo: `${regra.diasQualificadosMin} dias qualificados`,
      atendida: diasQualificados >= regra.diasQualificadosMin,
      detalhe: `${diasQualificados}/${regra.diasQualificadosMin} (dia conta com lucro ≥ ${brl(regra.lucroMinDia)})`,
    },
    {
      chave: "consistencia",
      rotulo: `Consistência (nenhum dia ≥ ${limitePct}%)`,
      atendida: consistenciaOk,
      detalhe: consistenciaOk
        ? lucroCiclo > 0
          ? `Maior dia = ${pctMaiorDia.toFixed(1)}% do lucro`
          : "Sem lucro no ciclo ainda"
        : `Maior dia (${brl(maiorDia)}) = ${pctMaiorDia.toFixed(1)}%. Precisa de ${brl(lucroTotalNecessario)} de lucro total`,
    },
    {
      chave: "saque_minimo",
      rotulo: `Valor sacável ≥ ${brl(regra.saqueMinimo)}`,
      atendida: valorSacavelHoje >= regra.saqueMinimo,
      detalhe: `Acima do Safety Net: ${brl(valorSacavelHoje)}`,
    },
    {
      chave: "saques_restantes",
      rotulo: `Saques disponíveis (máx ${regra.maxSaques})`,
      atendida: saquesJaFeitos < regra.maxSaques,
      detalhe: `${saquesJaFeitos}/${regra.maxSaques} usados`,
    },
  ];

  return {
    saldoAtual: c(saldo),
    lucroTotal: c(lucroCiclo),
    picoSaldo: c(pico),
    nivelViolacao: c(nivelViolacao),
    folgaDrawdown: c(saldo - nivelViolacao),
    drawdownCongelado,
    diasQualificados,
    diasQualificadosFaltando,
    faltaParaSaque,
    valorSacavelHoje,
    metaDiariaSugerida,
    consistencia: {
      maiorDia: c(maiorDia),
      pctMaiorDia: c(pctMaiorDia),
      limitePct,
      ok: consistenciaOk,
      lucroTotalNecessario,
      tetoDiaHoje,
    },
    liberadaParaSaque: condicoes.every((cond) => cond.atendida),
    condicoes,
  };
}

/**
 * Checagem de sanidade da própria regra cadastrada.
 *
 * Pela mecânica da Apex, o Safety Net deveria ser
 * `saldoInicial + drawdownLimite + 100`. Se a linha do banco não fecha essa
 * conta, algum número foi digitado errado — melhor gritar do que calcular
 * meta diária em cima de parâmetro furado.
 */
export function conferirRegra(regra: RegraApexCalculo): string[] {
  const avisos: string[] = [];
  const esperado = regra.saldoInicial + regra.drawdownLimite + TRAVA_TRAILING;

  if (Math.abs(esperado - regra.safetyNet) > 0.01) {
    avisos.push(
      `Safety Net cadastrado (${brl(regra.safetyNet)}) não bate com saldoInicial + drawdown + 100 (${brl(esperado)}). ` +
        `Ou o drawdown deveria ser ${brl(regra.safetyNet - regra.saldoInicial - TRAVA_TRAILING)}, ou o Safety Net está errado.`,
    );
  }

  if (regra.saldoMinSaque < regra.safetyNet + regra.saqueMinimo) {
    avisos.push(
      `Saldo mínimo pra saque (${brl(regra.saldoMinSaque)}) é menor que Safety Net + saque mínimo (${brl(regra.safetyNet + regra.saqueMinimo)}).`,
    );
  }

  return avisos;
}

export function brl(valor: number): string {
  return valor.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
