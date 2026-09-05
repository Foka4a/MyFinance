import Skeleton from './Skeleton.jsx'
import { formatBRL, formatPct } from '../lib/format.js'

export default function StatCard({
  label,
  valueCents,
  variationPct,
  hint,
  loading,
  invertVariationColor = false,
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  const isUp = variationPct != null && variationPct >= 0
  const isGood = invertVariationColor ? !isUp : isUp

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {formatBRL(valueCents)}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {variationPct != null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              isGood
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isUp ? '▲' : '▼'} {formatPct(variationPct)}
          </span>
        )}
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
    </div>
  )
}
