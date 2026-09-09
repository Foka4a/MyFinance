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

const brlPlain = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Mascara dos campos de valor: so os digitos contam e os centavos entram da
// direita pra esquerda ("15000" vira "1.500,00"). O que sai daqui volta certo
// pelo parseBRLToCents, entao os formularios podem guardar a string mascarada.
export function maskBRL(str) {
  const digits = String(str ?? '').replace(/\D/g, '').slice(0, 15)
  if (!digits) return ''
  return brlPlain.format(Number(digits) / 100)
}

// Valor em centavos -> string do campo, na mesma grafia da mascara.
export function centsToInputStr(cents) {
  return cents == null ? '' : maskBRL(String(cents))
}

export function formatPct(n) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${Math.abs(n).toFixed(1).replace('.', ',')}%`
}
