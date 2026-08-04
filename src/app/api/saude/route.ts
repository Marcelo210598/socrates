import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Diagnóstico rápido: o banco responde? o que já está configurado? */
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();

  try {
    const [regras, frases] = await Promise.all([
      prisma.regraApex.count(),
      prisma.frase.count(),
    ]);

    return NextResponse.json({
      ok: true,
      banco: { conectado: true, ms: Date.now() - inicio, regrasApex: regras, frases },
      configurado: {
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        groq: Boolean(process.env.GROQ_API_KEY),
        auth: Boolean(process.env.AUTH_SECRET),
      },
    });
  } catch (erro) {
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 500 },
    );
  }
}
