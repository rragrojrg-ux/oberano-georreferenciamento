import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Soberano Georreferenciamento", template: "%s · Soberano" },
  description: "Sistema de gestão — Soberano Georreferenciamento. A solução está em nosso DNA.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1f3f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
