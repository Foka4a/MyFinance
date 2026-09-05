import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { formatBRLShort, formatPeriodLabel } from '../lib/chartFormat.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

export default function LinhaFluxo({ items, granularity }) {
  return (
    <Line
      data={{
        labels: items.map((i) => formatPeriodLabel(i.period, granularity)),
        datasets: [
          {
            label: 'Saldo acumulado',
            data: items.map((i) => i.cumulativeCents / 100),
            borderColor: '#0f172a',
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5,
            pointBackgroundColor: '#0f172a',
          },
        ],
      }}
      options={{
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `Saldo: ${formatBRL(Math.round(ctx.parsed.y * 100))}`,
            },
          },
        },
        scales: {
          y: {
            ticks: { callback: (value) => formatBRLShort(value * 100) },
          },
        },
      }}
    />
  )
}
