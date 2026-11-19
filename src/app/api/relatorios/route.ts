import { NextResponse, type NextRequest } from "next/server";
import { registrarHistorico } from "@/lib/auditoria";
import { obterIpRequisicao, obterUsuarioAtual } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { gerarCsv } from "@/lib/relatorios/csv";
import { gerarRelatorio, lerFiltros } from "@/lib/relatorios/gerar";
import { gerarPdf } from "@/lib/relatorios/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Exporta relatórios: /api/relatorios?tipo=…&formato=csv|pdf&cliente=…&de=AAAA-MM-DD… */
export async function GET(req: NextRequest) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!pode(usuario.perfil, "relatorios", "ler")) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const formato = req.nextUrl.searchParams.get("formato") === "pdf" ? "pdf" : "csv";
  const filtros = lerFiltros(req.nextUrl.searchParams);
  const r = await gerarRelatorio(filtros);
  const data = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const nome = `soberano-${r.tipo}-${data}.${formato}`;

  await registrarHistorico({
    usuarioId: usuario.id, acao: "DOWNLOAD", entidade: "Relatorio", entidadeId: null,
    detalhes: { tipo: r.tipo, formato, linhas: r.linhas.length }, ip: await obterIpRequisicao(),
  });

  const cabecalhos = {
    "Content-Disposition": `attachment; filename="${nome}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (formato === "csv") {
    return new NextResponse(gerarCsv(r.colunas.map((c) => c.rotulo), r.linhas, r.total), {
      headers: { ...cabecalhos, "Content-Type": "text/csv; charset=utf-8" },
    });
  }
  const pdf = await gerarPdf(r, { usuario: usuario.nome, geradoEm: new Date() });
  return new NextResponse(new Uint8Array(pdf), { headers: { ...cabecalhos, "Content-Type": "application/pdf" } });
}
