import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { listarContasComDiagnostico, listarPossiveisMestres } from "@/lib/apex/contas";
import { brl } from "@/lib/apex/motor";
import { CartaoConta } from "@/components/apex/CartaoConta";
import { FormNovaConta } from "@/components/apex/FormNovaConta";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contas Apex · Sócrates" };

export default async function PaginaApex() {
  const usuario = await obterUsuarioAtual();

  const [itens, mestresDisponiveis] = await Promise.all([
    listarContasComDiagnostico(usuario.id),
    listarPossiveisMestres(usuario.id),
  ]);

  const ativas = itens.filter((i) => i.conta.status !== "ENCERRADA");
  const liberadas = ativas.filter((i) => i.diagnostico.liberadaParaSaque);

  // Drawdown mais apertado = menor folga entre as contas que ainda operam.
  const maisApertada = ativas
    .filter((i) => i.conta.status !== "VIOLADA")
    .sort((a, b) => a.diagnostico.folgaDrawdown - b.diagnostico.folgaDrawdown)[0];

  return (
    <main className="area-segura mx-auto w-full max-w-3xl px-4 pt-8 pb-20">
      <Link href="/" className="text-sm text-texto-fraco transition-colors hover:text-texto">
        ← Início
      </Link>

      <header className="mt-4 mb-7">
        <h1 className="text-3xl font-bold tracking-tight">Contas Apex</h1>
        <p className="mt-1 text-texto-fraco">Saldos, metas diárias e saques.</p>
      </header>

      {ativas.length > 0 && (
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Estatistica rotulo="Contas ativas" valor={String(ativas.length)} />
          <Estatistica
            rotulo="Liberadas"
            valor={String(liberadas.length)}
            destaque={liberadas.length > 0}
          />
          <Estatistica
            rotulo="Drawdown + apertado"
            valor={maisApertada ? brl(maisApertada.diagnostico.folgaDrawdown) : "—"}
            sub={maisApertada?.conta.apelido}
          />
        </section>
      )}

      {liberadas.length > 0 && (
        <section className="mb-7 rounded-2xl border border-positivo/40 bg-positivo/10 p-4">
          <p className="font-semibold text-positivo">
            🎉 {liberadas.length === 1 ? "1 conta liberada" : `${liberadas.length} contas liberadas`}{" "}
            pra saque
          </p>
          <p className="mt-1 text-sm text-texto-fraco">
            {liberadas.map((i) => i.conta.apelido).join(", ")}
          </p>
        </section>
      )}

      <div className="space-y-3">
        {itens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-borda p-10 text-center">
            <p className="font-medium">Nenhuma conta cadastrada.</p>
            <p className="mt-1 text-sm text-texto-fraco">
              Cadastra a primeira aí embaixo pra eu começar a acompanhar.
            </p>
          </div>
        ) : (
          itens.map((item) => <CartaoConta key={item.conta.id} {...item} />)
        )}

        <FormNovaConta fuso={usuario.timezone} mestresDisponiveis={mestresDisponiveis} />
      </div>
    </main>
  );
}

function Estatistica({
  rotulo,
  valor,
  sub,
  destaque,
}: {
  rotulo: string;
  valor: string;
  sub?: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-borda bg-superficie p-4">
      <p className="text-xs text-texto-fraco">{rotulo}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${destaque ? "text-positivo" : ""}`}>
        {valor}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-texto-fraco">{sub}</p>}
    </div>
  );
}
