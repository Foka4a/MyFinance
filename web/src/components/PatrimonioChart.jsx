import { useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useApi } from '../hooks/useApi.js'
import { formatBRL } from '../lib/format.js'
import { SkeletonCard } from './Skeleton.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const WINDOWS = [
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
]

function toISODate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function periodRange(months) {
  const today = new Date()
  const to = toISODate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())))
  const fromDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() - (months - 1), 1))
  return { from: toISODate(fromDate), to }
}

function periodLabel(period) {
  const [y, m] = period.split('-')
  return `${m}/${y}`
}

function abbreviateBRL(cents) {
  const value = cents / 100
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')} mil`
  return formatBRL(cents)
}

export default function PatrimonioChart({ hasAccounts }) {
  const [months, setMonths] = useState(12)
  const { from, to } = periodRange(months)
  const { data, loading, error } = useApi(`/networth?from=${from}&to=${to}&granularity=month`)

  const items = data ?? []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Crescimento de patrimônio</h2>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setMonths(w.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                months === w.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <p className="text-sm text-rose-600">Não foi possível carregar o histórico: {error.message}</p>
      ) : !hasAccounts || items.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-500">
          Sem histórico de patrimônio ainda.
        </div>
      ) : (
        <div className="h-64">
          <Line
            data={{
              labels: items.map((i) => periodLabel(i.period)),
              datasets: [
                {
                  label: 'Patrimônio',
                  data: items.map((i) => i.totalCents / 100),
                  borderColor: '#0f172a',
                  backgroundColor: '#0f172a',
                  tension: 0.25,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (ctx) => formatBRL(Math.round(ctx.parsed.y * 100)),
                  },
                },
              },
              scales: {
                y: {
                  ticks: {
                    callback: (value) => abbreviateBRL(value * 100),
                  },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  )
}
