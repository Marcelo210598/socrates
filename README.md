# Sócrates

Assistente particular do Marcelo via **Telegram** (texto e áudio), com dashboard web **PWA** como complemento. Cobre duas frentes: rotina pessoal e operação de day trade de NQ/MNQ na Apex Trader Funding.

Tom do bot: parceiro/sócio, sem formalidade.

---

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Web + API | Next.js 16 (App Router) + TypeScript | Um projeto só pra UI e backend |
| Banco | Neon PostgreSQL + Prisma | Serverless, branching de dev/prod |
| Estilo | Tailwind CSS v4 | Mobile-first, tema escuro |
| Bot | Webhook do Telegram (rota do Next) | Sem servidor separado pro bot |
| IA | Claude API (`claude-sonnet-5`) | Extração de linguagem natural e textos |
| Áudio | Groq Whisper | Transcrição rápida e barata |
| Deploy | Vercel (app) + Railway (agendador) | Vercel Hobby só permite 2 crons/dia |

---

## Módulos

| # | Módulo | O que faz |
|---|---|---|
| 1 | Tarefas rotineiras | Lista recorrente com check por dia |
| 2 | Compromissos avulsos | Texto/áudio livre → IA extrai `{titulo, data, hora}` → confirma → alerta |
| 3 | Motivacional | Cobra o que ficou pra trás (IA na hora + banco de frases) |
| 4 | Briefing de trader | 09:00, calendário econômico + máx/mín NQ + volatilidade |
| 5 | Contas Apex | Até 20 contas: saldo, dias qualificados, drawdown, consistência, meta diária, alerta de saque liberado |

---

## Multi-tenant desde o dia 1

Todo modelo de dados carrega `userId`. A única exceção é `RegraApex`, que é regra da corretora (igual pra todo mundo).

A ideia é poder vender o app — inteiro ou por módulo — sem precisar refazer o banco depois.

---

## Rodando localmente

```bash
npm install
cp .env.example .env      # preencha as chaves
npm run db:push           # cria as tabelas no Neon
npm run db:seed           # regras da Apex + frases
npm run dev               # http://localhost:3000
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (roda `prisma generate` antes) |
| `npm run typecheck` | Confere os tipos sem gerar build |
| `npm run db:push` | Sincroniza o schema com o Neon |
| `npm run db:seed` | Popula regras da Apex e frases (idempotente) |
| `npm run db:studio` | Abre o Prisma Studio pra ver/editar os dados |

### Rotas úteis

| Rota | Serve pra |
|---|---|
| `/` | Home do app |
| `/api/saude` | Diagnóstico: banco conectado? quais chaves estão configuradas? |
| `/api/telegram/webhook` | Entrada das mensagens do bot |

---

## Regras da Apex ficam no banco, não no código

A tabela `regras_apex` guarda, por **tamanho × tipo de drawdown**: dias qualificados, lucro mínimo/dia, drawdown, Safety Net, saldo mínimo pra saque, saque mínimo, máximo de saques e o % da consistência.

Quando a Apex mudar uma regra, **insira uma linha nova com `vigenteDe` novo** — não edite a antiga. Contas já abertas continuam sob a regra em que nasceram.

O motor de cálculo (`src/lib/apex/motor.ts`) só recebe números; não conhece nenhum valor da Apex.

> ⚠️ **Consistência é 50%** para contas compradas a partir de 01/03/2026. Contas anteriores seguem 30%.

---

## Fusos

Tudo é gravado em **UTC** no banco e exibido em **America/Sao_Paulo**. O horário de verão americano muda a distância entre o Brasil e Nova York duas vezes por ano — gravar hora "local" quebraria o Módulo 4 sem avisar.
