import { prisma } from "@/lib/prisma";

/**
 * Banco de frases do Módulo 3 (globais + suas próprias). Usado nos lembretes
 * de tarefa/compromisso pra dar aquele empurrão junto com a cutucada.
 */
export async function sortearFrase(userId: string) {
  const frases = await prisma.frase.findMany({
    where: { ativa: true, OR: [{ userId: null }, { userId }] },
  });

  if (frases.length === 0) return null;
  return frases[Math.floor(Math.random() * frases.length)];
}
