import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/fluxo', label: 'Fluxo de caixa' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/contas', label: 'Contas' },
]

// A marca e o proprio assunto do app: tres barras subindo. As cores sao as
// mesmas das series dos graficos, entao o logo ja apresenta a paleta.
function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex h-[18px] items-end gap-0.5" aria-hidden="true">
        <span className="w-1 rounded-[1px] bg-[oklch(0.74_0.13_195)]" style={{ height: 8 }} />
        <span className="w-1 rounded-[1px] bg-azul" style={{ height: 14 }} />
        <span className="w-1 rounded-[1px] bg-jade" style={{ height: 18 }} />
      </div>
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">MyFinance</span>
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen md:flex">
      <header className="sticky top-0 z-30 border-b border-line bg-surface md:h-screen md:w-[236px] md:shrink-0 md:flex-col md:border-b-0 md:border-r md:py-[22px] md:px-3.5 md:flex">
        <div className="flex items-center justify-between gap-4 px-3.5 py-4 md:px-0 md:py-0">
          <Brand />
        </div>

        <nav
          aria-label="Seções"
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-[26px] md:flex-col md:overflow-visible md:px-0 md:pb-0"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`size-1.5 shrink-0 rounded-[2px] transition-colors ${
                      isActive ? 'bg-azul' : 'bg-line'
                    }`}
                  />
                  {link.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <p className="mt-auto hidden px-2 text-[11.5px] leading-relaxed text-ink-3 md:block">
          Tudo fica neste computador.
          <br />
          Nenhum banco conectado.
        </p>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-6 md:px-9 md:pb-16 md:pt-8">{children}</div>
      </main>
    </div>
  )
}
