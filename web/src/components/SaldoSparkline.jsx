import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { formatPeriodLabel } from '../lib/chartFormat.js'
import { C } from '../lib/chartTheme.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

// ponytail: gradiente scriptable — no primeiro render chart.chartArea ainda e
// undefined (Chart.js so calcula depois do layout), entao devolvemos a cor
// solida nesse frame pra nao quebrar; o proximo render ja traz o degrade.
function gradientFor(color) {
  return (ctx) => {
    const { chart } = ctx
    const area = chart.chartArea
    if (!area) return color
    const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom)
    gradient.addColorStop(0, `${color}47`) // ~0.28 alpha
    gradient.addColorStop(1, `${color}00`)
    return gradient
  }
}

export default function SaldoSparkline({ items, pct }) {
  const bad = pct != null && pct < 0
  const color = bad ? C.vinho : C.jade
  const labels = items.map((i) => formatPeriodLabel(i.period, 'day'))
  const last = labels.length - 1

  return (
    <div className="w-full">
      <div className="h-[90px] w-full">
        <Line
          data={{
            labels,
            datasets: [
              {
                data: items.map((i) => i.cumulativeCents / 100),
                borderColor: color,
                backgroundColor: gradientFor(color),
                borderWidth: 2,
                fill: 'origin',
                tension: 0.35,
                // So o ultimo ponto e marcado (spec): e o valor que o numero do hero mostra.
                pointRadius: (ctx) => (ctx.dataIndex === last ? 4 : 0),
                pointBackgroundColor: color,
                pointBorderWidth: 0,
              },
            ],
          }}
          options={{
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (ctx) => `Saldo acumulado · ${ctx[0].label}`,
                  label: (ctx) => formatBRL(Math.round(ctx.parsed.y * 100)),
                },
              },
            },
            scales: {
              x: { display: false },
              y: { display: false },
            },
          }}
        />
      </div>
      <div className="money mt-1 flex justify-between text-[11px] text-ink-3">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(last / 2)]}</span>
        <span>{labels[last]}</span>
      </div>
    </div>
  )
}
