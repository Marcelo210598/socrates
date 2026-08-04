"use client";

import { useState, useTransition } from "react";
import { registrarSaqueAction } from "@/app/apex/acoes";
import { brl } from "@/lib/apex/motor";

export function BotaoRegistrarSaque({
  contaId,
  valorSacavel,
  proximoNumero,
  maxSaques,
}: {
  contaId: string;
  valorSacavel: number;
  proximoNumero: number;
  maxSaques: number;
}) {
  // Congela o número no instante em que você inicia a confirmação. Sem isso,
  // o `revalidatePath` da server action reflui a página ANTES do `setFeito`
  // aplicar — o número que exibimos vira o próximo (ex.: mostra "#2" pra um
  // saque que gravou "#1"). O valor gravado no banco nunca depende disto,
  // só a mensagem na tela.
  const [numeroConfirmado, setNumeroConfirmado] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [salvando, iniciarTransicao] = useTransition();

  if (feito) {
    return (
      <p className="text-sm font-medium text-positivo">
        Saque #{numeroConfirmado} registrado ✅
      </p>
    );
  }

  if (numeroConfirmado === null) {
    return (
      <button
        type="button"
        onClick={() => setNumeroConfirmado(proximoNumero)}
        className="rounded-xl bg-positivo px-4 py-2.5 text-sm font-semibold text-fundo transition-opacity hover:opacity-90"
      >
        Registrar saque #{proximoNumero} ({brl(valorSacavel)})
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-positivo/40 bg-positivo/10 p-4">
      <p className="text-sm">
        Confirma o saque #{numeroConfirmado} de {maxSaques} · {brl(valorSacavel)}?
      </p>
      {erro && <p className="mt-2 text-sm text-negativo">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={salvando}
          onClick={() =>
            iniciarTransicao(async () => {
              setErro(null);
              const r = await registrarSaqueAction(contaId);
              if (!r.ok) {
                setErro(r.erro);
                return;
              }
              setFeito(true);
            })
          }
          className="rounded-xl bg-positivo px-4 py-2 text-sm font-semibold text-fundo transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Registrando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setNumeroConfirmado(null)}
          className="rounded-xl px-4 py-2 text-sm text-texto-fraco hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
