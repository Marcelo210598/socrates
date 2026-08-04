import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/auth/usuario";
import { extrairCompromisso } from "@/lib/ia/compromissos";
import { transcreverAudio } from "@/lib/ia/transcricao";

/**
 * Ponto único de entrada do Módulo 2: recebe texto OU áudio, devolve o
 * rascunho extraído — SEM salvar nada ainda. A confirmação (que persiste
 * de verdade) é uma server action separada (`confirmarCompromissoAction`),
 * chamada só depois que você aprova o rascunho na tela.
 *
 * Aceita FormData com o campo "texto" OU o campo "audio" (arquivo).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tamanho de áudio do Telegram/celular é pequeno; 15MB dá folga de sobra.
const TAMANHO_MAX_AUDIO = 15 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const arquivoAudio = form.get("audio");
  const textoDireto = form.get("texto");

  let texto: string | null = null;
  let transcricao: string | null = null;

  if (arquivoAudio instanceof File) {
    if (arquivoAudio.size > TAMANHO_MAX_AUDIO) {
      return NextResponse.json({ erro: "Áudio grande demais." }, { status: 413 });
    }
    try {
      transcricao = await transcreverAudio({
        bytes: await arquivoAudio.arrayBuffer(),
        nomeArquivo: arquivoAudio.name || "audio.m4a",
        mimeType: arquivoAudio.type || "audio/mp4",
      });
    } catch (erro) {
      console.error("[compromissos] transcrição falhou", erro);
      return NextResponse.json(
        { erro: "Não consegui entender o áudio. Tenta de novo ou manda por texto?" },
        { status: 502 },
      );
    }
    texto = transcricao;
  } else if (typeof textoDireto === "string") {
    texto = textoDireto;
  }

  if (!texto || texto.trim().length === 0) {
    return NextResponse.json({ erro: "Manda um texto ou um áudio." }, { status: 400 });
  }

  try {
    const usuario = await obterUsuarioAtual();
    const draft = await extrairCompromisso({
      texto,
      agora: new Date(),
      fuso: usuario.timezone,
    });

    return NextResponse.json({ texto, transcricao, draft });
  } catch (erro) {
    console.error("[compromissos] extração falhou", erro);
    return NextResponse.json(
      { erro: "Deu ruim aqui do meu lado pra entender isso. Tenta reformular?" },
      { status: 502 },
    );
  }
}
