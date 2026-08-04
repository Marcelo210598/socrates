"use client";

import { useState, useTransition } from "react";
import { Recorrencia } from "@prisma/client";
import { criarTarefa } from "@/app/tarefas/acoes";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";

const OPCOES_RECORRENCIA = [
  { valor: Recorrencia.DIARIA, rotulo: "Todo dia" },
  { valor: Recorrencia.DIAS_SEMANA, rotulo: "Dias da semana" },
  { valor: Recorrencia.MENSAL, rotulo: "Todo mês" },
] as const;

export function FormNovaTarefa() {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [recorrencia, setRecorrencia] = useState<(typeof OPCOES_RECORRENCIA)[number]["valor"]>(
    Recorrencia.DIARIA,
  );
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [diaDoMes, setDiaDoMes] = useState("1");
  const [horaAlvo, setHoraAlvo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarTransicao] = useTransition();

  function limpar() {
    setTitulo("");
    setRecorrencia(Recorrencia.DIARIA);
    setDiasSemana([]);
    setDiaDoMes("1");
    setHoraAlvo("");
    setErro(null);
  }

  function alternarDia(dia: number) {
    setDiasSemana((atual) =>
      atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia],
    );
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    iniciarTransicao(async () => {
      const r = await criarTarefa({
        titulo,
        recorrencia,
        diasSemana,
        diaDoMes: recorrencia === Recorrencia.MENSAL ? Number(diaDoMes) : null,
        horaAlvo: horaAlvo || null,
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
        + Nova tarefa
      </button>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-4 rounded-2xl border border-borda bg-superficie p-5"
    >
      <div>
        <label htmlFor="titulo" className="mb-1.5 block text-sm font-medium">
          O que precisa fazer?
        </label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Academia"
          autoFocus
          maxLength={120}
          className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none placeholder:text-texto-fraco/60 focus:border-marca"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Com que frequência?</span>
        <div className="flex flex-wrap gap-2">
          {OPCOES_RECORRENCIA.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => setRecorrencia(o.valor)}
              className={`rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                recorrencia === o.valor
                  ? "border-marca bg-marca/15 text-marca"
                  : "border-borda text-texto-fraco hover:text-texto"
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>

      {recorrencia === Recorrencia.DIAS_SEMANA && (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Em quais dias?</span>
          <div className="flex flex-wrap gap-2">
            {NOMES_DIAS_SEMANA.map((nome, indice) => (
              <button
                key={nome}
                type="button"
                onClick={() => alternarDia(indice)}
                aria-pressed={diasSemana.includes(indice)}
                className={`size-11 rounded-xl border text-sm transition-colors ${
                  diasSemana.includes(indice)
                    ? "border-marca bg-marca/15 text-marca"
                    : "border-borda text-texto-fraco hover:text-texto"
                }`}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {recorrencia === Recorrencia.MENSAL && (
        <div>
          <label htmlFor="diaDoMes" className="mb-1.5 block text-sm font-medium">
            Dia do mês
          </label>
          <input
            id="diaDoMes"
            type="number"
            min={1}
            max={31}
            value={diaDoMes}
            onChange={(e) => setDiaDoMes(e.target.value)}
            className="w-24 rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
          />
        </div>
      )}

      <div>
        <label htmlFor="horaAlvo" className="mb-1.5 block text-sm font-medium">
          Horário <span className="font-normal text-texto-fraco">(opcional)</span>
        </label>
        <input
          id="horaAlvo"
          type="time"
          value={horaAlvo}
          onChange={(e) => setHoraAlvo(e.target.value)}
          className="rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
        />
        <p className="mt-1.5 text-xs text-texto-fraco">
          Com horário, eu sei quando a tarefa atrasou — e é isso que me faz te cobrar.
        </p>
      </div>

      {erro && <p className="text-sm text-negativo">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Adicionar"}
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
