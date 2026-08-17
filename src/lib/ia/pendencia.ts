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
      /** BAIXA/MEDIA/ALTA se você mencionou; null = não falou nada (vira MEDIA por padrão). */
      importancia: "BAIXA" | "MEDIA" | "ALTA" | null;
      confianca: number;
      ambiguo: boolean;
      pergunta: string | null;
    }
  | {
      tipo: "consulta";
      /** O que você quer ver. */
      alvo: "tarefas" | "compromissos" | "tudo";
      /** Só "hoje" e "amanha" por enquanto — cobre o uso real no Telegram. */
      dia: "hoje" | "amanha";
      confianca: number;
      ambiguo: boolean;
      pergunta: string | null;
    };

const FERRAMENTA = "registrar_pendencia";

function schemaFerramenta() {
  return {
    name: FERRAMENTA,
    description:
      "Registra a pendência extraída do texto: uma TAREFA que repete (rotina), um " +
      "COMPROMISSO pontual (acontece uma vez, com data e talvez hora), ou uma CONSULTA " +
      "(você só quer ver o que já tem marcado, não criar nada novo).",
    input_schema: {
      type: "object" as const,
      properties: {
        tipo: {
          type: "string",
          enum: ["tarefa", "compromisso", "consulta"],
          description:
            "'tarefa' quando o texto fala de algo que se repete (todo dia, toda segunda, " +
            "todo mês). 'compromisso' quando é pontual — acontece numa data específica, " +
            "mesmo que sem hora marcada (ex.: 'revisar o PDF hoje', 'ligar pro João amanhã'). " +
            "'consulta' quando o usuário está PERGUNTANDO o que ele já tem marcado, não pedindo " +
            "pra criar algo novo — ex.: 'quais meus compromissos de hoje?', 'o que tenho amanhã?', " +
            "'me passa minhas tarefas', 'liste meus compromissos'.",
        },
        titulo: {
          type: "string",
          description:
            "Do que se trata, curto e direto. Ex.: 'Treinar academia'. Só quando tipo=tarefa ou " +
            "tipo=compromisso — quando tipo=consulta, use string vazia.",
        },
        recorrencia: {
          type: ["string", "null"],
          enum: ["DIARIA", "DIAS_SEMANA", "MENSAL", null],
          description: "Só quando tipo=tarefa. Null nos outros casos.",
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
        importancia: {
          type: ["string", "null"],
          enum: ["BAIXA", "MEDIA", "ALTA", null],
          description:
            "Só quando tipo=compromisso. Preencha só se o usuário DISSE algo sobre prioridade/" +
            "importância/urgência (ex.: 'isso é importante', 'prioridade alta', 'não é urgente' " +
            "→ BAIXA). Se não falou nada sobre isso, null (vira média por padrão).",
        },
        alvo: {
          type: ["string", "null"],
          enum: ["tarefas", "compromissos", "tudo", null],
          description:
            "Só quando tipo=consulta. 'tarefas' se perguntou só sobre tarefas/rotina, " +
            "'compromissos' se só sobre compromissos, 'tudo' se pediu um resumo geral " +
            "('o que eu tenho hoje?') ou não especificou. Null nos outros tipos.",
        },
        dia: {
          type: ["string", "null"],
          enum: ["hoje", "amanha", null],
          description:
            "Só quando tipo=consulta. Qual dia ele quer ver — 'hoje' se não especificou. " +
            "Null nos outros tipos.",
        },
        confianca: {
          type: "number",
          description: "De 0 a 1, o quão confiante você está na extração.",
        },
        ambiguo: {
          type: "boolean",
          description:
            "true se faltar título claro (quando tipo=tarefa/compromisso), ou se não der pra " +
            "saber entre tarefa/compromisso/consulta, ou se a recorrência ficou vaga (ex.: 'de " +
            "vez em quando').",
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
        "importancia",
        "alvo",
        "dia",
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
    "mas data continua obrigatória: usa hoje se não foi dito outro dia). Decida tipo='consulta'",
    "quando o usuário só quer SABER o que já tem marcado — não está pedindo pra criar nada",
    "('quais meus compromissos de hoje?', 'o que tenho amanhã?', 'me passa minhas tarefas',",
    "'liste', 'tenho algo marcado?'). Isso é diferente de criar: se ele descreve um evento novo",
    "(com título, ainda que vago), é compromisso/tarefa, não consulta.",
    "",
    "Marque ambiguo=true quando faltar título claro (em tarefa/compromisso), ou não der pra saber",
    "entre tarefa/compromisso/consulta, ou a recorrência for vaga demais ('de vez em quando',",
    "'quando der'). Nesses casos escreva uma `pergunta` curta, tom descontraído, pra confirmar",
    "com o usuário.",
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

  const confianca = typeof bruto.confianca === "number" ? bruto.confianca : 0.5;
  const ambiguo = bruto.ambiguo === true;
  const pergunta = typeof bruto.pergunta === "string" ? bruto.pergunta : null;

  if (bruto.tipo === "consulta") {
    const alvo =
      bruto.alvo === "tarefas" || bruto.alvo === "compromissos" || bruto.alvo === "tudo"
        ? bruto.alvo
        : "tudo";
    const dia = bruto.dia === "amanha" ? "amanha" : "hoje";

    return { tipo: "consulta", alvo, dia, confianca, ambiguo, pergunta };
  }

  if (typeof bruto.titulo !== "string" || bruto.titulo.trim().length === 0) {
    throw new Error("A IA não conseguiu identificar um título.");
  }

  const titulo = bruto.titulo.trim();

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
  const importancia =
    bruto.importancia === "BAIXA" || bruto.importancia === "MEDIA" || bruto.importancia === "ALTA"
      ? bruto.importancia
      : null;

  return {
    tipo: "compromisso",
    titulo,
    data: typeof bruto.data === "string" ? bruto.data : new Date().toISOString().slice(0, 10),
    hora: typeof bruto.hora === "string" ? bruto.hora : null,
    local: typeof bruto.local === "string" ? bruto.local : null,
    importancia,
    confianca,
    ambiguo,
    pergunta,
  };
}
