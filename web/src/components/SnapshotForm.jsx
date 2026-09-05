import { useEffect, useRef, useState } from 'react'
import { get, post } from '../lib/api.js'
import { formatBRL, parseBRLToCents } from '../lib/format.js'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SnapshotForm({ open, accounts, defaultAccountId, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    setError(null)
    setAccountId(defaultAccountId ? String(defaultAccountId) : String(accounts[0]?.id ?? ''))
    setDate(todayISO())
    setAmount('')
  }, [open, defaultAccountId, accounts])

  // ponytail: re-checks the account's snapshots on every account/date change to warn
  // about the upsert; cheap enough given snapshot lists are small per account.
  useEffect(() => {
    if (!open || !accountId || !date) {
      setExisting(null)
      return
    }
    let cancelled = false
    get(`/investments/snapshots?accountId=${accountId}`)
      .then((rows) => {
        if (cancelled) return
        setExisting(rows.find((r) => r.date === date) ?? null)
      })
      .catch(() => {
        if (!cancelled) setExisting(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, accountId, date])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const balanceCents = parseBRLToCents(amount)
    if (balanceCents == null || balanceCents < 0) {
      setError('Informe um valor válido.')
      return
    }
    if (!accountId) {
      setError('Selecione uma conta de investimento.')
      return
    }

    setSaving(true)
    try {
      await post('/investments/snapshots', { accountId: Number(accountId), date, balanceCents })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="snapshot-form-title"
      className="w-full max-w-md rounded-xl border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 id="snapshot-form-title" className="text-lg font-semibold text-slate-900">
          Registrar valor
        </h2>

        <p className="text-xs text-slate-500">
          Registrar um valor para uma conta que já tem valor na mesma data substitui o valor anterior.
        </p>

        <div>
          <label htmlFor="snapshot-account" className="mb-1 block text-sm text-slate-600">
            Conta de investimento
          </label>
          <select
            id="snapshot-account"
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="snapshot-date" className="mb-1 block text-sm text-slate-600">
            Data
          </label>
          <input
            id="snapshot-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="snapshot-amount" className="mb-1 block text-sm text-slate-600">
            Valor
          </label>
          <input
            id="snapshot-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        {existing && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700" role="alert">
            Já existe um valor registrado nessa data ({formatBRL(existing.balanceCents)}). Salvar vai
            substituí-lo.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
