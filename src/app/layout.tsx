import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BarraTopo } from "@/components/BarraTopo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sócrates",
  description: "Seu sócio: rotina, compromissos e contas Apex num lugar só.",
  applicationName: "Sócrates",
  appleWebApp: {
    capable: true,
    title: "Sócrates",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

// Instalável no celular: barra do sistema combinando com o tema escuro,
// e `viewportFit: cover` pra usar a tela toda no iPhone.
export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fundo text-texto">
        <BarraTopo />
        {children}
      </body>
    </html>
  );
}
