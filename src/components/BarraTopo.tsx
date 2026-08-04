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

        <nav className="flex items-center gap-1">
          <Link
            href="/apex"
            className="rounded-lg px-3 py-1.5 text-sm text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
          >
            Apex
          </Link>
          <Link
            href="/mercado"
            className="rounded-lg px-3 py-1.5 text-sm text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
          >
            Mercado
          </Link>
          <span
            className="ml-2 grid size-8 place-items-center rounded-full bg-superficie-alta text-sm font-semibold text-texto-fraco ring-1 ring-borda"
            title="Marcelo"
          >
            M
          </span>
        </nav>
      </div>
    </header>
  );
}
