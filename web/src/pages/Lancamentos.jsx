import { useEffect, useMemo, useState } from 'react'
import { flexRender } from '@tanstack/react-table'
// ponytail: installed @tanstack/react-table is v9, which dropped useReactTable/
// getCoreRowModel for a new features-based API. useLegacyTable is the official
// v8-compat bridge (same behavior, deprecated name) — use it instead of hand-
// rolling the v9 tableFeatures() setup for a table that only needs core rendering
// (sorting/pagination are server-side already). Upgrade to the native v9 API if
// this table grows client-side sorting/filtering needs.
import { useLegacyTable as useReactTable, getCoreRowModel } from '@tanstack/react-table/legacy'
import { useApi } from '../hooks/useApi.js'
import { del } from '../lib/api.js'
import { formatBRL, formatDate } from '../lib/format.js'
import { buildTransactionsQuery, monthRange } from '../lib/txQuery.js'
import StatCard from '../components/StatCard.jsx'
import { SkeletonTable } from '../components/Skeleton.jsx'
import TransactionForm from '../components/TransactionForm.jsx'

const PAGE_SIZE = 20
const DEFAULT_FILTERS = { ...monthRange(), kind: '', categoryId: '', accountId: '' }

function SortableHeader({ label, column, sort, onSort }) {
  const active = sort.column === column
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-700"
    >
      {label}
      {active && <span>{sort.order === 'asc' ? '▲' : '▼'}</span>}
    </button>
  )
}

export default function Lancamentos() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState({ column: 'date', order: 'desc' })
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: categories } = useApi('/categories')
  const { data: accounts } = useApi('/accounts')

  const txPath = `/transactions?${buildTransactionsQuery(filters, sort, page, PAGE_SIZE)}`
  const { data: txData, loading: txLoading, error: txError, reload: reloadTx } = useApi(txPath)

  const summaryPath = `/summary?from=${filters.from}&to=${filters.to}`
  const { data: summary, loading: totalsLoading } = useApi(summaryPath)

  useEffect(() => {
    setPage(1)
  }, [filters])

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'kind' ? { categoryId: '' } : {}) }))
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  function toggleSort(column) {
    setSort((s) => (s.column === column ? { column, order: s.order === 'asc' ? 'desc' : 'asc' } : { column, order: 'asc' }))
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(tx) {
    setEditing(tx)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function handleSaved() {
    setModalOpen(false)
    reloadTx()
  }

  async function handleDelete(tx) {
    if (!confirm(`Excluir o lançamento "${tx.description}"?`)) return
    await del(`/transactions/${tx.id}`)
    reloadTx()
  }

  const filteredCategories = (categories ?? []).filter((c) => !filters.kind || c.kind === filters.kind)
  const hintPeriodoCompleto = filters.categoryId || filters.accountId ? 'período completo' : null

  const columns = useMemo(
    () => [
      {
        id: 'date',
        header: () => <SortableHeader label="Data" column="date" sort={sort} onSort={toggleSort} />,
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        id: 'description',
        header: () => <SortableHeader label="Descrição" column="description" sort={sort} onSort={toggleSort} />,
        cell: ({ row }) => row.original.description,
      },
      {
        id: 'category',
        header: () => <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Categoria</span>,
        cell: ({ row }) =>
          row.original.categoryName ? (
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: row.original.categoryColor ?? '#64748b' }}
            >
              {row.original.categoryName}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: 'account',
        header: () => <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Conta</span>,
        cell: ({ row }) => row.original.accountName,
      },
      {
        id: 'amount',
        header: () => <SortableHeader label="Valor" column="amountCents" sort={sort} onSort={toggleSort} />,
        cell: ({ row }) => {
          const isIncome = row.original.kind === 'income'
          return (
            <span className={isIncome ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
              {isIncome ? '+ ' : '- '}
              {formatBRL(row.original.amountCents)}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ações</span>,
        cell: ({ row }) => (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => openEdit(row.original)}
              className="text-sm text-slate-500 hover:text-slate-900"
              aria-label={`Editar lançamento ${row.original.description}`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="text-sm text-rose-500 hover:text-rose-700"
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Lançamentos</h1>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Novo lançamento
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="filter-from" className="mb-1 block text-sm text-slate-600">
            De
          </label>
          <input
            id="filter-from"
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="mb-1 block text-sm text-slate-600">
            Até
          </label>
          <input
            id="filter-to"
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter-kind" className="mb-1 block text-sm text-slate-600">
            Tipo
          </label>
          <select
            id="filter-kind"
            value={filters.kind}
            onChange={(e) => updateFilter('kind', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-category" className="mb-1 block text-sm text-slate-600">
            Categoria
          </label>
          <select
            id="filter-category"
            value={filters.categoryId}
            onChange={(e) => updateFilter('categoryId', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-account" className="mb-1 block text-sm text-slate-600">
            Conta
          </label>
          <select
            id="filter-account"
            value={filters.accountId}
            onChange={(e) => updateFilter('accountId', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Receitas"
          valueCents={summary?.incomeCents ?? 0}
          hint={hintPeriodoCompleto}
          loading={totalsLoading}
        />
        <StatCard
          label="Despesas"
          valueCents={summary?.expenseCents ?? 0}
          hint={hintPeriodoCompleto}
          loading={totalsLoading}
        />
        <StatCard
          label="Resultado"
          valueCents={summary?.netCents ?? 0}
          hint={hintPeriodoCompleto}
          loading={totalsLoading}
        />
      </div>

      {txLoading ? (
        <SkeletonTable rows={8} />
      ) : txError ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-rose-600 shadow-sm">
          Não foi possível carregar os lançamentos: {txError.message}
        </div>
      ) : (txData?.items ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">Nenhum lançamento encontrado para os filtros selecionados.</p>
          <button
            type="button"
            onClick={openNew}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Novo lançamento
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>
              Mostrando {startIdx}-{endIdx} de {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PAGE_SIZE >= total}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionForm
        open={modalOpen}
        editing={editing}
        categories={categories ?? []}
        accounts={accounts ?? []}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  )
}
