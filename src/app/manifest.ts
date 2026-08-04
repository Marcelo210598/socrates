import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA — é o que permite "Adicionar à tela de início" no celular
 * e instalar como app no desktop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sócrates — seu sócio",
    short_name: "Sócrates",
    description: "Rotina, compromissos, briefing de mercado e contas Apex.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    lang: "pt-BR",
    // `/icon` e `/apple-icon` são gerados pelo Next a partir de
    // src/app/icon.tsx e src/app/apple-icon.tsx.
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
