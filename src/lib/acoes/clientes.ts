"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { obterIpRequisicao } from "@/lib/auth/sessao";
import { errosPorCampo, esquemaCliente } from "@/lib/validacao/esquemas";
import { camposAlterados, valoresDoFormulario, type EstadoFormulario } from "./tipos";

export async function salvarCliente(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("clientes", "escrever");
  const valores = valoresDoFormulario(formData);
  const id = valores.id || null;

  const r = esquemaCliente.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), mensagem: "Corrija os campos destacados.", valores };
  const dados = r.data;

  let clienteId: string;
  try {
    if (id) {
      const antes = await prisma.cliente.findUnique({ where: { id } });
      if (!antes) return { mensagem: "Cliente não encontrado.", valores };
      await prisma.cliente.update({ where: { id }, data: dados });
      clienteId = id;
      await registrarHistorico({
        usuarioId: usuario.id, acao: "ATUALIZAR", entidade: "Cliente", entidadeId: id,
        detalhes: { campos: camposAlterados(antes, dados) }, ip: await obterIpRequisicao(),
      });
    } else {
      const novo = await prisma.cliente.create({ data: dados });
      clienteId = novo.id;
      await registrarHistorico({
        usuarioId: usuario.id, acao: "CRIAR", entidade: "Cliente", entidadeId: novo.id, ip: await obterIpRequisicao(),
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erros: { documento: ["Já existe um cliente com este CPF/CNPJ."] }, mensagem: "Corrija os campos destacados.", valores };
    }
    throw e;
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}?ok=salvo`);
}

export async function excluirCliente(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("clientes", "escrever");
  const id = String(formData.get("id") ?? "");

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { id: true, _count: { select: { propriedades: true, servicos: true } } },
  });
  if (!cliente) return { mensagem: "Cliente não encontrado." };
  if (cliente._count.servicos > 0 || cliente._count.propriedades > 0) {
    return {
      mensagem: `Não é possível excluir: o cliente possui ${cliente._count.propriedades} propriedade(s) e ${cliente._count.servicos} serviço(s) vinculados. Exclua ou transfira esses registros antes.`,
    };
  }

  await prisma.cliente.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Cliente", entidadeId: id, ip: await obterIpRequisicao() });
  revalidatePath("/clientes");
  redirect("/clientes?ok=excluido");
}
