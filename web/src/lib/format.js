const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(cents) {
  const value = cents == null ? 0 : cents
  // Intl emits a non-breaking space after "R$"; normalize to a plain space.
  return brl.format(value / 100).replace(' ', ' ')
}

export function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function parseBRLToCents(str) {
  if (str == null) return null
  const cleaned = str.replace(/R\$/g, '').replace(/\s/g, '').trim()
  if (!cleaned) return null

  // remove thousands separators, normalize decimal comma to dot
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  if (Number.isNaN(value)) return null

  return Math.round(value * 100)
}

export function formatPct(n) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${Math.abs(n).toFixed(1).replace('.', ',')}%`
}
