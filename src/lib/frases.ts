import { CategoriaFrase } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Banco de frases do Módulo 3 (globais + suas próprias). Usado nos lembretes
 * de tarefa/compromisso pra dar aquele empurrão junto com a cutucada.
 */

// Presença de qualquer uma dessas palavras no título = contexto de trading.
// Heurística por palavra-chave: sem custo, sem chamada de IA extra.
const PALAVRAS_TRADING = [
  "trade",
  "trading",
  "pregão",
  "pregao",
  "operar",
  "operação",
  "operacao",
  "opera ",
  "apex",
  "mercado",
  "day trade",
  "daytrade",
  "backtest",
  "drawdown",
  "saque",
  " nq",
  " mnq",
];

/** Categorias preferidas pro contexto de um título — trading puxa TRADING, o resto é motivacional geral. */
function categoriasDoContexto(titulo: string): CategoriaFrase[] {
  const alvo = ` ${titulo.toLowerCase()} `;
  const ehTrading = PALAVRAS_TRADING.some((palavra) => alvo.includes(palavra));
  return ehTrading ? [CategoriaFrase.TRADING] : [CategoriaFrase.BIBLICA, CategoriaFrase.PENSADOR];
}

/**
 * Sorteia uma frase ativa (globais + suas próprias). Se `contexto` (o título
 * da tarefa/compromisso) for passado, tenta primeiro dentro da categoria que
 * combina com ele — cai pro pool inteiro se essa categoria estiver vazia,
 * pra nunca ficar sem frase nenhuma.
 */
export async function sortearFrase(userId: string, contexto?: string) {
  const frases = await prisma.frase.findMany({
    where: { ativa: true, OR: [{ userId: null }, { userId }] },
  });

  if (frases.length === 0) return null;

  if (contexto) {
    const categorias = categoriasDoContexto(contexto);
    const combinam = frases.filter((f) => categorias.includes(f.categoria));
    if (combinam.length > 0) return combinam[Math.floor(Math.random() * combinam.length)];
  }

  return frases[Math.floor(Math.random() * frases.length)];
}
