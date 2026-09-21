import { useEffect, useState } from 'react'
import { get, post } from '../lib/api.js'
import { formatBRL, maskBRL, parseBRLToCents, todayISO } from '../lib/format.js'
import { DateField } from './DateField.jsx'
import Modal from './Modal.jsx'
import { ErrorNote, Field, btnGhost, btnPrimary, input } from './ui.jsx'

export default function SnapshotForm({ open, accounts, defaultAccountId, onClose, onSaved }) {
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(null)

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
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Registrar valor"
      description="Quanto a conta vale nesta data. Um valor já registrado na mesma data é substituído."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <Field label="Conta de investimento" htmlFor="snapshot-account">
          <select
            id="snapshot-account"
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={input}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data" htmlFor="snapshot-date">
          <DateField id="snapshot-date" value={date} onChange={setDate} />
        </Field>

        <Field label="Valor" htmlFor="snapshot-amount">
          <input
            id="snapshot-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            required
            value={amount}
            onChange={(e) => setAmount(maskBRL(e.target.value))}
            className={`${input} money`}
          />
        </Field>

        {existing && (
          <p role="status" className="rounded-lg bg-ouro-soft px-3 py-2.5 text-sm text-ouro">
            Essa data já tem {formatBRL(existing.balanceCents)} registrado. Salvar substitui esse valor.
          </p>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Salvando...' : 'Registrar valor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
