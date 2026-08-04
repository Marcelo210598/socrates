# Sócrates — Resumo geral

> Leia este arquivo primeiro pra retomar o projeto rápido.

## O que é

Assistente particular do Marcelo. Canal principal é o **Telegram** (texto e áudio); o dashboard web PWA é complemento (uso 50/50 entre celular e PC). Tom de sócio, sem formalidade.

Cobre duas frentes da vida dele: **produtividade pessoal** e **day trade de NQ/MNQ na Apex Trader Funding**.

**Multi-tenant desde o dia 1** — todo modelo carrega `userId`, mesmo hoje só ele usando. Motivo: ele pensa em vender o app, inteiro ou por módulo.

## Os 5 módulos

1. **Tarefas rotineiras** — lista recorrente, check por dia. Não marcou → alimenta o módulo 3.
2. **Compromissos avulsos** — texto/áudio livre → IA extrai `{titulo, data, hora}` → confirma → alerta no horário.
3. **Motivacional** — cobra o que ficou pra trás. Mistura frase gerada pela IA na hora com banco de frases fixas.
4. **Briefing de trader** — 09:00 (ele opera 10:30): calendário econômico (Forex Factory) + máx/mín do NQ (Yahoo) + volatilidade, resumido por IA com persona de analista sênior.
5. **Contas Apex** — até 20 contas PA. Declara conta nova e resultado de cada pregão por voz/texto; o app calcula saldo, dias qualificados, drawdown, consistência, meta diária e avisa quando libera saque.

## Stack

Next.js 16.3 (App Router) + TypeScript + Tailwind v4 + Prisma 6.19 + **Neon PostgreSQL**.

Deploy planejado: **Vercel** (app inteiro, com o webhook do Telegram como rota) + **Railway** (worker que só agenda — o cron da Vercel Hobby só dá 2 disparos/dia e os alertas precisam de granularidade de minuto).

IA = **Claude API**. Transcrição de áudio = **Groq Whisper** (a Claude API não processa áudio).

## Regras que não se quebra

- **Regras da Apex vivem na tabela `regras_apex`**, versionadas por `vigenteDe`. Regra nova = linha nova; nunca editar a antiga (contas abertas mantêm a regra em que nasceram). É o único modelo sem `userId`.
- **`src/lib/apex/motor.ts` é função pura** — não toca no banco, não conhece nenhum valor da Apex.
- **Tudo em UTC no banco**, exibido em America/Sao_Paulo.
- **A home não é painel de diagnóstico.** Info de infra fica em `/api/saude`.

## Linha do tempo

| Data | O que rolou |
|---|---|
| [03/08/2026](2026-08-03.md) | Fundação criada: schema dos 5 módulos, banco no ar no Neon, motor de cálculo da Apex, PWA, esqueleto do bot, home. Commit `4083e16`. |
| [04/08/2026](2026-08-04.md) | **Módulo 1 (Tarefas rotineiras) pronto na web** e validado no navegador: criar, marcar, arquivar, recorrência, atraso automático, barra de progresso. |
| [04/08/2026 parte 2](2026-08-04-parte2.md) | **Módulo 5 (Contas Apex) pronto na web** e validado ponta a ponta (criou conta, lançou 5 pregões, consistência bloqueou e depois liberou, saque registrado). Achou e corrigiu 2 bugs reais: exibição de data cai um dia em qualquer processo no fuso do Brasil; número do saque na tela podia divergir do banco. |
| [04/08/2026 parte 3](2026-08-04-parte3.md) | Chaves reais da Anthropic e Groq recebidas. **Módulo 2 (Compromissos) pronto na web**, com texto E áudio de verdade — testado com voz sintética real via Groq + Claude, "amanhã às três da tarde" resolvido certo. Repo conectado a `github.com/Marcelo210598/socrates`. |

## Padrão de código dos módulos

Estabelecido no Módulo 1, os outros devem repetir:

1. **Lib de regras pura** (`src/lib/<modulo>.ts`) — só recebe e devolve dados, não sabe de UI
2. **Server actions** (`src/app/<modulo>/acoes.ts`) — validação com Zod, sempre conferindo que o registro é do `userId` atual
3. **Componente cliente** com atualização otimista
4. **Página servidor** que junta tudo

## Regras que não se quebra (atualizado 04/08)

- Exibir um campo `@db.Date`? Use `diaCurto()` (ou `dataPorExtenso`/`hojeNoFuso` com fuso explícito) de `src/lib/datas.ts`. **Nunca** `Intl.DateTimeFormat` sem `timeZone` — sem isso, qualquer processo rodando no fuso do Brasil (ou qualquer fuso atrás de UTC) mostra a data um dia antes.
- Componente cliente que reage a uma server action com `revalidatePath`: se a mensagem de sucesso mostra um valor que a própria ação altera (contador, número sequencial), capture esse valor em estado local **no início** do fluxo — não leia a prop no fim, ela pode já ter mudado.

## Onde parou

Fundação 100%. **Módulos 1, 2 e 5: 100% na web** (falta o acesso pelo Telegram nos três). Módulos 3, 4: 0%.

**Próximo passo:** Módulo 3 (Motivacional) não depende de chave nova — já tem tudo que precisa (tarefas, compromissos, banco de frases). Módulo 4 (Briefing) e o bot do Telegram ainda dependem de decisões/chaves.

**Repo no GitHub:** `github.com/Marcelo210598/socrates`, remoto `origin` já configurado.

**Pendência de dado:** os números de drawdown da Apex 25K e 50K não fecham com o Safety Net informado — Marcelo vai conferir no dashboard dele. Correção é editar `prisma/seed.ts` e rodar `npm run db:seed`.
