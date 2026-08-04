"use client";

import { useState, useTransition } from "react";
import { lancarPregaoAction } from "@/app/apex/acoes";
import { dataParaInput, hojeNoFuso } from "@/lib/datas";

export function FormLancarPregao({ contaId, fuso }: { contaId: string; fuso: string }) {
  const [data, setData] = useState(() => dataParaInput(hojeNoFuso(fuso)));
  const [resultado, setResultado] = useState("");
  const [notas, setNotas] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [salvando, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setConfirmado(false);

    const numero = Number(resultado.replace(",", "."));
    if (resultado.trim() === "" || !Number.isFinite(numero)) {
      setErro("Informa o resultado do dia (pode ser negativo).");
      return;
    }

    iniciarTransicao(async () => {
      const r = await lancarPregaoAction({ contaId, data, resultado: numero, notas });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setResultado("");
      setNotas("");
      setConfirmado(true);
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borda bg-superficie p-5">
      <h2 className="font-semibold">Lançar resultado do dia</h2>

      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="data-pregao" className="mb-1.5 block text-sm font-medium">
            Data
          </label>
          <input
            id="data-pregao"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-violeta"
          />
        </div>

        <div className="min-w-32 flex-1">
          <label htmlFor="resultado" className="mb-1.5 block text-sm font-medium">
            Resultado (USD)
          </label>
          <input
            id="resultado"
            inputMode="decimal"
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            placeholder="180 ou -95"
            className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none placeholder:text-texto-fraco/60 focus:border-violeta"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notas-pregao" className="mb-1.5 block text-sm font-medium">
          Notas <span className="font-normal text-texto-fraco">(opcional)</span>
        </label>
        <input
          id="notas-pregao"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          maxLength={300}
          className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-violeta"
        />
      </div>

      {erro && <p className="text-sm text-negativo">{erro}</p>}
      {confirmado && <p className="text-sm text-positivo">Salvo ✅</p>}

      <p className="text-xs text-texto-fraco">
        Já lançou o dia? Manda de novo com o valor certo — eu substituo, não duplico.
      </p>

      <button
        type="submit"
        disabled={salvando}
        className="rounded-xl bg-violeta px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
