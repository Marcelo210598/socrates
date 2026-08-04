/**
 * Transcrição de áudio via Groq (Whisper large v3).
 *
 * A Claude API não processa áudio — por isso o Groq entra só nessa etapa:
 * transforma a fala em texto, e o texto segue pro `extrairCompromisso`.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function transcreverAudio(params: {
  bytes: ArrayBuffer;
  nomeArquivo: string;
  mimeType: string;
}): Promise<string> {
  const chave = process.env.GROQ_API_KEY;
  if (!chave) throw new Error("GROQ_API_KEY não configurada.");

  const form = new FormData();
  form.append("file", new Blob([params.bytes], { type: params.mimeType }), params.nomeArquivo);
  form.append("model", "whisper-large-v3");
  form.append("language", "pt");
  form.append("response_format", "text");

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}` },
    body: form,
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`Groq recusou a transcrição (${resposta.status}): ${detalhe.slice(0, 300)}`);
  }

  const texto = await resposta.text();
  return texto.trim();
}
