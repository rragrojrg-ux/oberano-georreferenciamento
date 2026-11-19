import "server-only";
import type { AcaoHistorico, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Registra uma alteração importante no histórico.
 * LGPD: registre apenas o necessário (ids e campos alterados); nunca senhas ou documentos completos.
 * Falhas no registro não devem derrubar a operação principal.
 */
export async function registrarHistorico(params: {
  usuarioId?: string | null;
  acao: AcaoHistorico;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Prisma.InputJsonValue;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.historicoAlteracao.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId ?? null,
        detalhes: params.detalhes,
        ip: params.ip ?? null,
      },
    });
  } catch (erro) {
    console.error("[auditoria] falha ao registrar histórico", erro);
  }
}
