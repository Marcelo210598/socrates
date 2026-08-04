import Anthropic from "@anthropic-ai/sdk";

/** Singleton do cliente Claude — mesmo motivo do Prisma: não recriar a cada import. */
const globalParaAnthropic = globalThis as unknown as { anthropic: Anthropic | undefined };

export const anthropic =
  globalParaAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalParaAnthropic.anthropic = anthropic;
}

export const MODELO_PADRAO = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
