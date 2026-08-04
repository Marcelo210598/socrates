import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma.
 *
 * Em desenvolvimento o Next recarrega os módulos a cada alteração; sem este
 * cache no `globalThis` abriríamos uma conexão nova a cada reload e estouraríamos
 * o limite do Neon em poucos minutos.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
