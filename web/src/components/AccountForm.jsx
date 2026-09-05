import { useEffect, useRef, useState } from 'react'
import { post, put } from '../lib/api.js'
import { parseBRLToCents } from '../lib/format.js'
import { centsToInputStr } from '../lib/txQuery.js'

export const ACCOUNT_TYPES = ['corrente', 'poupanca', 'carteira', 'investimento']
export const ACCOUNT_TYPE_LABELS = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  carteira: 'Carteira',
  investimento: 'Investimento',
}

const EMPTY = { name: '', type: 'corrente', institution: '', openingBalance: '' }

export default function AccountForm({ open, editing, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

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
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="account-form-title"
      className="w-full max-w-lg rounded-xl border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 id="account-form-title" className="text-lg font-semibold text-slate-900">
          {editing ? 'Editar conta' : 'Nova conta'}
        </h2>

        <div>
          <label htmlFor="account-name" className="mb-1 block text-sm text-slate-600">
            Nome
          </label>
          <input
            id="account-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="account-type" className="mb-1 block text-sm text-slate-600">
              Tipo
            </label>
            <select
              id="account-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="account-institution" className="mb-1 block text-sm text-slate-600">
              Instituição (opcional)
            </label>
            <input
              id="account-institution"
              type="text"
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="account-opening" className="mb-1 block text-sm text-slate-600">
            Saldo inicial
          </label>
          <input
            id="account-opening"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.openingBalance}
            onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

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
