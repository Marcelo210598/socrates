"use client";

import { useState, useTransition } from "react";
import { TamanhoConta, TipoDrawdown } from "@prisma/client";
import { criarContaAction } from "@/app/apex/acoes";
import { ROTULO_TAMANHO, ROTULO_TIPO } from "@/lib/apex/rotulos";
import { dataParaInput, hojeNoFuso } from "@/lib/datas";

const TAMANHOS = [TamanhoConta.T25K, TamanhoConta.T50K, TamanhoConta.T100K, TamanhoConta.T150K];
const TIPOS = [TipoDrawdown.EOD, TipoDrawdown.INTRADAY];

export function FormNovaConta({
  fuso,
  mestresDisponiveis,
}: {
  fuso: string;
  mestresDisponiveis: { id: string; apelido: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [apelido, setApelido] = useState("");
  const [tamanho, setTamanho] = useState<TamanhoConta>(TamanhoConta.T25K);
  const [tipo, setTipo] = useState<TipoDrawdown>(TipoDrawdown.EOD);
  const [iniciadaEm, setIniciadaEm] = useState(() => dataParaInput(hojeNoFuso(fuso)));
  const [ehMestre, setEhMestre] = useState(false);
  const [contaMestreId, setContaMestreId] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarTransicao] = useTransition();

  function limpar() {
    setApelido("");
    setTamanho(TamanhoConta.T25K);
    setTipo(TipoDrawdown.EOD);
    setIniciadaEm(dataParaInput(hojeNoFuso(fuso)));
    setEhMestre(false);
    setContaMestreId("");
    setErro(null);
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    iniciarTransicao(async () => {
      const r = await criarContaAction({
        apelido: apelido || undefined,
        tamanho,
        tipo,
        iniciadaEm,
        ehMestre,
        contaMestreId: ehMestre ? null : contaMestreId || null,
      });

      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      limpar();
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full rounded-2xl border border-dashed border-borda px-4 py-3.5 text-sm font-medium text-texto-fraco transition-colors hover:border-marca/60 hover:text-texto"
      >
        + Nova conta
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borda bg-superficie p-5">
      <div>
        <span className="mb-1.5 block text-sm font-medium">Tamanho</span>
        <div className="flex flex-wrap gap-2">
          {TAMANHOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTamanho(t)}
              className={`rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                tamanho === t
                  ? "border-violeta bg-violeta/15 text-violeta"
                  : "border-borda text-texto-fraco hover:text-texto"
              }`}
            >
              {ROTULO_TAMANHO[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Tipo de drawdown</span>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                tipo === t
                  ? "border-violeta bg-violeta/15 text-violeta"
                  : "border-borda text-texto-fraco hover:text-texto"
              }`}
            >
              {ROTULO_TIPO[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="apelido" className="mb-1.5 block text-sm font-medium">
          Apelido <span className="font-normal text-texto-fraco">(opcional)</span>
        </label>
        <input
          id="apelido"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          placeholder={`${ROTULO_TAMANHO[tamanho]} ${ROTULO_TIPO[tipo]}`}
          maxLength={60}
          className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none placeholder:text-texto-fraco/60 focus:border-violeta"
        />
      </div>

      <div>
        <label htmlFor="iniciadaEm" className="mb-1.5 block text-sm font-medium">
          Iniciada em
        </label>
        <input
          id="iniciadaEm"
          type="date"
          value={iniciadaEm}
          onChange={(e) => setIniciadaEm(e.target.value)}
          className="rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-violeta"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={ehMestre}
            onChange={(e) => setEhMestre(e.target.checked)}
            className="size-4 rounded border-borda accent-violeta"
          />
          É uma conta mestre do replicador
        </label>

        {!ehMestre && mestresDisponiveis.length > 0 && (
          <div>
            <label htmlFor="contaMestreId" className="mb-1.5 block text-sm font-medium">
              É réplica de qual conta? <span className="font-normal text-texto-fraco">(opcional)</span>
            </label>
            <select
              id="contaMestreId"
              value={contaMestreId}
              onChange={(e) => setContaMestreId(e.target.value)}
              className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-violeta"
            >
              <option value="">Não é réplica</option>
              {mestresDisponiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.apelido}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-negativo">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-xl bg-violeta px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Criar conta"}
        </button>
        <button
          type="button"
          onClick={() => {
            limpar();
            setAberto(false);
          }}
          className="rounded-xl px-4 py-2.5 text-sm text-texto-fraco transition-colors hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
