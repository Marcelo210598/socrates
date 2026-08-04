"use client";

import { useOptimistic, useState, useTransition } from "react";
import { concluirCompromissoAction, cancelarCompromissoAction } from "@/app/compromissos/acoes";
import { dataHoraCurta } from "@/lib/datas";

type CompromissoItem = {
  id: string;
  titulo: string;
  quando: Date;
  local: string | null;
};

type Acao = { id: string; tipo: "concluir" | "cancelar" };

export function ListaCompromissos({
  compromissos,
  fuso,
}: {
  compromissos: CompromissoItem[];
  fuso: string;
}) {
  const [otimistas, aplicarOtimista] = useOptimistic(
    compromissos,
    (atual, acao: Acao) => atual.filter((c) => c.id !== acao.id),
  );
  const [, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function executar(id: string, tipo: Acao["tipo"]) {
    iniciarTransicao(async () => {
      aplicarOtimista({ id, tipo });
      const r =
        tipo === "concluir" ? await concluirCompromissoAction(id) : await cancelarCompromissoAction(id);
      if (!r.ok) setErro(r.erro);
    });
  }

  if (otimistas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-borda p-10 text-center">
        <p className="font-medium">Nada marcado.</p>
        <p className="mt-1 text-sm text-texto-fraco">
          Fala comigo aí em cima que eu agendo pra você.
        </p>
      </div>
    );
  }

  return (
    <>
      {erro && (
        <p className="mb-3 rounded-xl border border-negativo/40 bg-negativo/10 px-4 py-2.5 text-sm text-negativo">
          {erro}
        </p>
      )}

      <ul className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-superficie">
        {otimistas.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.titulo}</p>
              <p className="mt-0.5 text-sm text-texto-fraco">
                {dataHoraCurta(c.quando, fuso)}
                {c.local && ` · ${c.local}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => executar(c.id, "concluir")}
              title="Marcar como feito"
              className="shrink-0 grid size-8 place-items-center rounded-full text-texto-fraco transition-colors hover:bg-positivo/15 hover:text-positivo"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => executar(c.id, "cancelar")}
              title="Cancelar"
              className="shrink-0 grid size-8 place-items-center rounded-full text-texto-fraco transition-colors hover:bg-negativo/15 hover:text-negativo"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
