import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem isto o Turbopack sobe a raiz até a home (que tem um package-lock.json
  // solto) e reclama. Fixamos a raiz na pasta do projeto.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
