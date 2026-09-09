import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { formatBRL } from '../lib/format.js'
import { formatBRLShort, formatPeriodLabel } from '../lib/chartFormat.js'
import { C, axisX, axisY } from '../lib/chartTheme.js'

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
            backgroundColor: C.jade,
          },
          {
            label: 'Saídas',
            data: items.map((i) => i.expenseCents / 100),
            backgroundColor: C.vinho,
          },
        ],
      }}
      options={{
        interaction: { mode: 'index', intersect: false },
        borderRadius: 4,
        borderSkipped: 'bottom',
        maxBarThickness: 26,
        datasets: { bar: { categoryPercentage: 0.7, barPercentage: 0.85 } },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatBRL(Math.round(ctx.parsed.y * 100))}`,
            },
          },
        },
        scales: {
          x: axisX,
          y: axisY((value) => formatBRLShort(value * 100)),
        },
      }}
    />
  )
}
