"use client";

import { useOptimistic, useState, useTransition } from "react";
import { alternarFeita, arquivarTarefa } from "@/app/tarefas/acoes";
import { descreverRecorrencia, type TarefaDoDia } from "@/lib/tarefas";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";

export function ListaTarefas({ tarefas }: { tarefas: TarefaDoDia[] }) {
  // O check responde na hora; se o servidor recusar, o React reverte sozinho.
  const [otimistas, aplicarOtimista] = useOptimistic(
    tarefas,
    (atual, mudanca: { id: string; feita: boolean }) =>
      atual.map((t) =>
        t.id === mudanca.id ? { ...t, feita: mudanca.feita, atrasada: false } : t,
      ),
  );

  const [, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function marcar(tarefa: TarefaDoDia) {
    const novoValor = !tarefa.feita;

    iniciarTransicao(async () => {
      aplicarOtimista({ id: tarefa.id, feita: novoValor });
      const r = await alternarFeita(tarefa.id, novoValor);
      if (!r.ok) setErro(r.erro);
    });
  }

  function arquivar(tarefa: TarefaDoDia) {
    iniciarTransicao(async () => {
      const r = await arquivarTarefa(tarefa.id);
      if (!r.ok) setErro(r.erro);
    });
  }

  if (otimistas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-borda p-10 text-center">
        <p className="font-medium">Nada pra hoje.</p>
        <p className="mt-1 text-sm text-texto-fraco">
          Adiciona uma tarefa aí embaixo pra começar a rotina.
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
        {otimistas.map((t) => (
          <li key={t.id} className="group flex items-center gap-3 px-4 py-3.5">
            <button
              type="button"
              onClick={() => marcar(t)}
              aria-pressed={t.feita}
              aria-label={t.feita ? `Desmarcar ${t.titulo}` : `Marcar ${t.titulo} como feita`}
              className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                t.feita
                  ? "border-positivo bg-positivo text-fundo"
                  : "border-borda hover:border-positivo/70"
              }`}
            >
              {t.feita && <span className="text-xs font-bold">✓</span>}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`truncate transition-colors ${
                  t.feita ? "text-texto-fraco line-through" : ""
                }`}
              >
                {t.titulo}
              </p>
              <p className="mt-0.5 text-xs text-texto-fraco">
                {descreverRecorrencia(t, NOMES_DIAS_SEMANA)}
              </p>
            </div>

            {t.atrasada && (
              <span className="shrink-0 rounded-full bg-atencao/15 px-2.5 py-1 text-xs font-medium text-atencao">
                atrasada
              </span>
            )}

            <button
              type="button"
              onClick={() => arquivar(t)}
              aria-label={`Arquivar ${t.titulo}`}
              title="Arquivar"
              className="shrink-0 rounded-lg px-2 py-1 text-texto-fraco opacity-0 transition-opacity hover:text-negativo focus-visible:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
