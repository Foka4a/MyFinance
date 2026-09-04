import { useEffect, useRef, useState } from 'react'
import { post, put } from '../lib/api.js'
import { parseBRLToCents } from '../lib/format.js'
import { centsToInputStr } from '../lib/txQuery.js'

const EMPTY = {
  kind: 'expense',
  date: '',
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  notes: '',
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TransactionForm({ open, editing, categories, accounts, onClose, onSaved }) {
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
        kind: editing.kind,
        date: editing.date,
        description: editing.description,
        amount: centsToInputStr(editing.amountCents),
        categoryId: editing.categoryId ?? '',
        accountId: String(editing.accountId),
        notes: editing.notes ?? '',
      })
    } else {
      setForm({ ...EMPTY, date: todayISO() })
    }
  }, [open, editing])

  function handleKindChange(kind) {
    setForm((f) => ({ ...f, kind, categoryId: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const amountCents = parseBRLToCents(form.amount)
    if (amountCents == null || amountCents <= 0) {
      setError('Informe um valor valido, maior que zero.')
      return
    }
    if (!form.accountId) {
      setError('Selecione uma conta.')
      return
    }

    const payload = {
      date: form.date,
      description: form.description,
      amountCents,
      kind: form.kind,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      accountId: Number(form.accountId),
      notes: form.notes ? form.notes : null,
    }

    setSaving(true)
    try {
      if (editing) {
        await put(`/transactions/${editing.id}`, payload)
      } else {
        await post('/transactions', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter((c) => c.kind === form.kind)

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="tx-form-title"
      className="w-full max-w-lg rounded-xl border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 id="tx-form-title" className="text-lg font-semibold text-slate-900">
          {editing ? 'Editar lancamento' : 'Novo lancamento'}
        </h2>

        <div role="group" aria-label="Tipo do lancamento" className="flex gap-2">
          {[
            { value: 'income', label: 'Receita' },
            { value: 'expense', label: 'Despesa' },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                form.kind === opt.value
                  ? opt.value === 'income'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-rose-600 bg-rose-50 text-rose-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={opt.value}
                checked={form.kind === opt.value}
                onChange={() => handleKindChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-date" className="mb-1 block text-sm text-slate-600">
              Data
            </label>
            <input
              id="tx-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="tx-amount" className="mb-1 block text-sm text-slate-600">
              Valor
            </label>
            <input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tx-description" className="mb-1 block text-sm text-slate-600">
            Descricao
          </label>
          <input
            id="tx-description"
            type="text"
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-category" className="mb-1 block text-sm text-slate-600">
              Categoria
            </label>
            <select
              id="tx-category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tx-account" className="mb-1 block text-sm text-slate-600">
              Conta
            </label>
            <select
              id="tx-account"
              required
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecione
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tx-notes" className="mb-1 block text-sm text-slate-600">
            Observacao
          </label>
          <textarea
            id="tx-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
