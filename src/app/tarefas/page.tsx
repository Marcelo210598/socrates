import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { listarTarefasDoDia } from "@/lib/tarefas";
import { dataPorExtenso, hojeNoFuso, minutosDoDia } from "@/lib/datas";
import { ListaTarefas } from "@/components/tarefas/ListaTarefas";
import { FormNovaTarefa } from "@/components/tarefas/FormNovaTarefa";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tarefas · Sócrates" };

export default async function PaginaTarefas() {
  const usuario = await obterUsuarioAtual();
  const fuso = usuario.timezone;
  const hoje = hojeNoFuso(fuso);

  const tarefas = await listarTarefasDoDia({
    userId: usuario.id,
    data: hoje,
    agoraEmMinutos: minutosDoDia(fuso),
  });

  const feitas = tarefas.filter((t) => t.feita).length;
  const total = tarefas.length;
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0;
  const tudoFeito = total > 0 && feitas === total;

  return (
    <main className="area-segura mx-auto w-full max-w-2xl px-4 pt-8 pb-20">
      <Link
        href="/"
        className="text-sm text-texto-fraco transition-colors hover:text-texto"
      >
        ← Início
      </Link>

      <header className="mt-4 mb-7">
        <p className="text-sm font-medium text-texto-fraco first-letter:uppercase">
          {dataPorExtenso(new Date(), fuso)}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Tarefas de hoje</h1>
      </header>

      {total > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-texto-fraco">
              {feitas} de {total} {feitas === 1 ? "feita" : "feitas"}
            </span>
            <span
              className={`text-sm font-semibold ${tudoFeito ? "text-positivo" : "text-texto-fraco"}`}
            >
              {pct}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-superficie-alta"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso das tarefas de hoje"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tudoFeito ? "bg-positivo" : "bg-marca"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      <div className="space-y-3">
        <ListaTarefas tarefas={tarefas} />
        <FormNovaTarefa />
      </div>
    </main>
  );
}
