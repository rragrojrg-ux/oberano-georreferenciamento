/**
 * Marca SOBERANO (versão vetorial provisória).
 * Para usar a logomarca oficial, coloque o arquivo em /public/logo-oficial.png e troque o <svg>
 * por <Image src="/logo-oficial.png" … /> — veja README, seção "Identidade visual".
 */
export function LogoSimbolo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#06132b" />
      <circle cx="32" cy="30" r="17" fill="none" stroke="#c9a227" strokeWidth="3" />
      <ellipse cx="32" cy="30" rx="7" ry="17" fill="none" stroke="#c9a227" strokeWidth="2" />
      <path d="M15 30h34M18 21h28M18 39h28" stroke="#c9a227" strokeWidth="2" fill="none" />
      <path d="M32 47l-5 8h10z" fill="#c9a227" />
    </svg>
  );
}

export function Logo({ compacto = false, claro = true }: { compacto?: boolean; claro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoSimbolo className="size-10 shrink-0" />
      {!compacto && (
        <div className="leading-tight">
          <div className={`text-base font-bold tracking-[0.18em] ${claro ? "text-white" : "text-marinho-900"}`}>
            SOBERANO
          </div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-dourado-500">GEORREFERENCIAMENTO</div>
        </div>
      )}
    </div>
  );
}
