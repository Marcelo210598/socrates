/**
 * Seed do Sócrates.
 *
 * Roda com: npm run db:seed
 * É idempotente (pode rodar quantas vezes quiser, não duplica nada).
 */
import { PrismaClient, TamanhoConta, TipoDrawdown, CategoriaFrase } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Regras da Apex 4.0 — vigentes desde 01/03/2026.
 *
 * Fonte: tabela informada pelo Marcelo + help center da Apex.
 * Estes valores NÃO ficam no código de negócio: vivem no banco, nesta tabela.
 * Se a Apex mudar a regra, insira uma linha nova com `vigenteDe` novo — não edite
 * a linha antiga, porque contas já abertas continuam sob a regra em que nasceram.
 */
const VIGENTE_DE = new Date("2026-03-01T00:00:00Z");
const FONTE = "Tabela Apex 4.0 informada pelo usuário (03/08/2026) — conferir no help center";

type LinhaRegra = {
  tamanho: TamanhoConta;
  saldoInicial: number;
  diasQualificadosMin: number;
  lucroMinDiaEod: number;
  lucroMinDiaIntraday: number;
  drawdownLimite: number;
  safetyNet: number;
  saldoMinSaque: number;
};

const REGRAS: LinhaRegra[] = [
  {
    tamanho: TamanhoConta.T25K,
    saldoInicial: 25_000,
    diasQualificadosMin: 5,
    lucroMinDiaEod: 100,
    lucroMinDiaIntraday: 100,
    drawdownLimite: 2_000,
    safetyNet: 26_100,
    saldoMinSaque: 26_600,
  },
  {
    tamanho: TamanhoConta.T50K,
    saldoInicial: 50_000,
    diasQualificadosMin: 5,
    lucroMinDiaEod: 250,
    lucroMinDiaIntraday: 200,
    drawdownLimite: 2_500,
    safetyNet: 52_100,
    saldoMinSaque: 52_600,
  },
  {
    tamanho: TamanhoConta.T100K,
    saldoInicial: 100_000,
    diasQualificadosMin: 5,
    lucroMinDiaEod: 300,
    lucroMinDiaIntraday: 250,
    drawdownLimite: 3_000,
    safetyNet: 103_100,
    saldoMinSaque: 103_600,
  },
  {
    tamanho: TamanhoConta.T150K,
    saldoInicial: 150_000,
    diasQualificadosMin: 5,
    lucroMinDiaEod: 350,
    lucroMinDiaIntraday: 300,
    drawdownLimite: 4_000,
    safetyNet: 154_100,
    saldoMinSaque: 154_600,
  },
];

const CONSISTENCIA_PCT = 50; // contas compradas a partir de 01/03/2026 (as antigas eram 30%)
const SAQUE_MINIMO = 500;
const MAX_SAQUES = 6;

async function seedRegrasApex() {
  let criadas = 0;

  for (const linha of REGRAS) {
    for (const tipo of [TipoDrawdown.EOD, TipoDrawdown.INTRADAY]) {
      const lucroMinDia =
        tipo === TipoDrawdown.EOD ? linha.lucroMinDiaEod : linha.lucroMinDiaIntraday;

      await prisma.regraApex.upsert({
        where: {
          tamanho_tipo_vigenteDe: {
            tamanho: linha.tamanho,
            tipo,
            vigenteDe: VIGENTE_DE,
          },
        },
        update: {
          saldoInicial: linha.saldoInicial,
          diasQualificadosMin: linha.diasQualificadosMin,
          lucroMinDia,
          drawdownLimite: linha.drawdownLimite,
          safetyNet: linha.safetyNet,
          saldoMinSaque: linha.saldoMinSaque,
          saqueMinimo: SAQUE_MINIMO,
          maxSaques: MAX_SAQUES,
          consistenciaPct: CONSISTENCIA_PCT,
          fonte: FONTE,
        },
        create: {
          tamanho: linha.tamanho,
          tipo,
          saldoInicial: linha.saldoInicial,
          diasQualificadosMin: linha.diasQualificadosMin,
          lucroMinDia,
          drawdownLimite: linha.drawdownLimite,
          safetyNet: linha.safetyNet,
          saldoMinSaque: linha.saldoMinSaque,
          saqueMinimo: SAQUE_MINIMO,
          maxSaques: MAX_SAQUES,
          consistenciaPct: CONSISTENCIA_PCT,
          vigenteDe: VIGENTE_DE,
          fonte: FONTE,
        },
      });
      criadas++;
    }
  }

  console.log(`✅ Regras Apex: ${criadas} combinações (tamanho × tipo) no ar.`);
}

/**
 * Frases globais (userId = null): servem pra qualquer usuário do app.
 * O Módulo 3 mistura estas com frases geradas pela IA na hora.
 */
const FRASES: Array<{ texto: string; autor?: string; categoria: CategoriaFrase }> = [
  // --- Bíblicas ---
  {
    texto: "Tudo o que te vier à mão para fazer, faze-o conforme as tuas forças.",
    autor: "Eclesiastes 9:10",
    categoria: CategoriaFrase.BIBLICA,
  },
  {
    texto: "O plano do diligente conduz à abundância, mas a pressa leva à pobreza.",
    autor: "Provérbios 21:5",
    categoria: CategoriaFrase.BIBLICA,
  },
  {
    texto: "A mão negligente empobrece, mas a mão diligente enriquece.",
    autor: "Provérbios 10:4",
    categoria: CategoriaFrase.BIBLICA,
  },
  {
    texto: "Quem observa o vento nunca semeará, e quem olha para as nuvens nunca ceifará.",
    autor: "Eclesiastes 11:4",
    categoria: CategoriaFrase.BIBLICA,
  },
  {
    texto: "Vai ter com a formiga, considera os seus caminhos e sê sábio.",
    autor: "Provérbios 6:6",
    categoria: CategoriaFrase.BIBLICA,
  },

  // --- Pensadores ---
  {
    texto: "Só sei que nada sei.",
    autor: "Sócrates",
    categoria: CategoriaFrase.PENSADOR,
  },
  {
    texto:
      "Nós somos aquilo que fazemos repetidamente. A excelência, portanto, não é um ato, mas um hábito.",
    autor: "Aristóteles",
    categoria: CategoriaFrase.PENSADOR,
  },
  {
    texto: "Não é que temos pouco tempo, é que perdemos muito dele.",
    autor: "Sêneca",
    categoria: CategoriaFrase.PENSADOR,
  },
  {
    texto:
      "Você tem poder sobre a sua mente, não sobre os eventos externos. Perceba isso e encontrará força.",
    autor: "Marco Aurélio",
    categoria: CategoriaFrase.PENSADOR,
  },
  {
    texto: "Aquele que tem um porquê enfrenta qualquer como.",
    autor: "Friedrich Nietzsche",
    categoria: CategoriaFrase.PENSADOR,
  },
  {
    texto: "Disciplina é escolher entre o que você quer agora e o que você quer mais.",
    autor: "Abraham Lincoln",
    categoria: CategoriaFrase.PENSADOR,
  },
  {
    texto: "A sorte é o que acontece quando a preparação encontra a oportunidade.",
    autor: "Sêneca",
    categoria: CategoriaFrase.PENSADOR,
  },

  // --- Trading ---
  {
    texto: "O objetivo de um trader de sucesso é fazer os melhores trades. Dinheiro é secundário.",
    autor: "Alexander Elder",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto: "Não é o mercado que te derrota. Você se derrota sozinho.",
    autor: "Jesse Livermore",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto: "Dinheiro se ganha sentado, esperando. Não operando.",
    autor: "Jesse Livermore",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto:
      "O elemento mais importante não é prever o mercado, é controlar o risco de estar errado.",
    autor: "Paul Tudor Jones",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto: "Quanto menos tempo exposto ao mercado, mais tempo você viverá dele.",
    autor: "Matheus Calvelo",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto:
      "Amadores pensam em quanto podem ganhar. Profissionais pensam em quanto podem perder.",
    autor: "Mark Douglas",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto: "Consistência não é fazer muito num dia. É fazer o suficiente todos os dias.",
    categoria: CategoriaFrase.TRADING,
  },
  {
    texto: "Seguir o plano num dia ruim vale mais que acertar por sorte num dia bom.",
    categoria: CategoriaFrase.TRADING,
  },
];

async function seedFrases() {
  let criadas = 0;

  for (const frase of FRASES) {
    // Não há unique em `texto`, então checamos antes pra manter idempotência.
    const existente = await prisma.frase.findFirst({
      where: { texto: frase.texto, userId: null },
      select: { id: true },
    });

    if (existente) continue;

    await prisma.frase.create({
      data: {
        texto: frase.texto,
        autor: frase.autor,
        categoria: frase.categoria,
        userId: null,
      },
    });
    criadas++;
  }

  console.log(`✅ Frases globais: ${criadas} novas (${FRASES.length} no total do seed).`);
}

async function main() {
  console.log("🌱 Semeando o Sócrates...\n");
  await seedRegrasApex();
  await seedFrases();
  console.log("\n🎉 Seed concluído.");
}

main()
  .catch((erro) => {
    console.error("❌ Seed falhou:", erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
