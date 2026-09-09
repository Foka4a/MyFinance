// Pure helpers for building the Lancamentos query string and small date/money conversions.
// Kept separate from the page so they stay testable without rendering React.

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthRange(now = new Date()) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toISODate(first), to: toISODate(last) }
}

export function buildTransactionsQuery(filters, sort, page, pageSize) {
  const { from, to, kind, categoryId, accountId } = filters
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (kind) params.set('kind', kind)
  if (categoryId) params.set('categoryId', String(categoryId))
  if (accountId) params.set('accountId', String(accountId))
  params.set('sort', sort.column)
  params.set('order', sort.order)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params.toString()
}
