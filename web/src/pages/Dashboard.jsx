import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { formatDate } from '../lib/format.js'
import { monthRange, toISODate } from '../lib/txQuery.js'
import { DateRangeField } from '../components/DateField.jsx'
import StatCard from '../components/StatCard.jsx'
import DonutGastos from '../components/DonutGastos.jsx'
import { SkeletonList } from '../components/Skeleton.jsx'
import { Dot, EmptyState, ErrorNote, Money, PageHeader, Segmented, btnLink, card } from '../components/ui.jsx'

function weekRange(now = new Date()) {
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: toISODate(monday), to: toISODate(sunday) }
}

// Pontos dos cards: mesmas cores dos tokens, aqui em hex porque viram style inline.
const SERIES = { jade: '#50d492', vinho: '#f96f70', azul: '#8a9bff', ouro: '#eba941', muted: '#70757c' }

const WEEK = weekRange()
const MONTH = monthRange()

const PRESETS = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
]

export default function Dashboard() {
  const [period, setPeriod] = useState(MONTH)

  const preset =
    period.from === WEEK.from && period.to === WEEK.to
      ? 'week'
      : period.from === MONTH.from && period.to === MONTH.to
        ? 'month'
        : null

  const summaryPath = `/summary?from=${period.from}&to=${period.to}`
  const { data: summary, loading: summaryLoading, error: summaryError } = useApi(summaryPath)

  const categoryPath = `/summary/by-category?from=${period.from}&to=${period.to}&kind=expense`
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useApi(categoryPath)

  const txPath = `/transactions?from=${period.from}&to=${period.to}&pageSize=5&sort=date&order=desc`
  const { data: txData, loading: txLoading, error: txError } = useApi(txPath)

  const comparacao = summary
    ? `Variação comparada com ${formatDate(summary.previous.from)} – ${formatDate(summary.previous.to)}.`
    : null

  return (
    <div>
      <PageHeader title="Dashboard" lede="Onde seu dinheiro está e para onde ele foi no período.">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Período"
            value={preset}
            onChange={(v) => setPeriod(v === 'week' ? WEEK : MONTH)}
            options={PRESETS}
          />
          <DateRangeField from={period.from} to={period.to} onChange={setPeriod} />
        </div>
      </PageHeader>

      {summaryError ? (
        <ErrorNote className="mb-8">Não foi possível carregar o resumo: {summaryError.message}</ErrorNote>
      ) : (
        <>
          <section className="mb-6">
            <StatCard
              variant="hero"
              label="Saldo atual · todas as contas"
              valueCents={summary?.balanceCents}
              variationPct={summary?.variation?.netPct}
              hint={comparacao}
              tone="auto"
              loading={summaryLoading}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Receitas"
              valueCents={summary?.incomeCents}
              variationPct={summary?.variation?.incomePct}
              dot={SERIES.jade}
              loading={summaryLoading}
            />
            <StatCard
              label="Despesas"
              valueCents={summary?.expenseCents}
              variationPct={summary?.variation?.expensePct}
              dot={SERIES.vinho}
              invertVariationColor
              loading={summaryLoading}
            />
            <StatCard
              label="Resultado líquido"
              valueCents={summary?.netCents}
              variationPct={summary?.variation?.netPct}
              dot={SERIES.azul}
              tone="auto"
              loading={summaryLoading}
            />
            <StatCard
              label="Disponível"
              valueCents={summary?.availableCents}
              dot={SERIES.ouro}
              hint="fora dos investimentos"
              loading={summaryLoading}
            />
          </section>
        </>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DonutGastos data={categories} loading={categoriesLoading} error={categoriesError} />

        <section className={`${card} flex flex-col p-5`}>
          <div className="mb-1 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-ink">Últimos lançamentos</h2>
            <Link to="/lancamentos" className={`${btnLink} text-[12.5px]`}>
              Ver todos →
            </Link>
          </div>

          {txLoading ? (
            <SkeletonList rows={5} />
          ) : txError ? (
            <ErrorNote>Não foi possível carregar os lançamentos: {txError.message}</ErrorNote>
          ) : (txData?.items ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum lançamento no período"
              hint="Registre uma entrada ou saída para ver o movimento aqui."
              action={
                <Link to="/lancamentos" className={btnLink}>
                  Ir para lançamentos
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft">
              {txData.items.map((tx) => {
                const isIncome = tx.kind === 'income'
                return (
                  <li key={tx.id} className="flex items-center gap-3 py-3.5">
                    <Dot color={tx.categoryColor ?? SERIES.muted} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-ink">{tx.description}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-3">
                        {[formatDate(tx.date), tx.categoryName, tx.accountName].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Money
                      cents={tx.amountCents}
                      sign={isIncome ? '+' : '−'}
                      tone={isIncome ? 'jade' : 'vinho'}
                      className="shrink-0 text-[13.5px]"
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
