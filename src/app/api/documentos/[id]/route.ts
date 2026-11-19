import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { obterIpRequisicao, obterUsuarioAtual } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { lerArquivo } from "@/lib/documentos/armazenamento";

export const dynamic = "force-dynamic";

/** Download protegido: exige sessão válida e permissão de leitura em documentos. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!pode(usuario.perfil, "documentos", "ler")) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const { id } = await params;
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  let conteudo: Buffer;
  try {
    conteudo = await lerArquivo(doc.nomeArmazenado);
  } catch {
    return NextResponse.json({ erro: "Arquivo indisponível no armazenamento." }, { status: 410 });
  }

  await registrarHistorico({
    usuarioId: usuario.id, acao: "DOWNLOAD", entidade: "Documento", entidadeId: doc.id, ip: await obterIpRequisicao(),
  });

  // Visualização no navegador só para PDF e imagens; o resto sempre como anexo.
  const inline = req.nextUrl.searchParams.get("ver") === "1" && /^(application\/pdf|image\/(png|jpeg))$/.test(doc.mimeType);
  const nomeAscii = doc.nomeOriginal.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "_") || "arquivo";

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(conteudo.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(doc.nomeOriginal)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
