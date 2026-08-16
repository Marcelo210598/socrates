/**
 * Camada fina em cima da API do Telegram.
 *
 * Sem biblioteca de bot: o webhook recebe um JSON e nós respondemos com uma
 * chamada HTTP. Menos dependência, menos coisa pra quebrar em serverless.
 */

const API = "https://api.telegram.org/bot";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN não configurado no .env");
  return t;
}

/** Formato mínimo de um update do Telegram — só o que usamos. */
export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: { id: number; first_name?: string; username?: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    voice?: { file_id: string; duration: number; mime_type?: string };
    audio?: { file_id: string; duration: number; mime_type?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
};

export type BotaoInline = { texto: string; dados: string };

export async function enviarMensagem(
  chatId: number | string,
  texto: string,
  opcoes?: { botoes?: BotaoInline[][] },
): Promise<void> {
  const corpo: Record<string, unknown> = {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  };

  if (opcoes?.botoes) {
    corpo.reply_markup = {
      inline_keyboard: opcoes.botoes.map((linha) =>
        linha.map((b) => ({ text: b.texto, callback_data: b.dados })),
      ),
    };
  }

  const resposta = await fetch(`${API}${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    // Não relançamos: uma falha de envio não pode derrubar o webhook, senão o
    // Telegram fica reenviando o mesmo update em loop.
    console.error("[telegram] falha ao enviar:", resposta.status, await resposta.text());
  }
}

/** Edita uma mensagem já enviada — usado pra "fechar" cards de confirmação após o clique. */
export async function editarMensagem(
  chatId: number | string,
  messageId: number,
  texto: string,
  opcoes?: { botoes?: BotaoInline[][] },
): Promise<void> {
  const corpo: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text: texto,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  };

  if (opcoes?.botoes) {
    corpo.reply_markup = {
      inline_keyboard: opcoes.botoes.map((linha) =>
        linha.map((b) => ({ text: b.texto, callback_data: b.dados })),
      ),
    };
  }

  const resposta = await fetch(`${API}${token()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    console.error("[telegram] falha ao editar:", resposta.status, await resposta.text());
  }
}

/**
 * Tira o "carregando" do botão clicado. `texto` (opcional) aparece como um
 * toast rápido no topo da tela — bom pra confirmar uma ação sem mandar mensagem nova.
 */
export async function responderCallback(callbackQueryId: string, texto?: string): Promise<void> {
  const resposta = await fetch(`${API}${token()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: texto,
    }),
  });

  if (!resposta.ok) {
    console.error("[telegram] falha ao responder callback:", resposta.status, await resposta.text());
  }
}

/** Manda uma foto (Buffer/ArrayBuffer) — usado pelo cartão motivacional de 07:00. */
export async function enviarFoto(
  chatId: number | string,
  imagem: ArrayBuffer,
  legenda?: string,
): Promise<void> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("photo", new Blob([imagem], { type: "image/png" }), "motivacional.png");
  if (legenda) {
    form.append("caption", legenda);
    form.append("parse_mode", "HTML");
  }

  const resposta = await fetch(`${API}${token()}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  if (!resposta.ok) {
    console.error("[telegram] falha ao enviar foto:", resposta.status, await resposta.text());
  }
}

/** Baixa um arquivo (áudio) do Telegram — usado pela transcrição no Módulo 2. */
export async function baixarArquivo(fileId: string): Promise<ArrayBuffer> {
  const info = await fetch(`${API}${token()}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const json = (await info.json()) as { ok: boolean; result?: { file_path: string } };

  if (!json.ok || !json.result) {
    throw new Error(`Telegram não devolveu o arquivo ${fileId}`);
  }

  const arquivo = await fetch(
    `https://api.telegram.org/file/bot${token()}/${json.result.file_path}`,
  );
  return arquivo.arrayBuffer();
}

/**
 * Registra o webhook no Telegram. Rode uma vez após o deploy (ou quando a URL mudar):
 *   npx tsx scripts/registrar-webhook.ts
 */
export async function registrarWebhook(urlPublica: string): Promise<unknown> {
  const resposta = await fetch(`${API}${token()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: `${urlPublica}/api/telegram/webhook`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  return resposta.json();
}
