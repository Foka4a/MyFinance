import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { monthRange } from '../lib/txQuery.js'
import { formatPeriodLabel } from '../lib/chartFormat.js'
import { DateRangeField } from '../components/DateField.jsx'
import StatCard from '../components/StatCard.jsx'
import LinhaFluxo from '../components/LinhaFluxo.jsx'
import BarrasFluxo from '../components/BarrasFluxo.jsx'
import { SkeletonChart, SkeletonRows } from '../components/Skeleton.jsx'
import { EmptyState, ErrorNote, Money, PageHeader, Segmented, card, th } from '../components/ui.jsx'

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
      final: items.length ? items[items.length - 1].cumulativeCents : (data?.openingCents ?? 0),
    }),
    [items, data]
  )

  // A API devolve uma linha por dia/mes do periodo, zerada inclusive: "vazio" e
  // nao ter movimento nenhum, e na visao diaria a tabela so lista os dias com movimento.
  const moved = items.filter((i) => i.incomeCents || i.expenseCents)
  const rows = granularity === 'day' ? moved : items
  const empty = !loading && !error && moved.length === 0

  return (
    <div>
      <PageHeader title="Fluxo de caixa" lede="O que entrou, o que saiu e como o saldo se moveu no período.">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeField from={period.from} to={period.to} onChange={setPeriod} />
          <Segmented
            label="Agrupar por"
            value={granularity}
            onChange={setGranularity}
            options={[
              {
                value: 'day',
                label: 'Diário',
                disabled: dayBlocked,
                title: dayBlocked ? 'Período muito longo para visão diária' : undefined,
              },
              { value: 'month', label: 'Mensal' },
            ]}
          />
        </div>
      </PageHeader>

      {error ? (
        <ErrorNote className="mb-6">Não foi possível carregar o fluxo de caixa: {error.message}</ErrorNote>
      ) : (
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Saldo inicial" valueCents={data?.openingCents} loading={loading} />
          <StatCard label="Entradas" valueCents={totals.income} tone="jade" loading={loading} />
          <StatCard label="Saídas" valueCents={totals.expense} tone="vinho" loading={loading} />
          <StatCard
            label="Saldo no fim do período"
            valueCents={totals.final}
            tone="auto"
            emphasis
            loading={loading}
          />
        </section>
      )}

      {empty ? (
        <div className={card}>
          <EmptyState
            title="Nenhuma movimentação no período"
            hint="Escolha outras datas ou registre um lançamento para ver o fluxo desenhado aqui."
          />
        </div>
      ) : !error ? (
        <>
          <div className="mb-5 flex flex-col gap-5">
            <section className={`${card} p-[22px]`}>
              <h2 className="mb-4 text-sm font-semibold text-ink">Evolução do saldo acumulado</h2>
              {loading ? <SkeletonChart /> : <div className="h-[220px]">
                <LinhaFluxo items={items} granularity={granularity} />
              </div>}
            </section>
            <section className={`${card} p-[22px]`}>
              <h2 className="mb-4 text-sm font-semibold text-ink">Entradas e saídas</h2>
              {loading ? <SkeletonChart /> : <div className="h-[220px]">
                <BarrasFluxo items={items} granularity={granularity} />
              </div>}
            </section>
          </div>

          <div className={`${card} overflow-hidden`}>
            {loading ? (
              <SkeletonRows rows={6} cols={5} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Período</th>
                    <th className={`${th} text-right`}>Entradas</th>
                    <th className={`${th} text-right`}>Saídas</th>
                    <th className={`${th} text-right`}>Resultado</th>
                    <th className={`${th} text-right`}>Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.period} className="border-t border-line transition-colors hover:bg-surface-2">
                      <td className="money px-5 py-3.5 text-ink">{formatPeriodLabel(item.period, granularity)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Money cents={item.incomeCents} tone={item.incomeCents ? 'jade' : 'muted'} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Money cents={item.expenseCents} tone={item.expenseCents ? 'vinho' : 'muted'} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Money cents={item.netCents} tone="auto" />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Money cents={item.cumulativeCents} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
