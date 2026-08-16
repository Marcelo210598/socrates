import { NextResponse } from "next/server";
import { enviarFoto } from "@/lib/telegram";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { gerarMensagemMotivacional } from "@/lib/ia/motivacional";
import { prisma } from "@/lib/prisma";

/**
 * Chamado 1x por dia (07:30 BRT) pelo Cron Job do Railway. Gera a citação do
 * dia, renderiza o cartão de imagem e manda pro Telegram — pronto pra postar.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const segredo = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET) && segredo === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const usuario = await obterUsuarioAtual();
  if (!usuario.telegramId) {
    return NextResponse.json({ ok: true, aviso: "TELEGRAM_OWNER_CHAT_ID não configurado ainda" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json({ ok: false, erro: "NEXT_PUBLIC_APP_URL não configurada" }, { status: 500 });
  }

  try {
    const recentes = await prisma.mensagemMotivacional.findMany({
      where: { userId: usuario.id, enviadaEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { texto: true },
      take: 30,
    });

    const mensagem = await gerarMensagemMotivacional({ evitarTextos: recentes.map((r) => r.texto) });

    const respostaImagem = await fetch(new URL("/api/motivacional/imagem", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mensagem),
    });

    if (!respostaImagem.ok) {
      throw new Error(`Renderização da imagem falhou (${respostaImagem.status})`);
    }

    const imagem = await respostaImagem.arrayBuffer();

    await enviarFoto(usuario.telegramId, imagem, "☀️ Bom dia! Sua dose de hoje.");

    await prisma.mensagemMotivacional.create({
      data: { userId: usuario.id, texto: mensagem.texto, autor: mensagem.autor, tema: mensagem.tema },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[cron/motivacional] falha", erro);
    return NextResponse.json({ ok: false, erro: "Falha ao gerar mensagem motivacional" }, { status: 500 });
  }
}
