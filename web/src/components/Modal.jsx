import { useEffect, useId, useRef } from 'react'

const SIZES = {
  md: 'max-w-md',
  lg: 'max-w-lg',
}

// Casca unica dos modais. Continua sendo <dialog> nativo: foco preso, ESC e
// inerte de fundo vem de graca do browser. A entrada/saida animada mora no
// index.css. Aqui so entra a moldura e o clique no backdrop.
export default function Modal({ open, onClose, title, description, size = 'lg', children }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby={titleId}
      className={`w-[calc(100%-2rem)] ${SIZES[size]} rounded-[18px] border border-line bg-surface p-0 text-ink shadow-float`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {description && <p className="mt-1.5 max-w-[52ch] text-sm text-ink-3">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-1.5 -mt-1 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M4.5 4.5l9 9m0-9l-9 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  )
}
