import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/fluxo', label: 'Fluxo de Caixa' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/contas', label: 'Contas e Investimentos' },
]

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 text-slate-300 flex flex-col">
        <div className="px-6 py-5 text-lg font-semibold text-white">
          MyFinance
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="ml-60 flex-1 p-6">{children}</main>
    </div>
  )
}
