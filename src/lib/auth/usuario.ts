import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Quem é o usuário da requisição.
 *
 * ⚠️ TEMPORÁRIO: enquanto o login (NextAuth + Google) não está configurado,
 * resolvemos sempre o mesmo usuário local — o dono definido em `ADMIN_EMAIL`,
 * criado na primeira vez que roda.
 *
 * O resto do código NUNCA deve assumir que existe um único usuário: todas as
 * consultas já filtram por `userId`. Quando o login entrar, só esta função muda.
 */

const EMAIL_DONO = process.env.ADMIN_EMAIL ?? "difoggijuniormarcelo@gmail.com";

export async function obterUsuarioAtual(): Promise<User> {
  const existente = await prisma.user.findUnique({ where: { email: EMAIL_DONO } });
  if (existente) return existente;

  return prisma.user.create({
    data: {
      email: EMAIL_DONO,
      nome: "Marcelo",
      preferencia: { create: {} },
    },
  });
}
