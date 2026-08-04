import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { obterContaComDiagnostico } from "@/lib/apex/contas";
import { brl } from "@/lib/apex/motor";
import { ROTULO_TAMANHO, ROTULO_TIPO, ROTULO_STATUS, CLASSE_STATUS } from "@/lib/apex/rotulos";
import { diaCurto } from "@/lib/datas";
import { Condicoes } from "@/components/apex/Condicoes";
import { FormLancarPregao } from "@/components/apex/FormLancarPregao";
import { BotaoRegistrarSaque } from "@/components/apex/BotaoRegistrarSaque";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obterUsuarioAtual();
  const item = await obterContaComDiagnostico(usuario.id, id);
  return { title: item ? `${item.conta.apelido} · Sócrates` : "Conta · Sócrates" };
}

export default async function PaginaConta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obterUsuarioAtual();
  const item = await obterContaComDiagnostico(usuario.id, id);

  if (!item) notFound();

  const { conta, diagnostico } = item;
  const pregoesRecentes = [...conta.pregoes].reverse().slice(0, 15);

  return (
    <main className="area-segura mx-auto w-full max-w-2xl px-4 pt-8 pb-20">
      <Link href="/apex" className="text-sm text-texto-fraco transition-colors hover:text-texto">
        ← Contas Apex
      </Link>

      <header className="mt-4 mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{conta.apelido}</h1>
          <p className="mt-1 text-texto-fraco">
            {ROTULO_TAMANHO[conta.tamanho]} · {ROTULO_TIPO[conta.tipo]}
            {conta.ehMestre && " · Mestre do replicador"}
            {conta.contaMestreId && " · Réplica"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${CLASSE_STATUS[conta.status]}`}
        >
          {ROTULO_STATUS[conta.status]}
        </span>
      </header>

      {/* --- Saldo em destaque --- */}
      <section className="mb-6 rounded-2xl border border-borda bg-superficie p-6">
        <p className="text-sm text-texto-fraco">Saldo atual</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{brl(diagnostico.saldoAtual)}</p>
        <p className="mt-1 text-sm text-texto-fraco">
          Inicial {brl(conta.saldoInicial.toNumber())} · Lucro do ciclo {brl(diagnostico.lucroTotal)}
        </p>
      </section>

      {/* --- Números-chave --- */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <Numero
          rotulo="Meta diária sugerida"
          valor={diagnostico.metaDiariaSugerida > 0 ? brl(diagnostico.metaDiariaSugerida) : "Batida ✓"}
        />
        <Numero
          rotulo="Dias qualificados"
          valor={`${diagnostico.diasQualificados}`}
          sub={
            diagnostico.diasQualificadosFaltando > 0
              ? `Faltam ${diagnostico.diasQualificadosFaltando}`
              : "Completo"
          }
        />
        <Numero
          rotulo="Folga de drawdown"
          valor={brl(diagnostico.folgaDrawdown)}
          sub={diagnostico.drawdownCongelado ? "Congelado (protegido)" : "Ainda sobe com o pico"}
        />
        <Numero rotulo="Sacável hoje" valor={brl(diagnostico.valorSacavelHoje)} />
      </section>

      {/* --- Condições --- */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-texto-fraco uppercase">
          Condições pro saque
        </h2>
        <Condicoes condicoes={diagnostico.condicoes} />
      </section>

      {diagnostico.liberadaParaSaque && (
        <section className="mb-6">
          <BotaoRegistrarSaque
            contaId={conta.id}
            valorSacavel={diagnostico.valorSacavelHoje}
            proximoNumero={conta.saques.length + 1}
            maxSaques={conta.regra.maxSaques}
          />
        </section>
      )}

      {/* --- Lançar pregão --- */}
      <section className="mb-6">
        <FormLancarPregao contaId={conta.id} fuso={usuario.timezone} />
      </section>

      {/* --- Histórico --- */}
      {pregoesRecentes.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-texto-fraco uppercase">
            Últimos pregões
          </h2>
          <div className="overflow-hidden rounded-2xl border border-borda bg-superficie">
            <ul className="divide-y divide-borda">
              {pregoesRecentes.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-texto-fraco">{diaCurto(p.data)}</span>
                  <span
                    className={`font-medium tabular-nums ${
                      p.resultado.toNumber() > 0
                        ? "text-positivo"
                        : p.resultado.toNumber() < 0
                          ? "text-negativo"
                          : "text-texto-fraco"
                    }`}
                  >
                    {brl(p.resultado.toNumber())}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}

function Numero({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-borda bg-superficie p-4">
      <p className="text-xs text-texto-fraco">{rotulo}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-texto-fraco">{sub}</p>}
    </div>
  );
}
