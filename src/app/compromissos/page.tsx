import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { listarProximosCompromissos } from "@/lib/compromissos";
import { NovoCompromisso } from "@/components/compromissos/NovoCompromisso";
import { ListaCompromissos } from "@/components/compromissos/ListaCompromissos";

export const dynamic = "force-dynamic";

export const metadata = { title: "Compromissos · Sócrates" };

export default async function PaginaCompromissos() {
  const usuario = await obterUsuarioAtual();
  const compromissos = await listarProximosCompromissos(usuario.id);

  return (
    <main className="area-segura mx-auto w-full max-w-2xl px-4 pt-8 pb-20">
      <Link href="/" className="text-sm text-texto-fraco transition-colors hover:text-texto">
        ← Início
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Compromissos</h1>
        <p className="mt-1 text-texto-fraco">
          Manda por texto ou áudio, do jeito que você fala.
        </p>
      </header>

      <div className="mb-7">
        <NovoCompromisso fuso={usuario.timezone} />
      </div>

      <h2 className="mb-3 text-xs font-semibold tracking-widest text-texto-fraco uppercase">
        Próximos
      </h2>
      <ListaCompromissos compromissos={compromissos} fuso={usuario.timezone} />
    </main>
  );
}
