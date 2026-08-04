# Sócrates — Progresso

## Última atualização: 03/08/2026

## 📌 Visão Geral

Assistente particular via Telegram + dashboard PWA. Cinco módulos: tarefas rotineiras, compromissos avulsos, motivacional, briefing de trader (NQ/MNQ) e gestão de contas Apex.

Stack: Next.js 16 + TypeScript + Tailwind v4 + Prisma + Neon PostgreSQL. Deploy planejado: Vercel (app) + Railway (agendador de cron).

**Status:** fundação no ar, rodando em `localhost:3000`. Nenhum módulo implementado ainda.

## ✅ Concluído

- Projeto Next.js 16 + TypeScript + Tailwind v4 criado
- Schema do Prisma cobrindo os 5 módulos, **multi-tenant** (`userId` em tudo)
- Tabelas criadas no Neon (`prisma db push`)
- Seed idempotente: **8 regras Apex** (4 tamanhos × 2 tipos) + **20 frases** globais
- `src/lib/apex/motor.ts` — motor de cálculo puro: saldo, trailing drawdown, dias qualificados, consistência, meta diária, condições de saque
- `conferirRegra()` — valida a própria regra cadastrada e grita se os números não fecham
- Dashboard lendo do banco, mobile-first, tema escuro
- PWA: manifesto + ícones gerados pelo Next (`icon.tsx` / `apple-icon.tsx`)
- Esqueleto do webhook do Telegram, com validação de `secret_token`
- `/api/saude` — diagnóstico de banco e chaves configuradas

## 🚧 Em progresso

- Definir a lista de comandos/fluxos do bot (aguardando aprovação do Marcelo)

## ⚠️ Problemas encontrados

- **`create-next-app` recusa pasta com maiúscula** ("Socrates"). Criado em pasta temporária e movido.
- **Cache global do npm sem permissão** (`EACCES` em `~/.npm/_cacache`). Contornado com `--cache` apontando pra pasta temporária.
- **npm 11.18 bloqueia install scripts por padrão.** Prisma/esbuild precisam deles → `npm install-scripts approve` (gravado em `package.json#allowScripts`).
- **Números da Apex não fecham pra 25K e 50K** (ver abaixo). Não bloqueia nada, mas precisa ser confirmado antes de operar de verdade.

## 🔴 Pendente de confirmação — números da Apex

Pela mecânica da Apex, `Safety Net = saldoInicial + drawdown + 100`. Nos valores cadastrados:

| Conta | Drawdown informado | Safety Net informado | Drawdown implícito | Fecha? |
|---|---|---|---|---|
| 25K | $2.000 | $26.100 | $1.000 | ❌ |
| 50K | $2.500 | $52.100 | $2.000 | ❌ |
| 100K | $3.000 | $103.100 | $3.000 | ✅ |
| 150K | $4.000 | $154.100 | $4.000 | ✅ |

**Ação:** Marcelo confere no dashboard da Apex qual é o drawdown real das contas 25K e 50K (EOD e Intraday são diferentes). Correção = editar `prisma/seed.ts` e rodar `npm run db:seed`.

## 🔧 Configurações importantes

`.env` (fora do git). Já preenchido: `DATABASE_URL`, `DIRECT_URL` (Neon).

Faltando: `ANTHROPIC_API_KEY` (está só na Vercel do Vida de Trader), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `GROQ_API_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CRON_SECRET`.

## 📋 Próximos passos

1. Aprovar a lista de comandos/fluxos do bot
2. Login no dashboard (NextAuth + Google) e vínculo `telegramId` → `User`
3. **Módulo 1** — Tarefas rotineiras (o mais simples; estabelece o padrão)
4. **Módulo 2** — Compromissos (IA + transcrição de áudio)
5. **Módulo 3** — Motivacional
6. **Módulo 5** — Contas Apex
7. **Módulo 4** — Briefing
8. Worker do Railway (agendador) + deploy na Vercel

## 📚 Dependências principais

`next@16.3.0` · `react@19.2.8` · `prisma@6.19.3` · `@prisma/client@6.19.3` · `@anthropic-ai/sdk` · `next-auth@5 beta` · `zod@4` · `date-fns@4` · `tailwindcss@4`
