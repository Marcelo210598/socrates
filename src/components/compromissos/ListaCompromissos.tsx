"use client";

import { useOptimistic, useState, useTransition } from "react";
import { concluirCompromissoAction, cancelarCompromissoAction } from "@/app/compromissos/acoes";

type CompromissoItem = {
  id: string;
  titulo: string;
  quando: Date;
  horaDefinida: boolean;
  local: string | null;
};

type Acao = { id: string; tipo: "concluir" | "cancelar" };

/** "Hoje" / "Amanhã" / dia da semana curto — só pra dar contexto rápido no card. */
function rotuloDia(quando: Date, fuso: string): { texto: string; destaque: boolean } {
  const formatarDia = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  const hoje = new Date();
  const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);

  const diaAlvo = formatarDia(quando);
  if (diaAlvo === formatarDia(hoje)) return { texto: "Hoje", destaque: true };
  if (diaAlvo === formatarDia(amanha)) return { texto: "Amanhã", destaque: false };

  return {
    texto: new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: fuso })
      .format(quando)
      .replace(".", ""),
    destaque: false,
  };
}

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
        <p className="text-3xl">🌤️</p>
        <p className="mt-2 font-medium">Nada marcado.</p>
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

      <ul className="flex flex-col gap-2.5">
        {otimistas.map((c) => {
          const dia = rotuloDia(c.quando, fuso);
          const hora = c.horaDefinida
            ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso }).format(
                c.quando,
              )
            : null;

          return (
            <li
              key={c.id}
              className="group flex items-center gap-4 rounded-2xl border border-borda bg-superficie px-4 py-3.5 transition-colors hover:border-marca/40"
            >
              <div
                className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg ${
                  dia.destaque ? "bg-marca/15 text-marca" : "bg-superficie-alta text-texto-fraco"
                }`}
              >
                📌
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.titulo}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-texto-fraco">
                  <span className={dia.destaque ? "font-semibold text-marca" : ""}>{dia.texto}</span>
                  <span className="inline-flex items-center gap-1">
                    🕐 {hora ?? "sem hora marcada"}
                  </span>
                  {c.local && <span className="inline-flex items-center gap-1">📍 {c.local}</span>}
                </p>
              </div>

              <button
                type="button"
                onClick={() => executar(c.id, "concluir")}
                title="Marcar como feito"
                className="shrink-0 grid size-9 place-items-center rounded-full text-lg text-texto-fraco transition-colors hover:bg-positivo/15 hover:text-positivo"
              >
                ✅
              </button>
              <button
                type="button"
                onClick={() => executar(c.id, "cancelar")}
                title="Cancelar"
                className="shrink-0 grid size-9 place-items-center rounded-full text-lg text-texto-fraco transition-colors hover:bg-negativo/15 hover:text-negativo"
              >
                🗑️
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
