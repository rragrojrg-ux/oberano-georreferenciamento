import type { Metadata } from "next";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { AcoesUsuario, FormEditarUsuario, FormNovoUsuario } from "@/components/usuarios/formularios";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { ROTULO_PERFIL } from "@/lib/auth/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const eu = await exigirPermissaoPagina("usuarios", "escrever");
  const agora = new Date();
  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ ativo: "desc" }, { perfil: "asc" }, { nome: "asc" }],
    select: {
      id: true, nome: true, email: true, perfil: true, ativo: true, ultimoAcesso: true, bloqueadoAte: true, criadoEm: true,
      _count: { select: { sessoes: { where: { expiraEm: { gt: agora } } } } },
    },
  });
  const fmt = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "nunca");

  return (
    <>
      <CabecalhoPagina titulo="Usuários" descricao="Contas de acesso. Senhas são guardadas apenas como hash (bcrypt) — nem o administrador consegue vê-las." />

      <Cartao className="mb-6 p-5">
        <h2 className="mb-4 font-semibold text-marinho-900">Novo usuário</h2>
        <FormNovoUsuario />
      </Cartao>

      <div className="space-y-3">
        {usuarios.map((u) => (
          <details key={u.id} className={`rounded-xl border bg-white shadow-sm ${u.ativo ? "border-slate-200" : "border-slate-200 opacity-75"}`}>
            <summary className="flex cursor-pointer flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-marinho-900">
                  {u.nome} {u.id === eu.id && <span className="text-xs font-normal text-slate-500">(você)</span>}
                </p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${u.perfil === "ADMINISTRADOR" ? "bg-marinho-900 text-dourado-300" : "bg-slate-100 text-slate-700"}`}>
                  {ROTULO_PERFIL[u.perfil]}
                </span>
                {!u.ativo && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Inativo</span>}
                {u.bloqueadoAte && u.bloqueadoAte > agora && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Bloqueado por tentativas</span>}
                <span className="text-slate-500">Último acesso: {fmt(u.ultimoAcesso)} · {u._count.sessoes} sessão(ões) ativa(s)</span>
              </div>
            </summary>
            <div className="space-y-4 border-t border-slate-100 px-5 py-4">
              <FormEditarUsuario usuario={{ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo }} />
              {u.id !== eu.id && <AcoesUsuario id={u.id} email={u.email} />}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
