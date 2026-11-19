import type { Metadata } from "next";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import {
  AlternarCategoria, AlternarMaterial, FormCustoKm, FormNovaCategoria, FormTipoMaterial, FormTipoServico,
} from "@/components/configuracoes/formularios";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { obterCustoPorKm } from "@/lib/consultas/operacao";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Configurações" };

function Bloco({ id, titulo, descricao, children }: { id: string; titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <Cartao className="p-5">
      <h2 id={id} className="scroll-mt-20 font-semibold text-marinho-900">{titulo}</h2>
      <p className="mb-4 mt-0.5 text-xs text-slate-500">{descricao}</p>
      {children}
    </Cartao>
  );
}

export default async function PaginaConfiguracoes() {
  await exigirPermissaoPagina("configuracoes", "escrever");
  const [custoKm, tipos, categorias, materiais] = await Promise.all([
    obterCustoPorKm(),
    prisma.tipoServico.findMany({
      orderBy: { nome: "asc" },
      include: { etapasModelo: { orderBy: { ordem: "asc" } }, _count: { select: { servicos: true } } },
    }),
    prisma.categoriaDespesa.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { despesas: true } } } }),
    prisma.tipoMaterial.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const moeda = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Parâmetros usados nos lançamentos e cadastros." />
      <div className="space-y-6">
        <Bloco id="km" titulo="Custo por quilômetro" descricao="Aplicado aos novos deslocamentos. Lançamentos antigos mantêm o custo da época.">
          <FormCustoKm atual={moeda(custoKm)} />
        </Bloco>

        <Bloco id="tipos" titulo="Tipos de serviço e etapas padrão" descricao="Ao criar um serviço, as etapas do tipo escolhido são copiadas para ele. Desative tipos que não usa mais.">
          <div className="space-y-2">
            {tipos.map((t) => (
              <details key={t.id} className="rounded-lg border border-slate-200 px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span className={`font-medium ${t.ativo ? "text-marinho-900" : "text-slate-400 line-through"}`}>{t.nome}</span>
                  <span className="text-xs text-slate-500">{t.etapasModelo.length} etapas · {t._count.servicos} serviço(s)</span>
                </summary>
                <div className="mt-3">
                  <FormTipoServico
                    tipo={{ id: t.id, nome: t.nome, ativo: t.ativo, etapas: t.etapasModelo.map((e) => e.nome), emUso: t._count.servicos }}
                  />
                </div>
              </details>
            ))}
            <details className="rounded-lg border border-dashed border-marinho-300 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-marinho-700">+ Novo tipo de serviço</summary>
              <div className="mt-3"><FormTipoServico /></div>
            </details>
          </div>
        </Bloco>

        <Bloco id="categorias" titulo="Categorias de despesa" descricao="Categorias de sistema (Quilometragem e Marcos geodésicos) são alimentadas pelos módulos próprios.">
          <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {categorias.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className={c.ativo ? "text-slate-800" : "text-slate-400 line-through"}>
                  {c.nome}
                  {c.sistema && <span className="ml-2 rounded bg-marinho-50 px-1.5 py-0.5 text-[10px] font-medium text-marinho-700">sistema</span>}
                  <span className="ml-2 text-xs text-slate-400">{c._count.despesas} lançamento(s)</span>
                </span>
                {!c.sistema && <AlternarCategoria id={c.id} ativo={c.ativo} />}
              </li>
            ))}
          </ul>
          <FormNovaCategoria />
        </Bloco>

        <Bloco id="materiais" titulo="Tipos de marcos e materiais" descricao="O custo padrão é sugerido no lançamento e pode ser ajustado a cada uso.">
          <div className="space-y-3">
            {materiais.map((m) => (
              <div key={m.id} className={`rounded-lg border px-3 py-3 ${m.ativo ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                <FormTipoMaterial
                  material={{ id: m.id, nome: m.nome, unidade: m.unidade, custo: m.custoUnitarioPadrao ? moeda(Number(m.custoUnitarioPadrao)) : "" }}
                />
                <div className="mt-2 flex justify-end"><AlternarMaterial id={m.id} ativo={m.ativo} /></div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-marinho-300 px-3 py-3">
              <FormTipoMaterial />
            </div>
          </div>
        </Bloco>
      </div>
    </>
  );
}
