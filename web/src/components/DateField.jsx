import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import { formatDate } from '../lib/format.js'
import { toISODate } from '../lib/txQuery.js'
import { input, inputSm } from './ui.jsx'

// 'YYYY-MM-DD' -> Date local. new Date('2026-09-01') seria lido como UTC e
// voltaria 31/08 em fuso negativo, que e justamente o nosso.
function toDate(iso) {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-ink-3">
      <rect x="2" y="3.5" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.75h12M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// Popover do calendario: mora dentro de um wrapper relative, entao ESC e a saida
// do foco bastam pra fechar — sem portal e sem lib de posicionamento.
function Popover({ id, text, ariaLabel, size, align, open, setOpen, children }) {
  return (
    <div
      className={`relative ${size === 'full' ? '' : 'inline-block'}`}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        // preventDefault tambem: dentro do <dialog> dos formularios o ESC fecharia o modal junto.
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`${size === 'full' ? input : inputSm} money flex items-center gap-2 text-left ${
          open ? 'border-azul' : ''
        }`}
      >
        <CalendarIcon />
        {text}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className={`absolute z-30 mt-2 rounded-card border border-line bg-surface p-3 shadow-float ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function DateField({ id, value, onChange, label = 'Data' }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover
      id={id}
      size="full"
      ariaLabel={`${label}: ${formatDate(value) || 'nenhuma'}`}
      text={formatDate(value) || 'Escolher data'}
      open={open}
      setOpen={setOpen}
    >
      <DayPicker
        mode="single"
        required
        locale={ptBR}
        selected={toDate(value)}
        defaultMonth={toDate(value)}
        onSelect={(date) => {
          onChange(toISODate(date))
          setOpen(false)
        }}
      />
    </Popover>
  )
}

export function DateRangeField({ from, to, onChange, label = 'Período' }) {
  const [open, setOpen] = useState(false)
  // Enquanto so o inicio foi clicado o intervalo fica aqui; so vai pra pagina
  // (e so fecha) quando tem inicio e fim.
  const [draft, setDraft] = useState(null)

  const selected = draft ?? { from: toDate(from), to: toDate(to) }

  return (
    <Popover
      ariaLabel={`${label}: ${formatDate(from)} a ${formatDate(to)}`}
      text={`${formatDate(from)} – ${formatDate(to)}`}
      open={open}
      setOpen={(v) => {
        setDraft(null)
        setOpen(v)
      }}
    >
      <DayPicker
        mode="range"
        resetOnSelect
        numberOfMonths={2}
        locale={ptBR}
        selected={selected}
        defaultMonth={toDate(from)}
        onSelect={(range) => {
          if (!range?.from) return
          if (!range.to) {
            setDraft(range)
            return
          }
          setDraft(null)
          setOpen(false)
          onChange({ from: toISODate(range.from), to: toISODate(range.to) })
        }}
      />
    </Popover>
  )
}
