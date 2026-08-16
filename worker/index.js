/**
 * Worker do Railway — não fica rodando: sobe, bate no endpoint de cron da
 * Vercel, desliga. Dois "Cron Jobs" no Railway apontam pra este mesmo
 * script, um com ENDPOINT=/api/cron/lembretes (a cada 10min) e outro com
 * ENDPOINT=/api/cron/motivacional (uma vez por dia, 07:30 BRT).
 *
 * Sem dependências — só `fetch` nativo do Node 18+.
 */

const APP_URL = process.env.APP_URL;
const ENDPOINT = process.env.ENDPOINT;
const CRON_SECRET = process.env.CRON_SECRET;

async function main() {
  if (!APP_URL || !ENDPOINT || !CRON_SECRET) {
    console.error("Faltou configurar APP_URL, ENDPOINT ou CRON_SECRET nas variáveis do serviço.");
    process.exit(1);
  }

  const url = new URL(ENDPOINT, APP_URL).toString();
  console.log(`[worker] batendo em ${url}`);

  const resposta = await fetch(url, {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET },
  });

  const corpo = await resposta.text();
  console.log(`[worker] status ${resposta.status}: ${corpo}`);

  if (!resposta.ok) {
    process.exit(1);
  }
}

main().catch((erro) => {
  console.error("[worker] falha inesperada:", erro);
  process.exit(1);
});
