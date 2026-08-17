"use client";

import { useRef, useState, useTransition } from "react";
import { Importancia, OrigemEntrada } from "@prisma/client";
import { confirmarCompromissoAction } from "@/app/compromissos/acoes";
import { dataParaInput, hojeNoFuso } from "@/lib/datas";

type Draft = {
  titulo: string;
  data: string; // "" se a IA não soube dizer
  hora: string; // "" se não foi mencionado
  local: string;
  importancia: Importancia;
  ambiguo: boolean;
  pergunta: string | null;
  textoOriginal: string | null;
  transcricao: string | null;
};

type RespostaInterpretar = {
  texto: string;
  transcricao: string | null;
  draft: {
    titulo: string;
    data: string | null;
    hora: string | null;
    local: string | null;
    confianca: number;
    ambiguo: boolean;
    pergunta: string | null;
  };
};

export function NovoCompromisso({ fuso }: { fuso: string }) {
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [processandoAudio, setProcessandoAudio] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, iniciarTransicao] = useTransition();

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  function reiniciar() {
    setTexto("");
    setDraft(null);
    setErro(null);
    setSalvo(false);
  }

  async function processar(form: FormData, ehAudio: boolean) {
    setProcessando(true);
    setProcessandoAudio(ehAudio);
    setErro(null);
    setSalvo(false);

    try {
      const resposta = await fetch("/api/compromissos/interpretar", {
        method: "POST",
        body: form,
      });
      const json = (await resposta.json()) as RespostaInterpretar & { erro?: string };

      if (!resposta.ok) {
        setErro(json.erro ?? "Não consegui processar.");
        return;
      }

      setDraft({
        titulo: json.draft.titulo,
        data: json.draft.data ?? dataParaInput(hojeNoFuso(fuso)),
        hora: json.draft.hora ?? "",
        local: json.draft.local ?? "",
        importancia: Importancia.MEDIA,
        ambiguo: json.draft.ambiguo,
        pergunta: json.draft.pergunta,
        textoOriginal: json.texto,
        transcricao: json.transcricao,
      });
    } catch {
      setErro("Falha de conexão. Tenta de novo?");
    } finally {
      setProcessando(false);
      setProcessandoAudio(false);
    }
  }

  function enviarTexto() {
    if (!texto.trim()) return;
    const form = new FormData();
    form.append("texto", texto);
    processar(form, false);
  }

  async function iniciarGravacao() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(stream);
      pedacosRef.current = [];

      gravador.ondataavailable = (e) => {
        if (e.data.size > 0) pedacosRef.current.push(e.data);
      };

      gravador.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "gravacao.webm");
        processar(form, true);
      };

      gravador.start();
      gravadorRef.current = gravador;
      setGravando(true);
    } catch {
      setErro("Não consegui acessar o microfone. Confere a permissão do navegador.");
    }
  }

  function pararGravacao() {
    gravadorRef.current?.stop();
    setGravando(false);
  }

  function confirmar() {
    if (!draft) return;
    if (!draft.titulo.trim() || !draft.data) {
      setErro("Preciso pelo menos do título e da data.");
      return;
    }

    iniciarTransicao(async () => {
      const r = await confirmarCompromissoAction({
        titulo: draft.titulo,
        data: draft.data,
        hora: draft.hora || null,
        local: draft.local || null,
        // Só o bot do Telegram grava TELEGRAM_TEXTO/TELEGRAM_AUDIO; aqui é sempre WEB,
        // com ou sem áudio (a transcrição fica registrada em `transcricao` de qualquer jeito).
        origem: OrigemEntrada.WEB,
        importancia: draft.importancia,
        textoOriginal: draft.textoOriginal,
        transcricao: draft.transcricao,
      });

      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      setSalvo(true);
      setTimeout(reiniciar, 1400);
    });
  }

  // --- Card de revisão (depois que a IA já processou) ---
  if (draft) {
    return (
      <div className="space-y-4 rounded-2xl border border-borda bg-superficie p-5">
        {draft.transcricao && (
          <p className="rounded-xl bg-superficie-alta px-3 py-2 text-sm text-texto-fraco italic">
            🎙️ &ldquo;{draft.transcricao}&rdquo;
          </p>
        )}

        {draft.ambiguo && draft.pergunta && (
          <p className="rounded-xl border border-atencao/40 bg-atencao/10 px-3 py-2 text-sm text-atencao">
            {draft.pergunta}
          </p>
        )}

        <div>
          <label htmlFor="nc-titulo" className="mb-1.5 block text-sm font-medium">
            Título
          </label>
          <input
            id="nc-titulo"
            value={draft.titulo}
            onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
            className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="nc-data" className="mb-1.5 block text-sm font-medium">
              Data
            </label>
            <input
              id="nc-data"
              type="date"
              value={draft.data}
              onChange={(e) => setDraft({ ...draft, data: e.target.value })}
              className="rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
            />
          </div>
          <div>
            <label htmlFor="nc-hora" className="mb-1.5 block text-sm font-medium">
              Hora <span className="font-normal text-texto-fraco">(opcional)</span>
            </label>
            <input
              id="nc-hora"
              type="time"
              value={draft.hora}
              onChange={(e) => setDraft({ ...draft, hora: e.target.value })}
              className="rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
            />
          </div>
        </div>

        <div>
          <label htmlFor="nc-local" className="mb-1.5 block text-sm font-medium">
            Local <span className="font-normal text-texto-fraco">(opcional)</span>
          </label>
          <input
            id="nc-local"
            value={draft.local}
            onChange={(e) => setDraft({ ...draft, local: e.target.value })}
            className="w-full rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
          />
        </div>

        <div>
          <label htmlFor="nc-importancia" className="mb-1.5 block text-sm font-medium">
            Importância
          </label>
          <select
            id="nc-importancia"
            value={draft.importancia}
            onChange={(e) => setDraft({ ...draft, importancia: e.target.value as Importancia })}
            className="rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none focus:border-marca"
          >
            <option value={Importancia.BAIXA}>🟢 Baixa</option>
            <option value={Importancia.MEDIA}>🟡 Média</option>
            <option value={Importancia.ALTA}>🔴 Alta</option>
          </select>
        </div>

        {erro && <p className="text-sm text-negativo">{erro}</p>}
        {salvo && <p className="text-sm text-positivo">Agendado ✅</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmar}
            disabled={salvando || salvo}
            className="rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? "Salvando…" : "✅ Confirmar"}
          </button>
          <button
            type="button"
            onClick={reiniciar}
            disabled={salvando}
            className="rounded-xl px-4 py-2.5 text-sm text-texto-fraco transition-colors hover:text-texto"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // --- Caixa de entrada (texto ou áudio) ---
  return (
    <div className="space-y-3 rounded-2xl border border-borda bg-superficie p-5">
      <label htmlFor="nc-texto" className="block text-sm font-medium">
        Fala comigo
      </label>
      <textarea
        id="nc-texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex.: marca pra eu ligar pro João amanhã às 15h"
        rows={2}
        disabled={gravando || processando}
        className="w-full resize-none rounded-xl border border-borda bg-fundo px-3.5 py-2.5 outline-none placeholder:text-texto-fraco/60 focus:border-marca disabled:opacity-50"
      />

      {erro && <p className="text-sm text-negativo">{erro}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={enviarTexto}
          disabled={!texto.trim() || processando || gravando}
          className="rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {processando && !gravando ? "Pensando…" : "Enviar"}
        </button>

        <button
          type="button"
          onClick={gravando ? pararGravacao : iniciarGravacao}
          disabled={processando && !gravando}
          aria-pressed={gravando}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            gravando
              ? "bg-negativo text-white"
              : "border border-borda text-texto-fraco hover:text-texto"
          }`}
        >
          {gravando ? "⏹ Parar" : "🎙️ Gravar"}
        </button>

        {gravando && (
          <span className="text-sm text-negativo">
            <span className="animate-pulse">●</span> gravando
          </span>
        )}
        {processandoAudio && <span className="text-sm text-texto-fraco">Transcrevendo…</span>}
      </div>
    </div>
  );
}
