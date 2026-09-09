import { useEffect, useRef, useState } from 'react'
import Skeleton, { SkeletonStat } from './Skeleton.jsx'
import { formatBRL, formatPct } from '../lib/format.js'
import { Dot, card, eyebrow, heroCard } from './ui.jsx'

// O unico movimento nao disparado pelo usuario no app inteiro: o numero que
// importa "resolve" quando os dados chegam. Fica so na variante hero de
// proposito — dezesseis cards contando ao mesmo tempo viraria ruido.
function useCountUp(target, enabled) {
  const [value, setValue] = useState(target ?? 0)
  const displayed = useRef(0)

  useEffect(() => {
    if (!enabled || target == null) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = displayed.current
    if (reduce || from === target) {
      displayed.current = target
      setValue(target)
      return
    }
    const DURATION = 520
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION)
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(from + (target - from) * eased)
      displayed.current = next
      setValue(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled])

  return enabled ? value : target
}

// No hero a variacao e uma pilula; no card pequeno ela e so uma linha de texto
// colorida. Mesma informacao, peso diferente conforme o tamanho do numero.
function Variation({ pct, invert, pill }) {
  if (pct == null) return null
  const up = pct >= 0
  const good = invert ? !up : up
  const tone = good ? 'text-jade' : 'text-vinho'

  if (!pill) {
    return (
      <span className={`money text-xs ${tone}`}>
        {up ? '▲' : '▼'} {formatPct(pct)} vs. período anterior
      </span>
    )
  }

  return (
    <span
      className={`money inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${
        good ? 'bg-jade-soft text-jade' : 'bg-vinho-soft text-vinho'
      }`}
    >
      {up ? '▲' : '▼'} {formatPct(pct)}
    </span>
  )
}

const TONES = { ink: 'text-ink', jade: 'text-jade', vinho: 'text-vinho' }

function toneFor(tone, cents) {
  if (tone && tone !== 'auto') return TONES[tone]
  if (tone === 'auto') return (cents ?? 0) < 0 ? TONES.vinho : (cents ?? 0) > 0 ? TONES.jade : TONES.ink
  return TONES.ink
}

export default function StatCard({
  label,
  valueCents,
  variationPct,
  hint,
  loading,
  tone,
  dot,
  emphasis = false,
  variant = 'card',
  invertVariationColor = false,
}) {
  const hero = variant === 'hero'
  const shown = useCountUp(valueCents, hero && !loading)
  const color = toneFor(tone, valueCents)

  if (loading) {
    return hero ? (
      <div className={heroCard}>
        <Skeleton className="h-3 w-44 max-w-full" />
        <Skeleton className="mt-3.5 h-11 w-72 max-w-full" />
        <Skeleton className="mt-3.5 h-3.5 w-56 max-w-full" />
      </div>
    ) : (
      <div className={`${card} p-[18px]`}>
        <SkeletonStat />
      </div>
    )
  }

  if (hero) {
    return (
      <div className={`${heroCard} rise`}>
        <p className={eyebrow}>{label}</p>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
          <span className={`money-hero text-[clamp(2rem,6vw,2.875rem)] font-semibold leading-none ${color}`}>
            {formatBRL(shown)}
          </span>
          <Variation pct={variationPct} invert={invertVariationColor} pill />
        </div>
        {hint && <p className="mt-3 text-[13px] text-ink-2">{hint}</p>}
      </div>
    )
  }

  return (
    <div className={`${card} p-[18px] ${emphasis ? 'bg-surface-2' : ''}`}>
      <p className="flex items-center gap-2 text-[12.5px] text-ink-2">
        {dot && <Dot color={dot} className="rounded-full" />}
        {label}
      </p>
      <p className={`money mt-2.5 text-2xl font-semibold leading-tight tracking-[-0.02em] ${color}`}>
        {formatBRL(valueCents)}
      </p>
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2">
        <Variation pct={variationPct} invert={invertVariationColor} />
        {hint && <span className="text-xs text-ink-3">{hint}</span>}
      </div>
    </div>
  )
}
