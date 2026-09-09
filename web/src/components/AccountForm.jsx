import { useEffect, useState } from 'react'
import { post, put } from '../lib/api.js'
import { centsToInputStr, maskBRL, parseBRLToCents } from '../lib/format.js'
import Modal from './Modal.jsx'
import { ErrorNote, Field, btnGhost, btnPrimary, input } from './ui.jsx'

export const ACCOUNT_TYPES = ['corrente', 'poupanca', 'carteira', 'investimento']
export const ACCOUNT_TYPE_LABELS = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  carteira: 'Carteira',
  investimento: 'Investimento',
}

const EMPTY = { name: '', type: 'corrente', institution: '', openingBalance: '' }

export default function AccountForm({ open, editing, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setForm({
        name: editing.name,
        type: editing.type,
        institution: editing.institution ?? '',
        openingBalance: centsToInputStr(editing.openingBalanceCents),
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, editing])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const openingBalanceCents = form.openingBalance === '' ? 0 : parseBRLToCents(form.openingBalance)
    if (openingBalanceCents == null) {
      setError('Informe um saldo inicial válido.')
      return
    }

    const payload = {
      name: form.name,
      type: form.type,
      institution: form.institution ? form.institution : null,
      openingBalanceCents,
    }

    setSaving(true)
    try {
      if (editing) {
        await put(`/accounts/${editing.id}`, { ...payload, archived: editing.archived })
      } else {
        await post('/accounts', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar conta' : 'Nova conta'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <Field label="Nome" htmlFor="account-name">
          <input
            id="account-name"
            type="text"
            required
            placeholder="Nubank, carteira, reserva..."
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={input}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" htmlFor="account-type">
            <select
              id="account-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className={input}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instituição" htmlFor="account-institution" hint="Opcional.">
            <input
              id="account-institution"
              type="text"
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              className={input}
            />
          </Field>
        </div>

        <Field
          label="Saldo inicial"
          htmlFor="account-opening"
          hint="Quanto havia na conta antes do primeiro lançamento."
        >
          <input
            id="account-opening"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.openingBalance}
            onChange={(e) => setForm((f) => ({ ...f, openingBalance: maskBRL(e.target.value) }))}
            className={`${input} money`}
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Salvando...' : 'Salvar conta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
