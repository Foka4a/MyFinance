export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  )
}
