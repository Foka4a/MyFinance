import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { ErrorNote, btnGhost } from './ui.jsx'

// Substitui o confirm() nativo nas acoes destrutivas.
// `request` e null quando fechado, ou { title, description, confirmLabel, onConfirm }.
export default function ConfirmDialog({ request, onClose }) {
  const [shown, setShown] = useState(request)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Mantem o texto durante os ~200ms de saida, senao o modal esvazia ao fechar.
  useEffect(() => {
    if (request) {
      setShown(request)
      setBusy(false)
      setError(null)
    }
  }, [request])

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await shown.onConfirm()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      open={request != null}
      onClose={busy ? () => {} : onClose}
      size="md"
      title={shown?.title ?? ''}
      description={shown?.description}
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-[10px] bg-vinho px-4 py-2.5 text-sm font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-vinho/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {busy ? 'Excluindo...' : (shown?.confirmLabel ?? 'Excluir')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
