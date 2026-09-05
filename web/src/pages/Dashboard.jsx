import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { formatBRL, formatDate } from '../lib/format.js'
import { monthRange, toISODate } from '../lib/txQuery.js'
import StatCard from '../components/StatCard.jsx'
import DonutGastos from '../components/DonutGastos.jsx'
import { SkeletonTable } from '../components/Skeleton.jsx'

function weekRange(now = new Date()) {
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: toISODate(monday), to: toISODate(sunday) }
}

const WEEK = weekRange()
const MONTH = monthRange()

export default function Dashboard() {
  const [period, setPeriod] = useState(MONTH)

  const isWeek = period.from === WEEK.from && period.to === WEEK.to
  const isMonth = period.from === MONTH.from && period.to === MONTH.to

  const summaryPath = `/summary?from=${period.from}&to=${period.to}`
  const { data: summary, loading: summaryLoading, error: summaryError } = useApi(summaryPath)

  const categoryPath = `/summary/by-category?from=${period.from}&to=${period.to}&kind=expense`
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useApi(categoryPath)

  const txPath = `/transactions?from=${period.from}&to=${period.to}&pageSize=5&sort=date&order=desc`
  const { data: txData, loading: txLoading, error: txError } = useApi(txPath)

  const variationHint = summary
    ? `vs ${formatDate(summary.previous.from)} a ${formatDate(summary.previous.to)}`
    : null

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Dashboard</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setPeriod(WEEK)}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            isWeek ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Esta semana
        </button>
        <button
          type="button"
          onClick={() => setPeriod(MONTH)}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            isMonth ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Este mês
        </button>
        <div className="flex items-center gap-2">
          <label htmlFor="period-from" className="text-sm text-slate-600">
            De
          </label>
          <input
            id="period-from"
            type="date"
            value={period.from}
            onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <label htmlFor="period-to" className="text-sm text-slate-600">
            Até
          </label>
          <input
            id="period-to"
            type="date"
            value={period.to}
            onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {summaryError ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-rose-600 shadow-sm">
          Não foi possível carregar o resumo: {summaryError.message}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Saldo atual"
            valueCents={summary?.balanceCents}
            hint="patrimônio total"
            loading={summaryLoading}
          />
          <StatCard
            label="Receitas"
            valueCents={summary?.incomeCents}
            variationPct={summary?.variation?.incomePct}
            hint={variationHint}
            loading={summaryLoading}
          />
          <StatCard
            label="Despesas"
            valueCents={summary?.expenseCents}
            variationPct={summary?.variation?.expensePct}
            invertVariationColor
            hint={variationHint}
            loading={summaryLoading}
          />
          <StatCard
            label="Resultado líquido"
            valueCents={summary?.netCents}
            variationPct={summary?.variation?.netPct}
            hint={variationHint}
            loading={summaryLoading}
          />
          <StatCard
            label="Disponível"
            valueCents={summary?.availableCents}
            hint="fora investimentos"
            loading={summaryLoading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutGastos data={categories} loading={categoriesLoading} error={categoriesError} />

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">Últimos lançamentos</p>
            <Link to="/lancamentos" className="text-sm text-slate-500 hover:text-slate-900">
              Ver todos
            </Link>
          </div>

          {txLoading ? (
            <SkeletonTable rows={5} />
          ) : txError ? (
            <p className="text-sm text-rose-600">Não foi possível carregar os lançamentos: {txError.message}</p>
          ) : (txData?.items ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Nenhum lançamento no período</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {txData.items.map((tx) => {
                const isIncome = tx.kind === 'income'
                return (
                  <li key={tx.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-900">{tx.description}</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(tx.date)}
                        {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                      </span>
                    </div>
                    <span className={`font-medium ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+ ' : '- '}
                      {formatBRL(tx.amountCents)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
