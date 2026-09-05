import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { formatBRL } from '../lib/format.js'
import { monthRange } from '../lib/txQuery.js'
import { formatPeriodLabel } from '../lib/chartFormat.js'
import StatCard from '../components/StatCard.jsx'
import LinhaFluxo from '../components/LinhaFluxo.jsx'
import BarrasFluxo from '../components/BarrasFluxo.jsx'
import { SkeletonCard, SkeletonTable } from '../components/Skeleton.jsx'

const DAY_LIMIT = 400 // API rejeita granularity=day acima disso
const DEFAULT_GRANULARITY_THRESHOLD = 62 // dias

function periodDays(from, to) {
  const ms = new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)
  return Math.round(ms / 86400000) + 1
}

export default function FluxoCaixa() {
  const [period, setPeriod] = useState(monthRange())
  const days = periodDays(period.from, period.to)
  const [granularity, setGranularity] = useState(days <= DEFAULT_GRANULARITY_THRESHOLD ? 'day' : 'month')

  const dayBlocked = days > DAY_LIMIT
  useEffect(() => {
    if (dayBlocked && granularity === 'day') setGranularity('month')
  }, [dayBlocked, granularity])

  const path = `/cashflow?from=${period.from}&to=${period.to}&granularity=${granularity}`
  const { data, loading, error } = useApi(path)

  const items = data?.items ?? []
  const totals = useMemo(
    () => ({
      income: items.reduce((sum, i) => sum + i.incomeCents, 0),
      expense: items.reduce((sum, i) => sum + i.expenseCents, 0),
      final: items.length ? items[items.length - 1].cumulativeCents : data?.openingCents ?? 0,
    }),
    [items, data]
  )

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Fluxo de Caixa</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="fluxo-from" className="text-sm text-slate-600">
            De
          </label>
          <input
            id="fluxo-from"
            type="date"
            value={period.from}
            onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <label htmlFor="fluxo-to" className="text-sm text-slate-600">
            Até
          </label>
          <input
            id="fluxo-to"
            type="date"
            value={period.to}
            onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
          <button
            type="button"
            disabled={dayBlocked}
            onClick={() => setGranularity('day')}
            title={dayBlocked ? 'Período muito longo para visão diária' : undefined}
            className={`rounded-md px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
              granularity === 'day' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Diário
          </button>
          <button
            type="button"
            onClick={() => setGranularity('month')}
            className={`rounded-md px-3 py-1 text-sm ${
              granularity === 'month' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-rose-600 shadow-sm">
          Não foi possível carregar o fluxo de caixa: {error.message}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Saldo inicial" valueCents={data?.openingCents} loading={loading} />
          <StatCard label="Entradas" valueCents={totals.income} loading={loading} />
          <StatCard label="Saídas" valueCents={totals.expense} loading={loading} />
          <StatCard label="Saldo acumulado no fim do período" valueCents={totals.final} loading={loading} />
        </div>
      )}

      {loading ? (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !error && items.length === 0 ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Nenhuma movimentação no período
        </div>
      ) : !error ? (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-900">Evolução do saldo acumulado</p>
            <LinhaFluxo items={items} granularity={granularity} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-900">Entradas x saídas</p>
            <BarrasFluxo items={items} granularity={granularity} />
          </div>
        </div>
      ) : null}

      {loading ? (
        <SkeletonTable rows={6} />
      ) : !error && items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Período
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Entradas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Saídas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Resultado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Saldo acumulado
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.period} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{formatPeriodLabel(item.period, granularity)}</td>
                  <td className="px-4 py-3 text-emerald-600">{formatBRL(item.incomeCents)}</td>
                  <td className="px-4 py-3 text-rose-600">{formatBRL(item.expenseCents)}</td>
                  <td className={`px-4 py-3 font-medium ${item.netCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatBRL(item.netCents)}
                  </td>
                  <td className="px-4 py-3">{formatBRL(item.cumulativeCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
