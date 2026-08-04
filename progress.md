# Sócrates — Progresso

## Última atualização: 04/08/2026

## 📌 Visão Geral

Assistente particular via Telegram (texto e áudio) + dashboard PWA. Cinco módulos: tarefas rotineiras, compromissos avulsos, motivacional, briefing de trader (NQ/MNQ) e gestão de contas Apex.

Stack: Next.js 16.3 + TypeScript + Tailwind v4 + Prisma + Neon PostgreSQL. Deploy planejado: Vercel (app) + Railway (agendador de cron).

**Status:** fundação 100%. **Módulos 1 (Tarefas) e 5 (Contas Apex) prontos na web.** Módulos 2, 3, 4: 0%. Rodando em `localhost:3000`.

## ✅ Concluído

- Projeto Next.js 16.3 + TypeScript + Tailwind v4
- Schema do Prisma cobrindo os 5 módulos, **multi-tenant** (`userId` em tudo)
- Tabelas criadas no Neon
- Seed idempotente: **8 regras Apex** (4 tamanhos × 2 tipos) + **20 frases** globais
- `src/lib/apex/motor.ts` — motor de cálculo puro: saldo, trailing drawdown, dias qualificados, consistência, meta diária, condições de saque
- `conferirRegra()` — valida a regra cadastrada e reporta se os números não fecham
- Home do app + barra de topo (validada em desktop e mobile)
- PWA: manifesto + ícones gerados pelo Next
- Esqueleto do webhook do Telegram com validação de `secret_token`
- `/api/saude` — diagnóstico de banco e chaves
- Repo git próprio — commit `4083e16`
- `tsc --noEmit` limpo, `eslint` limpo

### Módulo 1 — Tarefas rotineiras (04/08) ✅

- `src/lib/datas.ts` — fusos; `hojeNoFuso()` grava o dia de São Paulo como meia-noite UTC
- `src/lib/tarefas.ts` — regras puras: cai hoje?, listar do dia, marcar, descrever recorrência
- `src/app/tarefas/acoes.ts` — server actions com Zod (criar, marcar, arquivar)
- Lista com check otimista + formulário (recorrência diária / dias da semana / mensal, horário opcional)
- Barra de progresso do dia e badge de **atrasada** automático
- Home mostra o andamento real das tarefas
- Validado no navegador de ponta a ponta e conferido no banco

### Módulo 5 — Contas Apex (04/08) ✅

- `src/lib/apex/rotulos.ts` — textos de exibição dos enums
- `src/lib/apex/contas.ts` — liga o banco ao motor de cálculo: `regraVigente()`, `listarContasComDiagnostico()`, `criarConta()`, `lancarPregao()` (upsert por conta+dia), `registrarSaque()`, `sincronizarCache()`
- `/apex` — painel geral com estatísticas e cartões; `/apex/[id]` — detalhe com checklist das 5 condições, formulário de pregão, botão de saque, histórico
- Home ganhou o badge real de contas Apex
- **Validado ponta a ponta:** criou conta, lançou 5 pregões, a consistência bloqueou um dia desproporcional (89,3%) e depois liberou (47,2%), drawdown congelou certo, saque registrado
- **2 bugs achados e corrigidos no navegador:**
  1. Data de pregão aparecia um dia antes — `Intl.DateTimeFormat` sem `timeZone: "UTC"` explícito usa o fuso do processo (Brasil = UTC-3) e subtrai um dia de qualquer `@db.Date`. Corrigido com `diaCurto()` centralizado.
  2. Confirmação de saque podia mostrar o número errado (ex.: "#2" pra um saque gravado como #1) — o `revalidatePath` da server action atualiza a prop antes do `setFeito` aplicar. Corrigido capturando o número em estado local no início do fluxo.

## 🚧 Em progresso

- **Lista de comandos do bot apresentada, aguardando "pode ir" do Marcelo** (está detalhada em `historico/2026-08-03.md`)

## ⚠️ Problemas encontrados

- `create-next-app` recusa pasta com maiúscula ("Socrates") → criado em temp e movido
- `EACCES` no cache global do npm → `--cache` apontando pra pasta temporária
- npm 11.18 bloqueia install scripts; Prisma/esbuild precisam → `npm install-scripts approve` (gravado em `package.json#allowScripts`)
- Turbopack subia a raiz até a home → `turbopack.root` fixado no `next.config.ts`
- **Turbopack serviu CSS de versão antiga** e sumiu metade das classes do Tailwind → `rm -rf .next` e subir de novo. Diagnóstico: baixar o `.css` de `/_next/static/` e dar `grep` na classe

## 🔴 Pendente de confirmação — números da Apex

Pela mecânica da Apex, `Safety Net = saldoInicial + drawdown + 100`:

| Conta | Drawdown informado | Safety Net informado | Drawdown implícito | Fecha? |
|---|---|---|---|---|
| 25K | $2.000 | $26.100 | $1.000 | ❌ |
| 50K | $2.500 | $52.100 | $2.000 | ❌ |
| 100K | $3.000 | $103.100 | $3.000 | ✅ |
| 150K | $4.000 | $154.100 | $4.000 | ✅ |

**Ação:** conferir no dashboard da Apex o drawdown real da 25K e da 50K. Correção = editar `prisma/seed.ts` + `npm run db:seed`.

✅ Confirmado: consistência é **50%** pra contas compradas a partir de 01/03/2026 (anteriores: 30%).

## 🔧 Configurações importantes

`.env` (fora do git). Preenchido: `DATABASE_URL`, `DIRECT_URL` (Neon `neondb`, sa-east-1).

**Faltando:** `ANTHROPIC_API_KEY` (a do vida-de-trader só existe na Vercel), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `GROQ_API_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CRON_SECRET`.

Nenhum deles impede começar o Módulo 1.

## 📋 Próximos passos

**Todos dependem de chave agora:**

1. Criar o bot no @BotFather → `TELEGRAM_BOT_TOKEN`
2. **Módulo 2** — Compromissos (precisa de `ANTHROPIC_API_KEY` + `GROQ_API_KEY`)
3. **Módulo 3** — Motivacional
4. **Módulo 4** — Briefing (precisa de `ANTHROPIC_API_KEY`)

**Também pendente:**

5. Login (NextAuth + Google) pra aposentar o `obterUsuarioAtual()` temporário
6. Worker do Railway + deploy na Vercel

## 📚 Dependências principais

`next@16.3.0` · `react@19.2.8` · `prisma@6.19.3` · `@prisma/client@6.19.3` · `@anthropic-ai/sdk` · `next-auth@5 beta` · `zod@4` · `date-fns@4` · `tailwindcss@4`
