import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { C } from '../lib/chartTheme.js'
import { SkeletonDonut } from './Skeleton.jsx'
import { Dot, card, EmptyState, ErrorNote, Money } from './ui.jsx'

ChartJS.register(ArcElement, Tooltip)

function pct(part, total) {
  if (!total) return '0,0%'
  return `${((part / total) * 100).toFixed(1).replace('.', ',')}%`
}

export default function DonutGastos({ data, loading, error }) {
  const items = data ?? []
  const total = items.reduce((sum, i) => sum + i.totalCents, 0)

  return (
    <section className={`${card} p-5`}>
      <h2 className="mb-[18px] text-sm font-semibold text-ink">Gastos por categoria</h2>

      {loading ? (
        <SkeletonDonut />
      ) : error ? (
        <ErrorNote>Não foi possível carregar os gastos: {error.message}</ErrorNote>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum gasto no período" hint="Ajuste as datas ou registre uma despesa." />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative size-[168px] shrink-0">
            <Doughnut
              data={{
                labels: items.map((i) => i.name),
                datasets: [
                  {
                    data: items.map((i) => i.totalCents),
                    backgroundColor: items.map((i) => i.color),
                    borderColor: C.surface,
                    borderWidth: 2,
                    hoverOffset: 6,
                  },
                ],
              }}
              options={{
                cutout: '68%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${formatBRL(ctx.parsed)} (${pct(ctx.parsed, total)})`,
                    },
                  },
                },
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="money text-[19px] font-semibold text-ink">{formatBRL(total)}</span>
              <span className="mt-0.5 text-[11px] text-ink-3">no período</span>
            </div>
          </div>

          <ul className="flex w-full flex-col gap-2.5">
            {items.map((i) => (
              <li key={i.categoryId ?? 'sem-categoria'} className="flex items-center gap-2.5 text-[13px]">
                <Dot color={i.color} className="size-2.5" />
                <span className="min-w-0 flex-1 truncate text-ink">{i.name}</span>
                <span className="money shrink-0 text-xs text-ink-3">{pct(i.totalCents, total)}</span>
                <Money cents={i.totalCents} className="w-24 shrink-0 text-right" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
