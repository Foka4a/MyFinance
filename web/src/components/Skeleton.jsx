// Placeholders de carregamento. Regra: o esqueleto tem a forma do conteudo que
// vai chegar e nunca desenha a moldura do card — quem chama ja esta dentro de um.
export default function Skeleton({ className = '', style }) {
  return <div aria-hidden="true" style={style} className={`skeleton rounded-md ${className}`} />
}

export function SkeletonStat() {
  return (
    <div>
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-24" />
    </div>
  )
}

// Larguras irregulares de proposito: uma grade de blocos iguais nao le como texto.
const COL_WIDTHS = [72, 88, 60, 76, 68, 54]

export function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line-soft px-5 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="min-w-0 flex-1">
              <Skeleton className="h-3.5" style={{ width: `${COL_WIDTHS[(r + c) % COL_WIDTHS.length]}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ rows = 5 }) {
  return (
    <ul role="status" aria-label="Carregando" className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5" style={{ width: `${52 + ((i * 13) % 30)}%` }} />
            <Skeleton className="mt-2 h-3" style={{ width: `${28 + ((i * 7) % 18)}%` }} />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </li>
      ))}
    </ul>
  )
}

export function SkeletonChart({ className = 'h-64' }) {
  return (
    <div role="status" aria-label="Carregando" className={`flex items-end gap-2 ${className}`}>
      {[62, 38, 80, 54, 71, 44, 88, 59, 34, 76].map((h, i) => (
        <Skeleton key={i} className="min-w-0 flex-1 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

export function SkeletonDonut() {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col items-center gap-8 sm:flex-row">
      <Skeleton className="h-44 w-44 shrink-0 rounded-full" />
      <div className="flex w-full flex-col gap-3.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <Skeleton className="h-3.5" style={{ width: `${40 + ((i * 11) % 26)}%` }} />
            <Skeleton className="h-3.5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
