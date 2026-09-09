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
import { C, axisX, axisY } from '../lib/chartTheme.js'

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
            borderColor: C.azul,
            backgroundColor: C.azulFill,
            borderWidth: 2,
            fill: 'origin',
            tension: 0.3,
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
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `Saldo: ${formatBRL(Math.round(ctx.parsed.y * 100))}`,
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
