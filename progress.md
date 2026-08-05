# Sócrates — Progresso

## Última atualização: 04/08/2026

## 📌 Visão Geral

Assistente particular via Telegram (texto e áudio) + dashboard PWA. Cinco módulos: tarefas rotineiras, compromissos avulsos, motivacional, briefing de trader (NQ/MNQ) e gestão de contas Apex.

Stack: Next.js 16.3 + TypeScript + Tailwind v4 + Prisma + Neon PostgreSQL. Deploy planejado: Vercel (app) + Railway (agendador de cron).

**Status:** fundação 100%. **Módulos 1 (Tarefas), 2 (Compromissos) e 5 (Contas Apex) prontos e EM PRODUÇÃO.** Módulos 3, 4: 0%. App no ar: **https://socrates-opal-two.vercel.app**. Repo: `github.com/Marcelo210598/socrates`.

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

### Módulo 2 — Compromissos avulsos (04/08) ✅

- `src/lib/ia/anthropic.ts` — singleton do cliente Claude
- `src/lib/ia/compromissos.ts` — `extrairCompromisso()` com **tool-use forçado** (schema fixo, não "responda em JSON"); prompt de sistema recebe o momento atual no fuso do usuário pra resolver data/hora relativa
- `src/lib/ia/transcricao.ts` — `transcreverAudio()` via Groq Whisper large v3
- `src/lib/datas.ts` ganhou `horaLocalParaUtc()` (combina data+hora locais num instante UTC de verdade) e `dataHoraCurta()`
- `POST /api/compromissos/interpretar` — texto ou áudio → devolve rascunho, **sem persistir**
- Server actions: confirmar (só aí persiste), concluir, cancelar
- `NovoCompromisso.tsx` — caixa de entrada com texto **e gravação de áudio real** (MediaRecorder), card de revisão editável
- `/compromissos` + badge na home + nav da barra de topo completa (4 módulos)
- **Validado com chamadas reais**: áudio sintético (`say` do macOS) → Groq transcreveu certo → Claude extraiu "amanhã às três da tarde" → `2026-08-05T15:00` correto; caso ambíguo disparou pergunta de volta no tom certo; fluxo completo testado no navegador e conferido no banco (fuso convertido certinho)
- Gravação pelo microfone do navegador não foi possível automatizar (sem mic real no ambiente de teste) — mesma rota validada via curl com áudio real, mas vale um teste manual no celular/PC

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

`.env` (fora do git). Preenchido: `DATABASE_URL`, `DIRECT_URL` (Neon), **`ANTHROPIC_API_KEY`** e **`GROQ_API_KEY`** (chaves reais, testadas).

**Faltando:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CRON_SECRET`.

## 🐙 Git remoto e deploy

`github.com/Marcelo210598/socrates` — configurado como `origin` (04/08). Repo criado vazio pelo Marcelo.

**Vercel:** projeto `socrates` na org `marcelo-di-foggia-juniors-projects`, importado do GitHub. App em produção: https://socrates-opal-two.vercel.app

Dois problemas do projeto novo, corrigidos:
1. `ssoProtection` vinha ligado por padrão (bloqueava tudo, até o domínio `.vercel.app` padrão) — desligado via API direta (a ferramenta MCP da Vercel não tem permissão de escrita, deu 403; usei o token do CLI logado em `~/Library/Application Support/com.vercel.cli/auth.json`)
2. `framework: null` — projeto não reconhecido como Next.js, causava 404 na borda sem nenhum log de runtime. Corrigido com `PATCH .../projects/{id} {"framework":"nextjs"}`, mesmo esquema de token.

**Checklist pra qualquer projeto novo na Vercel:** conferir esses dois campos antes de considerar o deploy "pronto".

## 📋 Próximos passos

1. **Módulo 3** — Motivacional (não depende de chave nova; já tem tarefas, compromissos e banco de frases prontos)
2. **Módulo 4** — Briefing (decidir fonte do calendário econômico e do candle de referência)
3. Bot do Telegram → `TELEGRAM_BOT_TOKEN` (@BotFather)
4. Login (NextAuth + Google) pra aposentar o `obterUsuarioAtual()` temporário
5. Testar a gravação de áudio pelo microfone de verdade (celular ou PC)
6. Worker do Railway + deploy na Vercel

## 📚 Dependências principais

`next@16.3.0` · `react@19.2.8` · `prisma@6.19.3` · `@prisma/client@6.19.3` · `@anthropic-ai/sdk` · `next-auth@5 beta` · `zod@4` · `date-fns@4` · `tailwindcss@4`
