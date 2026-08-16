import { AguardandoSessao } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Memória curta da conversa no Telegram — um único "tô esperando sua próxima
 * mensagem pra X" por usuário. Hoje só usado pelo reagendar de compromisso
 * ("pra quando?" → sua resposta livre resolve a nova data/hora).
 */

export async function definirSessao(
  userId: string,
  aguardando: AguardandoSessao,
  refId: string | null = null,
): Promise<void> {
  await prisma.sessaoTelegram.upsert({
    where: { userId },
    update: { aguardando, refId },
    create: { userId, aguardando, refId },
  });
}

export async function obterSessao(userId: string) {
  return prisma.sessaoTelegram.findUnique({ where: { userId } });
}

export async function limparSessao(userId: string): Promise<void> {
  await prisma.sessaoTelegram.upsert({
    where: { userId },
    update: { aguardando: AguardandoSessao.NENHUM, refId: null },
    create: { userId, aguardando: AguardandoSessao.NENHUM, refId: null },
  });
}
