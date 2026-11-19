// Campos de formulário reutilizáveis (sem estado — funcionam em componentes cliente e servidor).

export const classeBotaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-marinho-800 disabled:opacity-60";
export const classeBotaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";

const classeEntrada =
  "mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2";
const classeNormal = "border-slate-300 focus:border-marinho-600 focus:ring-marinho-600/20";
const classeErro = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

interface Base {
  nome: string;
  rotulo: string;
  erro?: string[];
  ajuda?: string;
  obrigatorio?: boolean;
  className?: string;
}

function Rotulo({ nome, rotulo, obrigatorio }: Pick<Base, "nome" | "rotulo" | "obrigatorio">) {
  return (
    <label htmlFor={nome} className="block text-sm font-medium text-slate-700">
      {rotulo}
      {obrigatorio && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
    </label>
  );
}

function Rodape({ nome, erro, ajuda }: Pick<Base, "nome" | "erro" | "ajuda">) {
  if (erro?.length) {
    return <p id={`${nome}-erro`} className="mt-1 text-xs text-red-600">{erro[0]}</p>;
  }
  if (ajuda) return <p id={`${nome}-ajuda`} className="mt-1 text-xs text-slate-500">{ajuda}</p>;
  return null;
}

const descricao = (nome: string, erro?: string[], ajuda?: string) =>
  erro?.length ? `${nome}-erro` : ajuda ? `${nome}-ajuda` : undefined;

export function Campo({
  nome, rotulo, erro, ajuda, obrigatorio, className = "", ...props
}: Base & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  return (
    <div className={className}>
      <Rotulo nome={nome} rotulo={rotulo} obrigatorio={obrigatorio} />
      <input
        id={nome}
        name={nome}
        required={obrigatorio}
        aria-invalid={erro?.length ? true : undefined}
        aria-describedby={descricao(nome, erro, ajuda)}
        className={`${classeEntrada} ${erro?.length ? classeErro : classeNormal}`}
        {...props}
      />
      <Rodape nome={nome} erro={erro} ajuda={ajuda} />
    </div>
  );
}

export function CampoSelecao({
  nome, rotulo, erro, ajuda, obrigatorio, className = "", opcoes, vazio, ...props
}: Base & {
  opcoes: { valor: string; rotulo: string }[];
  vazio?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "id">) {
  return (
    <div className={className}>
      <Rotulo nome={nome} rotulo={rotulo} obrigatorio={obrigatorio} />
      <select
        id={nome}
        name={nome}
        required={obrigatorio}
        aria-invalid={erro?.length ? true : undefined}
        aria-describedby={descricao(nome, erro, ajuda)}
        className={`${classeEntrada} ${erro?.length ? classeErro : classeNormal}`}
        {...props}
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
      <Rodape nome={nome} erro={erro} ajuda={ajuda} />
    </div>
  );
}

export function CampoTextoLongo({
  nome, rotulo, erro, ajuda, obrigatorio, className = "", ...props
}: Base & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">) {
  return (
    <div className={className}>
      <Rotulo nome={nome} rotulo={rotulo} obrigatorio={obrigatorio} />
      <textarea
        id={nome}
        name={nome}
        rows={3}
        aria-invalid={erro?.length ? true : undefined}
        aria-describedby={descricao(nome, erro, ajuda)}
        className={`${classeEntrada} ${erro?.length ? classeErro : classeNormal}`}
        {...props}
      />
      <Rodape nome={nome} erro={erro} ajuda={ajuda} />
    </div>
  );
}

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="sr-only">{titulo}</legend>
      <h2 className="font-semibold text-marinho-900">{titulo}</h2>
      {descricao && <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-6">{children}</div>
    </fieldset>
  );
}

export function AvisoErro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {mensagem}
    </p>
  );
}
