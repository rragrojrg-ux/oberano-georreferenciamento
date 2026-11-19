"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, LogOut } from "lucide-react";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { encerrarSessoesUsuario, redefinirSenha, salvarUsuario, trocarMinhaSenha } from "@/lib/acoes/usuarios";
import { AvisoErro, Campo, CampoSelecao } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

function Retorno({ estado }: { estado: EstadoFormulario }) {
  if (estado.sucesso) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span className="break-all">{estado.sucesso}</span>
      </p>
    );
  }
  return <AvisoErro mensagem={estado.mensagem} />;
}

const PERFIS = [
  { valor: "VISUALIZADOR", rotulo: "Visualizador (somente consulta)" },
  { valor: "ADMINISTRADOR", rotulo: "Administrador (acesso completo)" },
];

export function FormNovoUsuario() {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarUsuario, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <div className="space-y-3">
      <form key={estado.ok ?? "novo"} action={acao} className="grid gap-3 sm:grid-cols-6" noValidate>
        <Campo nome="nome" rotulo="Nome" obrigatorio className="sm:col-span-3" defaultValue={v.nome} erro={e.nome} />
        <Campo nome="email" rotulo="E-mail (login)" type="email" obrigatorio className="sm:col-span-3" defaultValue={v.email} erro={e.email} autoComplete="off" />
        <CampoSelecao nome="perfil" rotulo="Perfil" obrigatorio className="sm:col-span-3" defaultValue={v.perfil ?? "VISUALIZADOR"} opcoes={PERFIS} erro={e.perfil} />
        <Campo
          nome="senha"
          rotulo="Senha inicial (opcional)"
          type="password"
          autoComplete="new-password"
          className="sm:col-span-3"
          erro={e.senha}
          ajuda="Em branco: o sistema gera uma senha forte e mostra uma única vez."
        />
        <div className="flex justify-end sm:col-span-6"><BotaoEnviar>Criar usuário</BotaoEnviar></div>
      </form>
      <Retorno estado={estado} />
    </div>
  );
}

export function FormEditarUsuario({
  usuario,
}: {
  usuario: { id: string; nome: string; email: string; perfil: string; ativo: boolean };
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarUsuario, {});
  const v = { ...usuario, ...estado.valores };
  const e = estado.erros ?? {};
  const p = `u-${usuario.id}-`;
  const cls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm";
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-6" noValidate>
      <input type="hidden" name="id" value={usuario.id} />
      <div className="sm:col-span-2">
        <label htmlFor={`${p}nome`} className="block text-xs font-medium text-slate-600">Nome</label>
        <input id={`${p}nome`} name="nome" defaultValue={v.nome} className={cls} />
        {e.nome && <p className="mt-1 text-xs text-red-600">{e.nome[0]}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${p}email`} className="block text-xs font-medium text-slate-600">E-mail</label>
        <input id={`${p}email`} name="email" type="email" defaultValue={v.email} className={cls} />
        {e.email && <p className="mt-1 text-xs text-red-600">{e.email[0]}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${p}perfil`} className="block text-xs font-medium text-slate-600">Perfil</label>
        <select id={`${p}perfil`} name="perfil" defaultValue={v.perfil} className={cls}>
          {PERFIS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3">
        <input type="checkbox" name="ativo" defaultChecked={usuario.ativo} className="size-4 accent-marinho-700" />
        Conta ativa (desmarcar bloqueia o acesso imediatamente)
      </label>
      <div className="flex justify-end sm:col-span-3"><BotaoEnviar>Salvar</BotaoEnviar></div>
      {(estado.sucesso || estado.mensagem) && <div className="sm:col-span-6"><Retorno estado={estado} /></div>}
    </form>
  );
}

function BotaoAcaoUsuario({
  acao, id, rotulo, icone, confirmacao,
}: {
  acao: typeof redefinirSenha; id: string; rotulo: string; icone: React.ReactNode; confirmacao: string;
}) {
  const [estado, executar, pendente] = useActionState<EstadoFormulario, FormData>(acao, {});
  return (
    <div className="space-y-2">
      <form action={executar} onSubmit={(ev) => { if (!window.confirm(confirmacao)) ev.preventDefault(); }}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pendente} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {icone} {rotulo}
        </button>
      </form>
      <Retorno estado={estado} />
    </div>
  );
}

export function AcoesUsuario({ id, email }: { id: string; email: string }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <BotaoAcaoUsuario
        acao={redefinirSenha}
        id={id}
        rotulo="Gerar nova senha"
        icone={<KeyRound className="size-3.5" aria-hidden="true" />}
        confirmacao={`Gerar uma nova senha para ${email}? A senha atual deixará de funcionar.`}
      />
      <BotaoAcaoUsuario
        acao={encerrarSessoesUsuario}
        id={id}
        rotulo="Encerrar sessões"
        icone={<LogOut className="size-3.5" aria-hidden="true" />}
        confirmacao={`Desconectar ${email} de todos os dispositivos?`}
      />
    </div>
  );
}

export function FormTrocarSenha() {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(trocarMinhaSenha, {});
  const e = estado.erros ?? {};
  return (
    <form key={estado.ok ?? "f"} action={acao} className="space-y-4" noValidate>
      <Campo nome="atual" rotulo="Senha atual" type="password" autoComplete="current-password" obrigatorio erro={e.atual} />
      <Campo nome="nova" rotulo="Nova senha" type="password" autoComplete="new-password" obrigatorio erro={e.nova} ajuda="Mínimo de 10 caracteres, com letras e números." />
      <Campo nome="confirmacao" rotulo="Confirme a nova senha" type="password" autoComplete="new-password" obrigatorio erro={e.confirmacao} />
      <Retorno estado={estado} />
      <div className="flex justify-end"><BotaoEnviar>Alterar senha</BotaoEnviar></div>
    </form>
  );
}
