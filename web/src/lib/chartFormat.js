// Small formatting helpers used only by chart axes/labels (Dashboard/FluxoCaixa charts).
// Kept separate from lib/format.js so we don't touch the shared formatter file.

export function formatBRLShort(cents) {
  const value = (cents ?? 0) / 100
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')} mil`
  return `R$ ${value.toFixed(0)}`
}

// period vem da API: 'YYYY-MM-DD' (day) ou 'YYYY-MM' (month)
export function formatPeriodLabel(period, granularity) {
  if (granularity === 'day') {
    const [, m, d] = period.split('-')
    return `${d}/${m}`
  }
  const [y, m] = period.split('-')
  return `${m}/${y}`
}
