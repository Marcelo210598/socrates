import Link from "next/link";

/** Barra fixa no topo — marca à esquerda, atalhos à direita. */
export function BarraTopo() {
  return (
    <header className="sticky top-0 z-40 border-b border-borda/80 bg-fundo/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-marca text-[13px] font-bold text-white">
            Σ
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Sócrates</span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/tarefas"
              className="rounded-lg px-3 py-1.5 text-sm text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
            >
              Tarefas
            </Link>
            <Link
              href="/compromissos"
              className="rounded-lg px-3 py-1.5 text-sm text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
            >
              Compromissos
            </Link>
            <Link
              href="/apex"
              className="rounded-lg px-3 py-1.5 text-sm text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
            >
              Apex
            </Link>
            {/* "Mercado" (Módulo 4 — Briefing) removido daqui até existir de verdade —
                apontava pra /mercado, que não existe ainda, e dava 404. */}
          </nav>

          <span
            className="grid size-8 place-items-center rounded-full bg-superficie-alta text-sm font-semibold text-texto-fraco ring-1 ring-borda"
            title="Marcelo"
          >
            M
          </span>
        </div>
      </div>
    </header>
  );
}
