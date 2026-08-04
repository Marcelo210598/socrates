import type { Condicao } from "@/lib/apex/motor";

/** Checklist das 5 condições pra liberar o saque. */
export function Condicoes({ condicoes }: { condicoes: Condicao[] }) {
  return (
    <ul className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-superficie">
      {condicoes.map((c) => (
        <li key={c.chave} className="flex items-start gap-3 px-4 py-3.5">
          <span
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
              c.atendida ? "bg-positivo/20 text-positivo" : "bg-superficie-alta text-texto-fraco"
            }`}
          >
            {c.atendida ? "✓" : "○"}
          </span>
          <span className="min-w-0 flex-1">
            <p className={c.atendida ? "text-texto" : "font-medium text-texto"}>{c.rotulo}</p>
            <p className="mt-0.5 text-sm text-texto-fraco">{c.detalhe}</p>
          </span>
        </li>
      ))}
    </ul>
  );
}
