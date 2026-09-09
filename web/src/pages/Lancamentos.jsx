import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { useApi } from '../hooks/useApi.js'
import { del } from '../lib/api.js'
import { formatDate } from '../lib/format.js'
import { buildTransactionsQuery, monthRange } from '../lib/txQuery.js'
import { DateRangeField } from '../components/DateField.jsx'
import StatCard from '../components/StatCard.jsx'
import { SkeletonRows } from '../components/Skeleton.jsx'
import TransactionForm from '../components/TransactionForm.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  Dot,
  EmptyState,
  ErrorNote,
  Money,
  PageHeader,
  btnGhost,
  btnLink,
  btnLinkDanger,
  btnPrimary,
  card,
  inputSm,
  th,
} from '../components/ui.jsx'

const PAGE_SIZE = 20
const DEFAULT_FILTERS = { ...monthRange(), kind: '', categoryId: '', accountId: '' }

function SortableHeader({ label, column, sort, onSort, align = 'left' }) {
  const active = sort.column === column
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      aria-label={`Ordenar por ${label}`}
      className={`flex w-full items-center gap-1.5 text-inherit uppercase tracking-[inherit] transition-colors ${
        align === 'right' ? 'justify-end' : ''
      } ${active ? 'text-ink' : 'hover:text-ink-2'}`}
    >
      {label}
      <svg
        width="7"
        height="7"
        viewBox="0 0 10 10"
        aria-hidden="true"
        className={`transition-[opacity,transform] ${active ? 'opacity-100' : 'opacity-0'} ${
          active && sort.order === 'desc' ? 'rotate-180' : ''
        }`}
      >
        <path d="M5 1.5 9 8.5H1z" fill="currentColor" />
      </svg>
    </button>
  )
}

export default function Lancamentos() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState({ column: 'date', order: 'desc' })
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmRequest, setConfirmRequest] = useState(null)

  const { data: categories } = useApi('/categories')
  const { data: accounts } = useApi('/accounts')

  const txPath = `/transactions?${buildTransactionsQuery(filters, sort, page, PAGE_SIZE)}`
  const { data: txData, loading: txLoading, error: txError, reload: reloadTx } = useApi(txPath)

  const summaryPath = `/summary?from=${filters.from}&to=${filters.to}`
  const { data: summary, loading: totalsLoading, reload: reloadSummary } = useApi(summaryPath)

  // Tabela e cards vem de rotas diferentes: salvar/excluir precisa recarregar as duas.
  function reloadAll() {
    reloadTx()
    reloadSummary()
  }

  useEffect(() => {
    setPage(1)
  }, [filters])

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'kind' ? { categoryId: '' } : {}) }))
  }

  function toggleSort(column) {
    setSort((s) =>
      s.column === column ? { column, order: s.order === 'asc' ? 'desc' : 'asc' } : { column, order: 'asc' }
    )
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(tx) {
    setEditing(tx)
    setModalOpen(true)
  }

  function handleSaved() {
    setModalOpen(false)
    reloadAll()
  }

  function askDelete(tx) {
    setConfirmRequest({
      title: 'Excluir lançamento',
      description: `"${tx.description}" de ${formatDate(tx.date)} sai da lista e dos saldos. Não dá para desfazer.`,
      confirmLabel: 'Excluir lançamento',
      onConfirm: async () => {
        await del(`/transactions/${tx.id}`)
        reloadAll()
      },
    })
  }

  const filteredCategories = (categories ?? []).filter((c) => !filters.kind || c.kind === filters.kind)
  const hintPeriodoCompleto = filters.categoryId || filters.accountId ? 'período completo' : null
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  const columns = useMemo(
    () => [
      {
        id: 'date',
        header: () => <SortableHeader label="Data" column="date" sort={sort} onSort={toggleSort} />,
        cell: ({ row }) => <span className="money text-ink-3">{formatDate(row.original.date)}</span>,
      },
      {
        id: 'description',
        header: () => <SortableHeader label="Descrição" column="description" sort={sort} onSort={toggleSort} />,
        cell: ({ row }) => <span className="text-ink">{row.original.description}</span>,
      },
      {
        id: 'category',
        header: () => <span>Categoria</span>,
        cell: ({ row }) =>
          row.original.categoryName ? (
            <span className="inline-flex items-center gap-[7px] text-[12.5px] text-ink-2">
              <Dot color={row.original.categoryColor ?? '#70757c'} />
              {row.original.categoryName}
            </span>
          ) : (
            <span className="text-[12.5px] text-ink-3">Sem categoria</span>
          ),
      },
      {
        id: 'account',
        header: () => <span>Conta</span>,
        cell: ({ row }) => <span className="text-[12.5px] text-ink-2">{row.original.accountName}</span>,
      },
      {
        id: 'amount',
        header: () => (
          <SortableHeader label="Valor" column="amountCents" sort={sort} onSort={toggleSort} align="right" />
        ),
        cell: ({ row }) => {
          const isIncome = row.original.kind === 'income'
          return (
            <div className="text-right">
              <Money
                cents={row.original.amountCents}
                sign={isIncome ? '+' : '−'}
                tone={isIncome ? 'jade' : 'vinho'}
              />
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => openEdit(row.original)}
              className={`${btnLink} text-[12.5px]`}
              aria-label={`Editar lançamento ${row.original.description}`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => askDelete(row.original)}
              className={`${btnLinkDanger} text-[12.5px]`}
              aria-label={`Excluir lançamento ${row.original.description}`}
            >
              Excluir
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sort]
  )

  const table = useReactTable({
    data: txData?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const total = txData?.total ?? 0
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(page * PAGE_SIZE, total)

  return (
    <div>
      <PageHeader title="Lançamentos" lede="Toda entrada e saída registrada, com filtros por período, tipo, categoria e conta.">
        <button type="button" onClick={openNew} className={btnPrimary}>
          Novo lançamento
        </button>
      </PageHeader>

      {/* Uma linha so, como no design. Os selects se nomeiam pela propria opcao
          padrao ("Todos os tipos"), entao o rotulo visivel fica em sr-only. */}
      <div className={`${card} mb-5 flex flex-wrap items-center gap-3 p-4`}>
        <DateRangeField
          from={filters.from}
          to={filters.to}
          onChange={({ from, to }) => setFilters((f) => ({ ...f, from, to }))}
        />

        <label htmlFor="filter-kind" className="sr-only">
          Tipo
        </label>
        <select
          id="filter-kind"
          value={filters.kind}
          onChange={(e) => updateFilter('kind', e.target.value)}
          className={inputSm}
        >
          <option value="">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>

        <label htmlFor="filter-category" className="sr-only">
          Categoria
        </label>
        <select
          id="filter-category"
          value={filters.categoryId}
          onChange={(e) => updateFilter('categoryId', e.target.value)}
          className={inputSm}
        >
          <option value="">Todas as categorias</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label htmlFor="filter-account" className="sr-only">
          Conta
        </label>
        <select
          id="filter-account"
          value={filters.accountId}
          onChange={(e) => updateFilter('accountId', e.target.value)}
          className={inputSm}
        >
          <option value="">Todas as contas</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {dirty && (
          <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className={btnLink}>
            Limpar filtros
          </button>
        )}
      </div>

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Receitas"
          valueCents={summary?.incomeCents ?? 0}
          tone="jade"
          hint={hintPeriodoCompleto}
          loading={totalsLoading}
        />
        <StatCard
          label="Despesas"
          valueCents={summary?.expenseCents ?? 0}
          tone="vinho"
          hint={hintPeriodoCompleto}
          loading={totalsLoading}
        />
        <StatCard
          label="Resultado"
          valueCents={summary?.netCents ?? 0}
          tone="auto"
          hint={hintPeriodoCompleto}
          loading={totalsLoading}
        />
      </section>

      {txError ? (
        <ErrorNote>Não foi possível carregar os lançamentos: {txError.message}</ErrorNote>
      ) : (
        <div className={`${card} overflow-hidden`}>
          {txLoading ? (
            <SkeletonRows rows={8} cols={5} />
          ) : (txData?.items ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum lançamento encontrado"
              hint={
                dirty
                  ? 'Nenhum lançamento bate com esses filtros. Limpe os filtros ou registre um novo.'
                  : 'Comece registrando a primeira entrada ou saída.'
              }
              action={
                <button type="button" onClick={openNew} className={btnPrimary}>
                  Novo lançamento
                </button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className={th}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-line transition-colors hover:bg-surface-2"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-5 py-3.5 text-[13.5px]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-line bg-surface-2 px-5 py-3.5 text-[12.5px] text-ink-3">
                <span>
                  <span className="money">
                    {startIdx}–{endIdx}
                  </span>{' '}
                  de <span className="money">{total}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`${btnGhost} px-3.5 py-1.5 text-[12.5px]`}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * PAGE_SIZE >= total}
                    className={`${btnGhost} px-3.5 py-1.5 text-[12.5px]`}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <TransactionForm
        open={modalOpen}
        editing={editing}
        categories={categories ?? []}
        accounts={accounts ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}
