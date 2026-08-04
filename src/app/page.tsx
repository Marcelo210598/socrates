import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Modulo = {
  href: string;
  nome: string;
  resumo: string;
  icone: string;
  classeIcone: string;
  classeHover: string;
};

// As classes vêm escritas por extenso porque o Tailwind lê o código como texto:
// se a classe for montada com template literal, ela não entra no CSS gerado.
const MODULOS: Modulo[] = [
  {
    href: "/tarefas",
    nome: "Tarefas de hoje",
    resumo: "Sua rotina, com check por dia",
    icone: "✓",
    classeIcone: "bg-positivo/15 text-positivo",
    classeHover: "hover:border-positivo/50",
  },
  {
    href: "/compromissos",
    nome: "Compromissos",
    resumo: "Marque por texto ou áudio no Telegram",
    icone: "◷",
    classeIcone: "bg-marca/15 text-marca",
    classeHover: "hover:border-marca/50",
  },
  {
    href: "/mercado",
    nome: "Briefing do dia",
    resumo: "NQ/MNQ e agenda antes do pregão",
    icone: "↗",
    classeIcone: "bg-atencao/15 text-atencao",
    classeHover: "hover:border-atencao/50",
  },
  {
    href: "/apex",
    nome: "Contas Apex",
    resumo: "Saldos, metas diárias e saques",
    icone: "$",
    classeIcone: "bg-violeta/15 text-violeta",
    classeHover: "hover:border-violeta/50",
  },
];

function saudacao(hora: number): string {
  if (hora < 5) return "Ainda acordado";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function Home() {
  const agora = new Date();
  const fuso = "America/Sao_Paulo";

  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: fuso,
    }).format(agora),
  );

  const dataExtenso = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: fuso,
  }).format(agora);

  // Frase do dia — do banco do módulo motivacional. Escolhida pelo dia do ano,
  // então é a mesma o dia inteiro.
  const frases = await prisma.frase.findMany({
    where: { ativa: true, userId: null },
    select: { texto: true, autor: true },
    orderBy: { id: "asc" },
  });

  const inicioDoAno = Date.UTC(agora.getUTCFullYear(), 0, 0);
  const diaDoAno = Math.floor((agora.getTime() - inicioDoAno) / 86_400_000);
  const frase = frases.length > 0 ? frases[diaDoAno % frases.length] : null;

  return (
    <div className="relative flex-1">
      {/* Brilho de fundo: dá profundidade sem competir com o conteúdo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 100% at 50% 0%, rgba(79,157,253,0.22), rgba(167,139,250,0.08) 50%, transparent 80%)",
        }}
      />

      <main className="area-segura relative mx-auto w-full max-w-5xl px-4 pt-12 pb-20">
        {/* ---------- Abertura ---------- */}
        <section className="mb-12 max-w-2xl">
          {/* first-letter em vez de `capitalize`: senão vira "Segunda-Feira, 03 De Agosto". */}
          <p className="text-sm font-medium text-texto-fraco first-letter:uppercase">
            {dataExtenso}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {saudacao(hora)}, Marcelo.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-texto-fraco">
            Rotina, compromissos e suas contas Apex — num lugar só. Fale comigo por texto ou
            áudio no Telegram e eu cuido do resto.
          </p>
        </section>

        {/* ---------- Módulos ---------- */}
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-texto-fraco uppercase">
            Seus módulos
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {MODULOS.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className={`group flex items-start gap-4 rounded-2xl border border-borda bg-superficie p-5 transition-all duration-200 hover:bg-superficie-alta ${m.classeHover}`}
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${m.classeIcone}`}
                >
                  {m.icone}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{m.nome}</span>
                    <span className="text-texto-fraco transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-texto-fraco">
                    {m.resumo}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- Frase do dia ---------- */}
        {frase && (
          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-widest text-texto-fraco uppercase">
              Pra pensar hoje
            </h2>
            <figure className="rounded-2xl border border-borda bg-superficie p-6">
              <blockquote className="text-lg leading-relaxed text-balance">
                “{frase.texto}”
              </blockquote>
              {frase.autor && (
                <figcaption className="mt-3 text-sm font-medium text-texto-fraco">
                  {frase.autor}
                </figcaption>
              )}
            </figure>
          </section>
        )}
      </main>
    </div>
  );
}
