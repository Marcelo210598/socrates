import { anthropic, MODELO_PADRAO } from "@/lib/ia/anthropic";

/**
 * Mensagem motivacional de 07:00 — vira imagem pro Telegram (e pro Marcelo
 * postar nas redes). Estoicismo, provérbios, bíblia, figuras históricas.
 *
 * Pedimos citações REAIS e bem conhecidas — nunca inventadas. Frase curta
 * de propósito: tem que caber bonita num cartão de imagem.
 */

export type MensagemMotivacional = {
  texto: string;
  autor: string;
  tema: string;
};

const FERRAMENTA = "gerar_mensagem_motivacional";

function schemaFerramenta() {
  return {
    name: FERRAMENTA,
    description: "Devolve uma citação curta e seu autor, prontos pra virar um cartão de imagem.",
    input_schema: {
      type: "object" as const,
      properties: {
        texto: {
          type: "string",
          description:
            "A citação em si, em português. Até ~200 caracteres — precisa caber bem numa " +
            "imagem quadrada. Se a citação original for longa, escolha o trecho mais forte.",
        },
        autor: {
          type: "string",
          description:
            "Quem disse — nome da pessoa (ex.: 'Marco Aurélio', 'Sêneca') ou referência " +
            "bíblica (ex.: 'Provérbios 16:3'). Nunca deixe vazio.",
        },
        tema: {
          type: "string",
          description: "Uma palavra/expressão curta pro tema: ex. 'disciplina', 'paciência', 'fé', 'coragem'.",
        },
      },
      required: ["texto", "autor", "tema"],
    },
  };
}

function promptSistema(evitar: string[]): string {
  return [
    "Você escolhe UMA citação real, verificável e bem conhecida — nunca inventa frase nem",
    "atribuição. Fontes possíveis: estoicismo (Marco Aurélio, Sêneca, Epicteto), provérbios",
    "bíblicos e outros trechos da Bíblia, e frases de figuras históricas amplamente reconhecidas",
    "por disciplina/superação/foco (ex.: Churchill, Lincoln, Mandela, Confúcio).",
    "",
    "Prioridade #1: precisão. Se não tiver certeza absoluta da citação e do autor exatos, escolha",
    "outra mais famosa e segura em vez de arriscar uma atribuição errada.",
    "",
    "O tom é sério e inspirador, sem jargão motivacional vazio — algo que um trader disciplinado",
    "leria de manhã antes de operar. Curta o suficiente pra virar um cartão de imagem elegante.",
    "",
    evitar.length > 0
      ? `Não repita nenhuma destas (já usadas recentemente): ${evitar.join(" | ")}`
      : "",
    "",
    "Sempre chame a ferramenta — nunca responda em texto solto.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function gerarMensagemMotivacional(params: {
  evitarTextos: string[];
}): Promise<MensagemMotivacional> {
  const resposta = await anthropic.messages.create({
    model: MODELO_PADRAO,
    max_tokens: 512,
    system: promptSistema(params.evitarTextos),
    messages: [
      {
        role: "user",
        content: "Gera a citação motivacional de hoje.",
      },
    ],
    tools: [schemaFerramenta()],
    tool_choice: { type: "tool", name: FERRAMENTA },
  });

  const bloco = resposta.content.find((b) => b.type === "tool_use");
  if (!bloco || bloco.type !== "tool_use") {
    throw new Error("A IA não devolveu a mensagem motivacional esperada.");
  }

  const bruto = bloco.input as Record<string, unknown>;

  if (typeof bruto.texto !== "string" || bruto.texto.trim().length === 0) {
    throw new Error("A IA não devolveu texto pra citação.");
  }

  return {
    texto: bruto.texto.trim(),
    autor: typeof bruto.autor === "string" && bruto.autor.trim() ? bruto.autor.trim() : "Anônimo",
    tema: typeof bruto.tema === "string" && bruto.tema.trim() ? bruto.tema.trim() : "disciplina",
  };
}
