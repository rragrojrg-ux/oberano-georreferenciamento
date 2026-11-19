"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { obterIpRequisicao } from "@/lib/auth/sessao";
import { hectaresParaAlqueires } from "@/lib/financeiro";
import { errosPorCampo, esquemaPropriedade } from "@/lib/validacao/esquemas";
import { camposAlterados, valoresDoFormulario, type EstadoFormulario } from "./tipos";

export async function salvarPropriedade(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("propriedades", "escrever");
  const valores = valoresDoFormulario(formData);
  const id = valores.id || null;

  const r = esquemaPropriedade.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), mensagem: "Corrija os campos destacados.", valores };

  const cliente = await prisma.cliente.findUnique({ where: { id: r.data.clienteId }, select: { id: true } });
  if (!cliente) return { erros: { clienteId: ["Cliente não encontrado."] }, valores };

  // A área em alqueires é sempre calculada no servidor (1 alqueire mineiro = 4,84 ha).
  const dados = { ...r.data, areaAlqueires: hectaresParaAlqueires(r.data.areaHectares) };

  let propriedadeId: string;
  if (id) {
    const antes = await prisma.propriedade.findUnique({ where: { id } });
    if (!antes) return { mensagem: "Propriedade não encontrada.", valores };
    await prisma.propriedade.update({ where: { id }, data: dados });
    propriedadeId = id;
    await registrarHistorico({
      usuarioId: usuario.id, acao: "ATUALIZAR", entidade: "Propriedade", entidadeId: id,
      detalhes: { campos: camposAlterados(antes, dados) }, ip: await obterIpRequisicao(),
    });
  } else {
    const nova = await prisma.propriedade.create({ data: dados });
    propriedadeId = nova.id;
    await registrarHistorico({
      usuarioId: usuario.id, acao: "CRIAR", entidade: "Propriedade", entidadeId: nova.id, ip: await obterIpRequisicao(),
    });
  }

  revalidatePath("/propriedades");
  revalidatePath(`/clientes/${dados.clienteId}`);
  redirect(`/propriedades/${propriedadeId}?ok=salvo`);
}

export async function excluirPropriedade(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("propriedades", "escrever");
  const id = String(formData.get("id") ?? "");

  const p = await prisma.propriedade.findUnique({
    where: { id },
    select: { id: true, clienteId: true, _count: { select: { servicos: true } } },
  });
  if (!p) return { mensagem: "Propriedade não encontrada." };
  if (p._count.servicos > 0) {
    return { mensagem: `Não é possível excluir: a propriedade está vinculada a ${p._count.servicos} serviço(s).` };
  }

  await prisma.propriedade.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Propriedade", entidadeId: id, ip: await obterIpRequisicao() });
  revalidatePath("/propriedades");
  revalidatePath(`/clientes/${p.clienteId}`);
  redirect(`/clientes/${p.clienteId}?ok=propriedade-excluida`);
}
