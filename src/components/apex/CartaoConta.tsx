import Link from "next/link";
import type { ContaComDiagnostico } from "@/lib/apex/contas";
import { ROTULO_TAMANHO, ROTULO_TIPO, ROTULO_STATUS, CLASSE_STATUS } from "@/lib/apex/rotulos";
import { brl } from "@/lib/apex/motor";

export function CartaoConta({ conta, diagnostico }: ContaComDiagnostico) {
  // Progresso rumo ao saldo mínimo de saque: quanto já andou / (andou + o que falta).
  const jaAndou = Math.max(0, diagnostico.saldoAtual - conta.saldoInicial.toNumber());
  const pct = Math.max(
    0,
    Math.min(100, Math.round((jaAndou / (jaAndou + diagnostico.faltaParaSaque || 1)) * 100)),
  );

  return (
    <Link
      href={`/apex/${conta.id}`}
      className="group block rounded-2xl border border-borda bg-superficie p-5 transition-colors hover:border-violeta/50 hover:bg-superficie-alta"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{conta.apelido}</p>
          <p className="mt-0.5 text-sm text-texto-fraco">
            {ROTULO_TAMANHO[conta.tamanho]} · {ROTULO_TIPO[conta.tipo]}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${CLASSE_STATUS[conta.status]}`}
        >
          {ROTULO_STATUS[conta.status]}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold tabular-nums">{brl(diagnostico.saldoAtual)}</p>

      {diagnostico.liberadaParaSaque ? (
        <p className="mt-1 text-sm font-medium text-positivo">
          Liberada — {brl(diagnostico.valorSacavelHoje)} sacáveis
        </p>
      ) : (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-superficie-alta">
            <div
              className="h-full rounded-full bg-violeta transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-texto-fraco">
            Faltam {brl(diagnostico.faltaParaSaque)} · {diagnostico.diasQualificadosFaltando}{" "}
            {diagnostico.diasQualificadosFaltando === 1 ? "dia" : "dias"} qualificados
          </p>
        </>
      )}

      {!diagnostico.consistencia.ok && (
        <p className="mt-2 text-sm font-medium text-atencao">⚠ Consistência apertada</p>
      )}
    </Link>
  );
}
