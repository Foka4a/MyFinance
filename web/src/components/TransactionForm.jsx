import { useEffect, useState } from 'react'
import { post, put } from '../lib/api.js'
import { centsToInputStr, maskBRL, parseBRLToCents, todayISO } from '../lib/format.js'
import { DateField } from './DateField.jsx'
import Modal from './Modal.jsx'
import { ErrorNote, Field, btnGhost, btnPrimary, input } from './ui.jsx'

const LAST_KIND_KEY = 'myfinance:lastKind'
const LAST_ACCOUNT_KEY = 'myfinance:lastAccount'

const EMPTY = {
  kind: 'expense',
  date: '',
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  notes: '',
}

const KINDS = [
  { value: 'income', label: 'Receita', on: 'bg-jade-soft text-jade' },
  { value: 'expense', label: 'Despesa', on: 'bg-vinho-soft text-vinho' },
]

export default function TransactionForm({ open, editing, categories, accounts, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

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
      // Lembra o ultimo tipo usado pra nao empurrar "Despesa" em todo lancamento novo.
      setForm({ ...EMPTY, kind: localStorage.getItem(LAST_KIND_KEY) ?? EMPTY.kind, date: todayISO() })
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
      setError('Informe um valor válido, maior que zero.')
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
      localStorage.setItem(LAST_KIND_KEY, form.kind)
      localStorage.setItem(LAST_ACCOUNT_KEY, form.accountId)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter((c) => c.kind === form.kind)

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar lançamento' : 'Novo lançamento'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <div
          role="group"
          aria-label="Tipo do lançamento"
          className="flex gap-1 rounded-[11px] border border-line bg-surface-2 p-1"
        >
          {KINDS.map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold transition-colors ${
                form.kind === opt.value ? opt.on : 'text-ink-2 hover:text-ink'
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
          <Field label="Data" htmlFor="tx-date">
            <DateField
              id="tx-date"
              value={form.date}
              onChange={(date) => setForm((f) => ({ ...f, date }))}
            />
          </Field>
          <Field label="Valor" htmlFor="tx-amount">
            <input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: maskBRL(e.target.value) }))}
              className={`${input} money`}
            />
          </Field>
        </div>

        <Field label="Descrição" htmlFor="tx-description">
          <input
            id="tx-description"
            type="text"
            required
            placeholder="Mercado, aluguel, aula particular..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={input}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria" htmlFor="tx-category">
            <select
              id="tx-category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={input}
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Conta" htmlFor="tx-account">
            <select
              id="tx-account"
              required
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              className={input}
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
          </Field>
        </div>

        <Field label="Observação" htmlFor="tx-notes" hint="Opcional.">
          <textarea
            id="tx-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={`${input} resize-y`}
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Salvando...' : 'Salvar lançamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
