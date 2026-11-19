import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-dourado-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-marinho-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">A página não existe ou você não tem permissão para acessá-la.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white hover:bg-marinho-800">
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
