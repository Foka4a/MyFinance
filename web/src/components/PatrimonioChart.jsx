import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { formatBRLShort } from '../lib/chartFormat.js'
import { C, axisX, axisY } from '../lib/chartTheme.js'
import { SkeletonChart } from './Skeleton.jsx'
import { card, EmptyState, ErrorNote, Segmented } from './ui.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

export const WINDOWS = [
  { value: 6, label: '6 m' },
  { value: 12, label: '12 m' },
  { value: 24, label: '24 m' },
]

function toISODate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function periodRange(months) {
  const today = new Date()
  const to = toISODate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())))
  const fromDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() - (months - 1), 1))
  return { from: toISODate(fromDate), to }
}

function periodLabel(period) {
  const [y, m] = period.split('-')
  return `${m}/${y}`
}

export default function PatrimonioChart({ hasAccounts, months, onMonthsChange, data, loading, error }) {
  const items = data ?? []

  return (
    <section className={`${card} p-[22px]`}>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Crescimento de patrimônio</h2>
        <Segmented label="Janela do gráfico" value={months} onChange={onMonthsChange} options={WINDOWS} />
      </div>

      {loading ? (
        <SkeletonChart />
      ) : error ? (
        <ErrorNote>Não foi possível carregar o histórico: {error.message}</ErrorNote>
      ) : !hasAccounts || items.length === 0 ? (
        <EmptyState
          title="Sem histórico de patrimônio ainda"
          hint="Registre o valor de uma conta de investimento para começar a linha."
        />
      ) : (
        <div className="h-[220px]">
          <Line
            data={{
              labels: items.map((i) => periodLabel(i.period)),
              datasets: [
                {
                  label: 'Patrimônio',
                  data: items.map((i) => i.totalCents / 100),
                  borderColor: C.azul,
                  backgroundColor: C.azulFill,
                  borderWidth: 2,
                  fill: 'origin',
                  tension: 0.25,
                  // Um ponto so nao desenha linha: mostra a bolinha pra nao ficar vazio.
                  pointRadius: items.length === 1 ? 4 : 0,
                  pointHoverRadius: 5,
                  pointHoverBorderWidth: 2,
                  pointHoverBorderColor: C.surface,
                  pointHoverBackgroundColor: C.azul,
                },
              ],
            }}
            options={{
              responsive: true,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                tooltip: {
                  callbacks: { label: (ctx) => formatBRL(Math.round(ctx.parsed.y * 100)) },
                },
              },
              scales: {
                x: axisX,
                y: axisY((value) => formatBRLShort(value * 100)),
              },
            }}
          />
        </div>
      )}
    </section>
  )
}
