import { anthropic, MODELO_PADRAO } from "@/lib/ia/anthropic";

/**
 * Extração de compromissos em linguagem natural — o cérebro do Módulo 2.
 *
 * Usa "tool use forçado": obrigamos o Claude a chamar uma ferramenta com
 * schema fixo, em vez de pedir "responda em JSON" e torcer pro formato vir
 * certo. É a forma confiável de tirar dado estruturado de texto livre.
 */

export type ExtracaoCompromisso = {
  titulo: string;
  /** "YYYY-MM-DD" ou null se não deu pra saber o dia. */
  data: string | null;
  /** "HH:mm" ou null se não foi mencionado horário. */
  hora: string | null;
  local: string | null;
  /** 0 a 1 — o quão confiante a IA está na extração. */
  confianca: number;
  /** true quando falta informação essencial e é melhor perguntar de volta. */
  ambiguo: boolean;
  /** Pergunta pra fazer de volta quando ambíguo (null se não for o caso). */
  pergunta: string | null;
};

const FERRAMENTA = "registrar_compromisso";

function schemaFerramenta() {
  return {
    name: FERRAMENTA,
    description:
      "Registra o compromisso extraído do texto do usuário, com data e hora já resolvidas " +
      "pro formato absoluto (não relativo).",
    input_schema: {
      type: "object" as const,
      properties: {
        titulo: {
          type: "string",
          description: "Do que se trata, de forma curta e direta. Ex.: 'Ligar pro João'.",
        },
        data: {
          type: ["string", "null"],
          description: "Data absoluta no formato YYYY-MM-DD. Null se não der pra saber.",
        },
        hora: {
          type: ["string", "null"],
          description: "Hora no formato HH:mm (24h). Null se não foi mencionado horário.",
        },
        local: {
          type: ["string", "null"],
          description: "Local do compromisso, se mencionado. Null caso contrário.",
        },
        confianca: {
          type: "number",
          description: "De 0 a 1, o quão confiante você está na extração.",
        },
        ambiguo: {
          type: "boolean",
          description:
            "true se falta título OU data pra ser útil, ou se o texto pode ter mais de uma leitura.",
        },
        pergunta: {
          type: ["string", "null"],
          description:
            "Se ambiguo=true, uma pergunta curta e direta pra esclarecer. Null caso contrário.",
        },
      },
      required: ["titulo", "data", "hora", "local", "confianca", "ambiguo", "pergunta"],
    },
  };
}

function promptSistema(agoraLocal: string, fuso: string): string {
  return [
    "Você é o Sócrates, um assistente particular que fala com o usuário de forma descontraída,",
    "tipo sócio — mas essa extração é interna, não é a mensagem que ele vai ler.",
    "",
    `Agora é ${agoraLocal} no fuso ${fuso}. Resolva TODA data/hora relativa ("amanhã",`,
    '"sexta que vem", "daqui a 2 horas", "hoje à noite") pra valores absolutos usando esse',
    "momento como referência. Semana começa na segunda. 'à noite' sem hora exata ~20:00,",
    "'de manhã' ~09:00, 'de tarde' ~15:00, 'meio-dia' 12:00 — só quando o usuário não deu hora",
    "exata.",
    "",
    "Marque ambiguo=true quando faltar título claro OU data (mesmo que relativa), ou quando",
    "o texto puder ser lido de mais de um jeito. Nesses casos, escreva uma `pergunta` curta,",
    "no mesmo tom descontraído, pra confirmar com o usuário.",
    "",
    "Sempre chame a ferramenta — nunca responda em texto solto.",
  ].join("\n");
}

export async function extrairCompromisso(params: {
  texto: string;
  agora: Date;
  fuso: string;
}): Promise<ExtracaoCompromisso> {
  const agoraLocal = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: params.fuso,
  }).format(params.agora);

  const resposta = await anthropic.messages.create({
    model: MODELO_PADRAO,
    max_tokens: 1024,
    system: promptSistema(agoraLocal, params.fuso),
    messages: [{ role: "user", content: params.texto }],
    tools: [schemaFerramenta()],
    tool_choice: { type: "tool", name: FERRAMENTA },
  });

  const blocoFerramenta = resposta.content.find((b) => b.type === "tool_use");
  if (!blocoFerramenta || blocoFerramenta.type !== "tool_use") {
    throw new Error("A IA não devolveu a extração esperada.");
  }

  // O schema já obriga o formato; ainda assim validamos o essencial na mão
  // (não vale a pena puxar Zod só pra isso — é um objeto simples e interno).
  const bruto = blocoFerramenta.input as Record<string, unknown>;

  if (typeof bruto.titulo !== "string" || bruto.titulo.trim().length === 0) {
    throw new Error("A IA não conseguiu identificar um título.");
  }

  return {
    titulo: bruto.titulo.trim(),
    data: typeof bruto.data === "string" ? bruto.data : null,
    hora: typeof bruto.hora === "string" ? bruto.hora : null,
    local: typeof bruto.local === "string" ? bruto.local : null,
    confianca: typeof bruto.confianca === "number" ? bruto.confianca : 0.5,
    ambiguo: bruto.ambiguo === true || !bruto.data,
    pergunta: typeof bruto.pergunta === "string" ? bruto.pergunta : null,
  };
}
