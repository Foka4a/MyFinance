import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { SkeletonCard } from './Skeleton.jsx'

ChartJS.register(ArcElement, Tooltip)

export default function DonutGastos({ data, loading, error }) {
  if (loading) return <SkeletonCard />

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-900 mb-3">Gastos por categoria</p>
        <p className="text-sm text-rose-600">Não foi possível carregar os gastos: {error.message}</p>
      </div>
    )
  }

  const items = data ?? []
  const total = items.reduce((sum, i) => sum + i.totalCents, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-900 mb-3">Gastos por categoria</p>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Nenhum gasto no período</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-48 w-48 shrink-0">
            <Doughnut
              data={{
                labels: items.map((i) => i.name),
                datasets: [
                  {
                    data: items.map((i) => i.totalCents),
                    backgroundColor: items.map((i) => i.color),
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const value = ctx.parsed
                        const pct = total === 0 ? 0 : (value / total) * 100
                        return `${ctx.label}: ${formatBRL(value)} (${pct.toFixed(1).replace('.', ',')}%)`
                      },
                    },
                  },
                },
              }}
            />
          </div>
          <ul className="flex w-full flex-col gap-2">
            {items.map((i) => (
              <li key={i.categoryId ?? 'sem-categoria'} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.color }} />
                  {i.name}
                </span>
                <span className="font-medium text-slate-900">{formatBRL(i.totalCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
