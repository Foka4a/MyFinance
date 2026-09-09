import { formatBRL } from '../lib/format.js'

// Primitivas compartilhadas. Sao strings de classe onde nao ha comportamento,
// e componente so quando a marcacao se repetia de verdade nas paginas.

export const card = 'rounded-card border border-line bg-surface'

// Faixa de destaque do topo (saldo atual, patrimonio total): mesma moldura do
// card, so que maior e com o gradiente de .hero-band.
export const heroCard = 'hero-band rounded-[18px] border border-line px-7 py-6'

// Rotulo miudo em versalete. Usado nos olhais do hero e nos cabecalhos de tabela.
export const eyebrow = 'text-[11px] uppercase tracking-[0.1em] text-ink-3'

// Tamanho fica em cada variante em vez de ser sobrescrito no uso: classes
// Tailwind concorrentes na mesma string nao "ganham" pela ordem que aparecem
// no atributo, e sim pela ordem no CSS gerado — sobrescrever aqui nao funciona.
const inputBase =
  'rounded-[9px] border border-line bg-surface-2 text-sm text-ink transition-colors ' +
  'placeholder:text-ink-3 hover:border-ink-3 focus:border-azul'

export const input = `${inputBase} w-full px-3 py-2.5`

export const inputSm = `${inputBase} px-3 py-2`

export const btnPrimary =
  'inline-flex items-center justify-center rounded-[10px] bg-azul px-4 py-2.5 text-sm font-semibold text-on-accent ' +
  'transition-[background-color,transform] duration-150 hover:bg-azul-deep active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:active:scale-100'

export const btnGhost =
  'inline-flex items-center justify-center rounded-[10px] border border-line bg-transparent px-4 py-2.5 text-sm ' +
  'font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-40 ' +
  'disabled:hover:border-line disabled:hover:text-ink-2'

export const btnLink = 'text-sm font-medium text-azul transition-colors hover:text-azul-lite'

export const btnLinkDanger = 'text-sm font-medium text-vinho transition-colors hover:text-vinho/80'

// Cabecalho de tabela: o fundo mora na propria celula, entao a barra se forma
// sozinha ao longo da linha sem precisar estilizar o <tr> em cada pagina.
export const th =
  'bg-surface-2 px-5 py-3.5 text-left text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3'

export function PageHeader({ title, lede, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div>
        <h1 className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">{title}</h1>
        {lede && <p className="mt-1.5 text-[13.5px] text-ink-2">{lede}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

export function Field({ label, htmlFor, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

export function Segmented({ label, value, onChange, options }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-[10px] border border-line bg-surface p-[3px]">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={active}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const TONES = {
  ink: 'text-ink',
  jade: 'text-jade',
  vinho: 'text-vinho',
  muted: 'text-ink-3',
}

export function Money({ cents, sign, tone = 'ink', className = '' }) {
  const resolved = tone === 'auto' ? ((cents ?? 0) < 0 ? 'vinho' : (cents ?? 0) > 0 ? 'jade' : 'ink') : tone
  return (
    <span className={`money ${TONES[resolved]} ${className}`}>
      {sign ? `${sign} ` : ''}
      {formatBRL(cents)}
    </span>
  )
}

// Ponto quadrado de categoria/serie. Repete em legenda, linha de lancamento,
// celula de tabela e card de conta — por isso virou componente.
export function Dot({ color, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-[3px] ${className}`}
      style={{ backgroundColor: color }}
    />
  )
}

export function ErrorNote({ children, className = '' }) {
  return (
    <p role="alert" className={`rounded-[10px] bg-vinho-soft px-3 py-2.5 text-sm text-vinho ${className}`}>
      {children}
    </p>
  )
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
      <span aria-hidden="true" className="mb-3 h-px w-10 bg-line" />
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-[46ch] text-sm text-ink-3">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
