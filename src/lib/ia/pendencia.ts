import { anthropic, MODELO_PADRAO } from "@/lib/ia/anthropic";

/**
 * Extração unificada de "pendência" — o que você mandou vira Tarefa (repete)
 * ou Compromisso (pontual)? Uma chamada só decide os dois: mais barato e mais
 * confiável do que classificar e depois extrair em duas etapas.
 *
 * Mesma técnica do Módulo 2 (`extrairCompromisso`): tool-use forçado.
 */

export type ExtracaoPendencia =
  | {
      tipo: "tarefa";
      titulo: string;
      recorrencia: "DIARIA" | "DIAS_SEMANA" | "MENSAL";
      /** 0 = domingo … 6 = sábado. Só quando recorrencia = DIAS_SEMANA. */
      diasSemana: number[];
      /** 1-31. Só quando recorrencia = MENSAL. */
      diaDoMes: number | null;
      /** "HH:mm" ou null = qualquer hora do dia. */
      horaAlvo: string | null;
      confianca: number;
      ambiguo: boolean;
      pergunta: string | null;
    }
  | {
      tipo: "compromisso";
      titulo: string;
      /** "YYYY-MM-DD" — sempre resolvida (nunca null; hoje se não ficou claro). */
      data: string;
      /** "HH:mm" ou null se você não deu horário. */
      hora: string | null;
      local: string | null;
      confianca: number;
      ambiguo: boolean;
      pergunta: string | null;
    };

const FERRAMENTA = "registrar_pendencia";

function schemaFerramenta() {
  return {
    name: FERRAMENTA,
    description:
      "Registra a pendência extraída do texto: uma TAREFA que repete (rotina) ou um " +
      "COMPROMISSO pontual (acontece uma vez, com data e talvez hora).",
    input_schema: {
      type: "object" as const,
      properties: {
        tipo: {
          type: "string",
          enum: ["tarefa", "compromisso"],
          description:
            "'tarefa' quando o texto fala de algo que se repete (todo dia, toda segunda, " +
            "todo mês). 'compromisso' quando é pontual — acontece numa data específica, " +
            "mesmo que sem hora marcada (ex.: 'revisar o PDF hoje', 'ligar pro João amanhã').",
        },
        titulo: {
          type: "string",
          description: "Do que se trata, curto e direto. Ex.: 'Treinar academia'.",
        },
        recorrencia: {
          type: ["string", "null"],
          enum: ["DIARIA", "DIAS_SEMANA", "MENSAL", null],
          description: "Só quando tipo=tarefa. Null quando tipo=compromisso.",
        },
        diasSemana: {
          type: "array",
          items: { type: "number" },
          description:
            "Só quando recorrencia=DIAS_SEMANA. 0=domingo...6=sábado. Array vazio caso contrário.",
        },
        diaDoMes: {
          type: ["number", "null"],
          description: "Só quando recorrencia=MENSAL (1-31). Null caso contrário.",
        },
        horaAlvo: {
          type: ["string", "null"],
          description: "Só quando tipo=tarefa. 'HH:mm' (24h) ou null = qualquer hora do dia.",
        },
        data: {
          type: ["string", "null"],
          description:
            "Só quando tipo=compromisso. Data absoluta YYYY-MM-DD, já resolvida (relativa " +
            "tipo 'amanhã' vira data real). Se não ficou claro qual dia, usa hoje.",
        },
        hora: {
          type: ["string", "null"],
          description: "Só quando tipo=compromisso. 'HH:mm' (24h) ou null se não mencionou hora.",
        },
        local: {
          type: ["string", "null"],
          description: "Só quando tipo=compromisso e o local foi mencionado. Null caso contrário.",
        },
        confianca: {
          type: "number",
          description: "De 0 a 1, o quão confiante você está na extração.",
        },
        ambiguo: {
          type: "boolean",
          description:
            "true se faltar título claro, ou se não der pra saber se é tarefa ou compromisso, " +
            "ou se a recorrência ficou vaga (ex.: 'de vez em quando').",
        },
        pergunta: {
          type: ["string", "null"],
          description: "Se ambiguo=true, uma pergunta curta pra esclarecer. Null caso contrário.",
        },
      },
      required: [
        "tipo",
        "titulo",
        "recorrencia",
        "diasSemana",
        "diaDoMes",
        "horaAlvo",
        "data",
        "hora",
        "local",
        "confianca",
        "ambiguo",
        "pergunta",
      ],
    },
  };
}

function promptSistema(agoraLocal: string, fuso: string): string {
  return [
    "Você é o Sócrates, um assistente particular que fala com o usuário tipo sócio — mas essa",
    "extração é interna, não é a mensagem que ele vai ler.",
    "",
    `Agora é ${agoraLocal} no fuso ${fuso}. Resolva TODA data/hora relativa ("amanhã",`,
    '"sexta que vem", "hoje à noite") pra valores absolutos usando esse momento como',
    "referência. Semana começa na segunda. 'à noite' sem hora exata ~20:00, 'de manhã' ~09:00,",
    "'de tarde' ~15:00, 'meio-dia' 12:00 — só quando o usuário não deu hora exata.",
    "",
    "Decida tipo='tarefa' quando o texto indicar repetição (todo dia, toda segunda e quarta,",
    "todo mês, de segunda a sexta). Decida tipo='compromisso' pra tudo que é de uma vez só —",
    "inclusive coisas sem hora marcada tipo 'revisar contrato hoje' (nesse caso hora=null,",
    "mas data continua obrigatória: usa hoje se não foi dito outro dia).",
    "",
    "Marque ambiguo=true quando faltar título claro, ou não der pra saber tarefa vs compromisso,",
    "ou a recorrência for vaga demais ('de vez em quando', 'quando der'). Nesses casos escreva",
    "uma `pergunta` curta, tom descontraído, pra confirmar com o usuário.",
    "",
    "Sempre chame a ferramenta — nunca responda em texto solto.",
  ].join("\n");
}

export async function extrairPendencia(params: {
  texto: string;
  agora: Date;
  fuso: string;
}): Promise<ExtracaoPendencia> {
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

  const bloco = resposta.content.find((b) => b.type === "tool_use");
  if (!bloco || bloco.type !== "tool_use") {
    throw new Error("A IA não devolveu a extração esperada.");
  }

  const bruto = bloco.input as Record<string, unknown>;

  if (typeof bruto.titulo !== "string" || bruto.titulo.trim().length === 0) {
    throw new Error("A IA não conseguiu identificar um título.");
  }

  const titulo = bruto.titulo.trim();
  const confianca = typeof bruto.confianca === "number" ? bruto.confianca : 0.5;
  const ambiguo = bruto.ambiguo === true;
  const pergunta = typeof bruto.pergunta === "string" ? bruto.pergunta : null;

  if (bruto.tipo === "tarefa") {
    const recorrencia =
      bruto.recorrencia === "DIARIA" || bruto.recorrencia === "DIAS_SEMANA" || bruto.recorrencia === "MENSAL"
        ? bruto.recorrencia
        : "DIARIA";

    return {
      tipo: "tarefa",
      titulo,
      recorrencia,
      diasSemana: Array.isArray(bruto.diasSemana)
        ? bruto.diasSemana.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
        : [],
      diaDoMes: typeof bruto.diaDoMes === "number" ? bruto.diaDoMes : null,
      horaAlvo: typeof bruto.horaAlvo === "string" ? bruto.horaAlvo : null,
      confianca,
      ambiguo: ambiguo || (recorrencia === "DIAS_SEMANA" && !Array.isArray(bruto.diasSemana)),
      pergunta,
    };
  }

  // Padrão: compromisso. Data sempre presente (a IA deve resolver "hoje" quando vago).
  return {
    tipo: "compromisso",
    titulo,
    data: typeof bruto.data === "string" ? bruto.data : new Date().toISOString().slice(0, 10),
    hora: typeof bruto.hora === "string" ? bruto.hora : null,
    local: typeof bruto.local === "string" ? bruto.local : null,
    confianca,
    ambiguo,
    pergunta,
  };
}
