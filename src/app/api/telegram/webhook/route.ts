import { NextResponse } from "next/server";
import { enviarMensagem, type TelegramUpdate } from "@/lib/telegram";

/**
 * Webhook do Telegram — porta de entrada de tudo que você manda pro Sócrates.
 *
 * ESQUELETO: por enquanto só valida o segredo, loga e responde. O roteador de
 * intenções (compromisso? resultado de pregão? tarefa?) entra depois que você
 * aprovar a lista de comandos.
 */

export const runtime = "nodejs";
// Webhook nunca pode ser cacheado nem pré-renderizado.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // O Telegram devolve no header o mesmo segredo que registramos no setWebhook.
  // Sem isso, qualquer um na internet conseguiria falar com o bot pela nossa API.
  const segredo = req.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || segredo !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ erro: "json inválido" }, { status: 400 });
  }

  const mensagem = update.message;
  if (!mensagem) {
    // callback_query e outros tipos entram aqui depois.
    return NextResponse.json({ ok: true });
  }

  const chatId = mensagem.chat.id;
  const temAudio = Boolean(mensagem.voice ?? mensagem.audio);
  const texto = mensagem.text?.trim() ?? "";

  console.log("[telegram] update", {
    chatId,
    temAudio,
    texto: texto.slice(0, 120),
  });

  if (texto === "/start") {
    await enviarMensagem(
      chatId,
      [
        "E aí! Sou o <b>Sócrates</b> 🦉",
        "",
        `Seu chat id é <code>${chatId}</code> — cola ele no <code>TELEGRAM_OWNER_CHAT_ID</code> do .env.`,
        "",
        "Ainda tô sendo montado. Em breve dá pra falar comigo por texto e áudio.",
      ].join("\n"),
    );
    return NextResponse.json({ ok: true });
  }

  await enviarMensagem(
    chatId,
    temAudio
      ? "Recebi seu áudio 🎙️ — a transcrição entra no Módulo 2."
      : "Recebi 👍 — ainda tô aprendendo a responder de verdade.",
  );

  return NextResponse.json({ ok: true });
}

// GET só pra você conseguir conferir no navegador que a rota existe.
export async function GET() {
  return NextResponse.json({
    rota: "webhook do telegram",
    configurado: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  });
}
