import "server-only";
import PDFDocument from "pdfkit";
import type { Relatorio } from "./gerar";

const MARINHO = "#0b1f3f";
const DOURADO = "#c9a227";
const CINZA = "#64748b";
const LINHA = "#e2e8f0";

/** Gera o PDF do relatório (A4 paisagem, cabeçalho com a marca, tabela com quebra de página e rodapé numerado). */
export function gerarPdf(r: Relatorio, meta: { usuario: string; geradoEm: Date }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 48, left: 36, right: 36 },
      bufferPages: true,
      info: { Title: `${r.titulo} — Soberano Georreferenciamento`, Author: "Soberano Georreferenciamento", Creator: "Sistema Soberano" },
    });
    const partes: Buffer[] = [];
    doc.on("data", (c: Buffer) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const esquerda = doc.page.margins.left;
    const largura = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const limiteInferior = () => doc.page.height - doc.page.margins.bottom;

    // Cabeçalho
    doc.rect(0, 0, doc.page.width, 6).fill(DOURADO);
    doc.fillColor(MARINHO).font("Helvetica-Bold").fontSize(15).text("SOBERANO GEORREFERENCIAMENTO", esquerda, 22);
    doc.fillColor(DOURADO).font("Helvetica-Oblique").fontSize(8).text("A solução está em nosso DNA", esquerda, 40);
    doc.fillColor(MARINHO).font("Helvetica-Bold").fontSize(13).text(r.titulo, esquerda, 60);
    doc.fillColor(CINZA).font("Helvetica").fontSize(8.5).text(r.filtrosDescricao, esquerda, 78, { width: largura });
    let y = doc.y + 10;

    // Tabela
    const pesos = r.colunas.map((c) => c.peso ?? 1);
    const somaPesos = pesos.reduce((a, b) => a + b, 0);
    const larguras = pesos.map((p) => (p / somaPesos) * largura);
    const PAD = 4;
    const FONTE = 8;

    const alturaLinha = (celulas: string[], negrito = false) => {
      doc.font(negrito ? "Helvetica-Bold" : "Helvetica").fontSize(FONTE);
      return Math.max(...celulas.map((t, i) => doc.heightOfString(t || " ", { width: larguras[i] - PAD * 2 }))) + PAD * 2;
    };

    const desenharLinha = (celulas: string[], opts: { cabecalho?: boolean; total?: boolean; zebra?: boolean } = {}) => {
      const h = alturaLinha(celulas, opts.cabecalho || opts.total);
      if (y + h > limiteInferior()) {
        doc.addPage();
        y = doc.page.margins.top;
        if (!opts.cabecalho) desenharLinha(r.colunas.map((c) => c.rotulo), { cabecalho: true });
      }
      if (opts.cabecalho) doc.rect(esquerda, y, largura, h).fill(MARINHO);
      else if (opts.total) doc.rect(esquerda, y, largura, h).fill("#f5ebc7");
      else if (opts.zebra) doc.rect(esquerda, y, largura, h).fill("#f8fafc");
      let x = esquerda;
      celulas.forEach((t, i) => {
        doc
          .fillColor(opts.cabecalho ? "#ffffff" : MARINHO)
          .font(opts.cabecalho || opts.total ? "Helvetica-Bold" : "Helvetica")
          .fontSize(FONTE)
          .text(t ?? "", x + PAD, y + PAD, { width: larguras[i] - PAD * 2, align: r.colunas[i]?.numerico ? "right" : "left" });
        x += larguras[i];
      });
      doc.moveTo(esquerda, y + h).lineTo(esquerda + largura, y + h).lineWidth(0.5).strokeColor(LINHA).stroke();
      y += h;
    };

    desenharLinha(r.colunas.map((c) => c.rotulo), { cabecalho: true });
    if (r.linhas.length === 0) {
      doc.fillColor(CINZA).font("Helvetica").fontSize(9).text("Nenhum registro encontrado para os filtros escolhidos.", esquerda, y + 10);
      y = doc.y;
    }
    r.linhas.forEach((l, i) => desenharLinha(l, { zebra: i % 2 === 1 }));
    if (r.total && r.linhas.length) desenharLinha(r.total, { total: true });

    if (r.observacao) {
      if (y + 30 > limiteInferior()) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.fillColor(CINZA).font("Helvetica-Oblique").fontSize(7.5).text(r.observacao, esquerda, y + 8, { width: largura });
    }

    // Rodapé em todas as páginas
    const paginas = doc.bufferedPageRange();
    const quando = meta.geradoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      // O rodapé fica dentro da margem inferior: zera a margem para o PDFKit não criar páginas novas.
      doc.page.margins.bottom = 0;
      const yRodape = doc.page.height - 30;
      doc.fillColor(CINZA).font("Helvetica").fontSize(7)
        .text(`Gerado em ${quando} por ${meta.usuario} · Documento interno — contém dados protegidos pela LGPD`, esquerda, yRodape, { width: largura - 80, lineBreak: false })
        .text(`Página ${i + 1} de ${paginas.count}`, esquerda + largura - 80, yRodape, { width: 80, align: "right", lineBreak: false });
    }
    doc.end();
  });
}
