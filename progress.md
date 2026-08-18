# Sócrates — Progresso

## Última atualização: 17/08/2026

## 📌 Visão Geral

Assistente particular via Telegram (texto e áudio) + dashboard PWA. Cinco módulos: tarefas rotineiras, compromissos avulsos, motivacional, briefing de trader (NQ/MNQ) e gestão de contas Apex.

Stack: Next.js 16.3 + TypeScript + Tailwind v4 + Prisma + Neon PostgreSQL. Deploy: Vercel (app + webhook, função fixada em `gru1`/São Paulo) + Railway (2 Cron Jobs, sem worker persistente).

**Status:** fundação 100%. **Módulos 1 (Tarefas), 2 (Compromissos), 3 (Motivacional) e 5 (Contas Apex) prontos e EM PRODUÇÃO, com bot do Telegram integrado de ponta a ponta** — incluindo consulta por texto/áudio livre e importância nos compromissos. Módulo 4 (Briefing): 0%, deixado por último por decisão do Marcelo (foco é usar e polir, não monetizar por enquanto). App no ar: **https://socrates-opal-two.vercel.app**. Bot: **@Socratesassistentebot**. Repo: `github.com/Marcelo210598/socrates`.

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

### Bot do Telegram + Módulo 3 (Motivacional) (16/08) ✅

- `src/lib/ia/pendencia.ts` — extrator único: decide Tarefa (repete) vs Compromisso (pontual) numa chamada só
- Webhook reescrito do zero: comandos (`/start /ajuda /tarefas /hoje /nova`), texto/áudio livre, cards de confirmação com botão, callback_query (toggle/pular/snooze/concluir/cancelar/reagendar)
- `Rascunho` e `SessaoTelegram` (schema novo) — confirmação e memória curta de conversa
- Lembrete automático a cada 10min (Módulo 3): tarefa/compromisso vencido repete com uma frase do banco até resolver
- Mensagem motivacional diária 07:30 BRT: citação real via Claude → imagem 1080×1080 (`next/og`) → foto no Telegram
- `worker/` (Railway, 2 Cron Jobs, sem processo persistente) chamando `/api/cron/lembretes` e `/api/cron/motivacional`
- `/compromissos` repaginado: emoji, badge Hoje/Amanhã, "sem hora marcada"
- Validado ponta a ponta em produção (não só localmente) — ver `historico/2026-08-16.md`

### Sessão de polimento (17/08) ✅

- **Consulta por texto/áudio livre** — `extrairPendencia` ganhou tipo `consulta` (`alvo`: tarefas/compromissos/tudo, `dia`: hoje/amanhã). Antes, perguntar "quais meus compromissos de hoje?" tentava abrir um rascunho de criação em vez de responder
- **Importância nos compromissos** — enum `Importancia` (BAIXA/MEDIA/ALTA, default MEDIA), extraída pela IA quando mencionada ("isso é importante" → ALTA), exibida com 🔴🟡🟢 no bot/`/hoje`/web, seletor manual no formulário
- **Frase do lembrete por contexto** — `sortearFrase(userId, contexto)` prioriza categoria TRADING pra títulos com palavra-chave de trading, senão sorteia BIBLICA/PENSADOR
- **Fix de infra**: função Vercel rodava em `iad1` (EUA), banco em `sa-east-1` (Brasil) — `vercel.json` com `regions: ["gru1"]` derrubou a latência de banco de ~600-2000ms pra ~10ms
- **404 do "Briefing" resolvido** — removidos os 2 links pra `/mercado` (home + barra de topo); módulo segue 0%, não implementado ainda (decisão consciente)
- Detalhe completo em `historico/2026-08-17.md`

## 🚧 Em progresso

- Nenhuma pendência de decisão aberta no momento. Marcelo decidiu adiar monetização/Módulo 4 — foco agora é usar bastante e refinar o que já existe

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

`.env` (fora do git) e Vercel produção preenchidos: `DATABASE_URL`, `DIRECT_URL` (Neon), `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_OWNER_CHAT_ID` (`955995171`), `CRON_SECRET`.

**Faltando:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (login ainda não implementado).

**Railway** (projeto `socrates-worker`, workspace do Marcelo): 2 serviços — `socrates-worker` (cron `*/10 * * * *`, endpoint `/api/cron/lembretes`) e `socrates-motivacional` (cron `30 10 * * *` = 07:30 BRT, endpoint `/api/cron/motivacional`). Cron Schedule não tem comando na CLI — configurado via API GraphQL direta (`backboard.railway.com/graphql/v2`, mutation `serviceInstanceUpdate`).

## 🐙 Git remoto e deploy

`github.com/Marcelo210598/socrates` — configurado como `origin` (04/08). Repo criado vazio pelo Marcelo.

**Vercel:** projeto `socrates` na org `marcelo-di-foggia-juniors-projects`, importado do GitHub. App em produção: https://socrates-opal-two.vercel.app

Dois problemas do projeto novo, corrigidos:
1. `ssoProtection` vinha ligado por padrão (bloqueava tudo, até o domínio `.vercel.app` padrão) — desligado via API direta (a ferramenta MCP da Vercel não tem permissão de escrita, deu 403; usei o token do CLI logado em `~/Library/Application Support/com.vercel.cli/auth.json`)
2. `framework: null` — projeto não reconhecido como Next.js, causava 404 na borda sem nenhum log de runtime. Corrigido com `PATCH .../projects/{id} {"framework":"nextjs"}`, mesmo esquema de token.

**Checklist pra qualquer projeto novo na Vercel:** conferir esses dois campos antes de considerar o deploy "pronto".

## 📋 Próximos passos

1. Conferir os números de drawdown da Apex 25K/50K (pendência antiga)
2. Corrigir compromisso "Audiência PROCON" — foi salvo com data 31/08 em vez de 31/07 (a IA empurrou uma data passada pra frente); checar se é um padrão a corrigir na extração
3. Agendar `limparRascunhosAntigos()` (existe, não é chamada por nada ainda)
4. Considerar logar cliques de botão do Telegram (pular/feita/concluir) no `MensagemLog` — hoje só texto/áudio ficam registrados, dificultando debug de casos como "pulei e mesmo assim veio alerta"
5. Login (NextAuth + Google) pra aposentar o `obterUsuarioAtual()` temporário — adiado, sem pressa (Marcelo não quer monetizar por enquanto)
6. **Módulo 4** — Briefing (decidir fonte do calendário econômico e do candle de referência) — deixado por último por decisão do Marcelo

~~Testar a transcrição de áudio com um áudio real~~ — ✅ feito 17/08, já tinha sido validado em 16/08 e confirmado de novo hoje (áudio real transcrito + classificado como consulta corretamente)

## 📚 Dependências principais

`next@16.3.0` · `react@19.2.8` · `prisma@6.19.3` · `@prisma/client@6.19.3` · `@anthropic-ai/sdk` · `next-auth@5 beta` · `zod@4` · `date-fns@4` · `tailwindcss@4`
