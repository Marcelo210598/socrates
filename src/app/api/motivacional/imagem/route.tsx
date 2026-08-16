import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Renderiza o cartão de imagem da mensagem motivacional (1080×1080, formato
 * post/feed). Rota separada e "burra" de propósito: só recebe texto pronto e
 * devolve PNG — quem decide O QUE vira citação é `gerarMensagemMotivacional`
 * (`/api/cron/motivacional`), que chama esta rota por baixo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASTA_FONTES = path.join(process.cwd(), "src/assets/fonts");

async function carregarFontes() {
  const [interRegular, interSemiBold, playfairBold] = await Promise.all([
    readFile(path.join(PASTA_FONTES, "Inter-Regular.ttf")),
    readFile(path.join(PASTA_FONTES, "Inter-SemiBold.ttf")),
    readFile(path.join(PASTA_FONTES, "PlayfairDisplay-Bold.ttf")),
  ]);
  return { interRegular, interSemiBold, playfairBold };
}

export async function POST(req: Request) {
  let corpo: { texto?: unknown; autor?: unknown; tema?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const texto = typeof corpo.texto === "string" ? corpo.texto.trim() : "";
  const autor = typeof corpo.autor === "string" ? corpo.autor.trim() : "";
  const tema = typeof corpo.tema === "string" ? corpo.tema.trim() : "";

  if (!texto) {
    return new Response("Faltou o texto da citação", { status: 400 });
  }

  const { interRegular, interSemiBold, playfairBold } = await carregarFontes();

  // Texto grande cabe menos por linha — reduz a fonte conforme o tamanho.
  const tamanhoFonte = texto.length > 160 ? 46 : texto.length > 100 ? 54 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1080px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "100px",
          background: "linear-gradient(160deg, #0b0d12 0%, #14181f 55%, #1a1005 100%)",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* moldura fina dourada */}
        <div
          style={{
            position: "absolute",
            top: "56px",
            left: "56px",
            right: "56px",
            bottom: "56px",
            border: "1.5px solid rgba(199,161,90,0.35)",
            display: "flex",
          }}
        />

        {/* aspas decorativas */}
        <div
          style={{
            fontFamily: "Playfair",
            fontSize: "160px",
            lineHeight: "100px",
            color: "rgba(199,161,90,0.55)",
            marginBottom: "8px",
            display: "flex",
          }}
        >
          “
        </div>

        <div
          style={{
            fontFamily: "Playfair",
            fontSize: `${tamanhoFonte}px`,
            lineHeight: 1.35,
            color: "#f4efe6",
            textAlign: "center",
            maxWidth: "820px",
            display: "flex",
            fontWeight: 700,
          }}
        >
          {texto}
        </div>

        {/* separador */}
        <div
          style={{
            width: "72px",
            height: "2px",
            background: "#c7a15a",
            margin: "48px 0 32px 0",
            display: "flex",
          }}
        />

        <div
          style={{
            fontFamily: "Inter",
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "#c7a15a",
            display: "flex",
          }}
        >
          {autor || "Anônimo"}
        </div>

        <div
          style={{
            fontFamily: "Inter",
            fontSize: "20px",
            fontWeight: 600,
            color: "rgba(199,161,90,0.75)",
            marginTop: "8px",
            display: "flex",
          }}
        >
          @marcelo.devoficial
        </div>

        {tema && (
          <div
            style={{
              fontFamily: "Inter",
              fontSize: "22px",
              color: "rgba(244,239,230,0.45)",
              marginTop: "10px",
              display: "flex",
            }}
          >
            #{tema}
          </div>
        )}

        {/* wordmark */}
        <div
          style={{
            position: "absolute",
            bottom: "88px",
            fontFamily: "Inter",
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "5px",
            color: "rgba(244,239,230,0.5)",
            display: "flex",
          }}
        >
          SÓCRATES
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
        { name: "Inter", data: interSemiBold, weight: 600, style: "normal" },
        { name: "Playfair", data: playfairBold, weight: 700, style: "normal" },
      ],
    },
  );
}
