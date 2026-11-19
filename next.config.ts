import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados a todas as rotas.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // pdfkit lê arquivos de fonte do próprio pacote: não deve ser empacotado pelo bundler.
  serverExternalPackages: ["pdfkit"],
  // Garante que as fontes do PDF sejam incluídas no pacote publicado (Vercel/serverless).
  outputFileTracingIncludes: {
    "/api/relatorios": ["./node_modules/pdfkit/js/data/**/*"],
  },
  experimental: {
    // Upload passando pelo servidor (modo local/VPS): até 20 MB por arquivo.
    // Na Vercel o limite da plataforma é ~4,5 MB; por isso lá o envio vai direto ao Supabase.
    serverActions: { bodySizeLimit: "21mb" },
    middlewareClientMaxBodySize: "21mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
