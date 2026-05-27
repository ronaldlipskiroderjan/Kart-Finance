/**
 * PageHeader — cabeçalho de página padronizado.
 *
 * Props:
 *   icon      — ícone Lucide (identifica a seção, igual ao usado na Sidebar/BottomNav)
 *   subtitle  — descrição curta da página (opcional)
 *   iconColor — classe de cor do ícone   (default: text-emerald-400)
 *   iconBg    — classe de fundo do ícone (default: bg-emerald-500/15)
 *   left      — elemento à esquerda do ícone (ex.: botão Voltar)
 *   children  — botões de ação no lado direito
 */
export default function PageHeader({
  icon: Icon,
  subtitle,
  iconColor = 'text-emerald-400',
  iconBg    = 'bg-emerald-500/15',
  left,
  children,
}) {
  return (
    <header
      className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >

      <div className="flex items-center gap-2 px-4 lg:px-8 py-2.5">

        {/* Botão esquerdo opcional (ex.: Voltar) */}
        {left && <div className="shrink-0">{left}</div>}

        {/* Ícone + Nome da equipe + Subtítulo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {Icon && (
            <div className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Icon size={14} className={iconColor} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm lg:text-[15px] font-black tracking-tight truncate leading-tight select-none">
              <span className="text-emerald-400">RA</span>
              <span className="text-zinc-100"> Kart Racing</span>
            </h1>
            {subtitle && (
              <p className="text-[10px] text-zinc-500 truncate leading-tight hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Ações à direita */}
        {children && (
          <div className="flex items-center gap-1.5 shrink-0">
            {children}
          </div>
        )}

      </div>
    </header>
  );
}
