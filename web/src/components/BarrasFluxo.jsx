import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { formatBRLShort, formatPeriodLabel } from '../lib/chartFormat.js'

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

export default function BarrasFluxo({ items, granularity }) {
  return (
    <Bar
      data={{
        labels: items.map((i) => formatPeriodLabel(i.period, granularity)),
        datasets: [
          {
            label: 'Entradas',
            data: items.map((i) => i.incomeCents / 100),
            backgroundColor: '#10b981',
          },
          {
            label: 'Saídas',
            data: items.map((i) => i.expenseCents / 100),
            backgroundColor: '#f43f5e',
          },
        ],
      }}
      options={{
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatBRL(Math.round(ctx.parsed.y * 100))}`,
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
