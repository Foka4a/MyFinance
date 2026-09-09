import { useRef, useState } from 'react'
import { post } from '../lib/api.js'
import { maskBRL, parseBRLToCents, todayISO } from '../lib/format.js'
import { ErrorNote, btnGhost, card, eyebrow, inputSm } from './ui.jsx'

const LAST_ACCOUNT_KEY = 'myfinance:lastAccount'

// Mesma logica de "lembrar a conta" do TransactionForm, so que aqui a conta
// nunca aparece na tela — resolvida por padrao pra manter a barra em 1 linha.
function resolveAccount(accounts) {
  if (accounts.length === 0) return null
  const stored = localStorage.getItem(LAST_ACCOUNT_KEY)
  const match = accounts.find((a) => String(a.id) === stored)
  if (match) return match
  // Conta de investimento tem saldo vindo do ultimo snapshot e ignora transacoes,
  // entao o lancamento sumiria do saldo. So cai nela se nao houver outra.
  return accounts.find((a) => a.type !== 'investimento') ?? accounts[0]
}

export default function QuickAdd({ topExpenseCategories, allCategories, accounts, onSaved }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState(null)
  const [savedNote, setSavedNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const descriptionRef = useRef(null)

  const chips = (topExpenseCategories ?? []).filter((c) => c.categoryId != null).slice(0, 3)
  const categories = allCategories ?? []
  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const incomeCategories = categories.filter((c) => c.kind === 'income')

  const selectedCategory = categories.find((c) => String(c.id) === String(categoryId))
  const kind = selectedCategory ? selectedCategory.kind : 'expense'
  // So depois que a lista chega: com `accounts` ainda null nao ha o que avisar.
  const noAccounts = Array.isArray(accounts) && accounts.length === 0

  function toggleChip(id) {
    setCategoryId((current) => (String(current) === String(id) ? '' : id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSavedNote(null)

    const trimmed = description.trim()
    const amountCents = parseBRLToCents(amount)
    if (!trimmed) {
      setError('Informe uma descrição.')
      return
    }
    if (amountCents == null || amountCents <= 0) {
      setError('Informe um valor válido, maior que zero.')
      return
    }

    const account = resolveAccount(accounts ?? [])
    if (!account) {
      setError('Cadastre uma conta para registrar.')
      return
    }

    setSaving(true)
    try {
      await post('/transactions', {
        date: todayISO(),
        description: trimmed,
        amountCents,
        kind,
        categoryId: categoryId ? Number(categoryId) : null,
        accountId: account.id,
        notes: null,
      })
      setDescription('')
      setAmount('')
      setCategoryId('')
      setSavedNote(`Lançado em ${account.name}.`)
      descriptionRef.current?.focus()
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`${card} mb-6 p-3`}>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        <span className={`${eyebrow} shrink-0`}>Registro rápido</span>

        <input
          ref={descriptionRef}
          type="text"
          aria-label="Descrição"
          placeholder="Mercado, aluguel, aula particular..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setSavedNote(null)
          }}
          className={`${inputSm} min-w-0 flex-1 basis-48`}
        />

        <input
          type="text"
          inputMode="decimal"
          aria-label="Valor"
          placeholder="R$ 0,00"
          value={amount}
          onChange={(e) => {
            setAmount(maskBRL(e.target.value))
            setSavedNote(null)
          }}
          className={`${inputSm} money w-32 shrink-0`}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => {
            const active = String(categoryId) === String(c.categoryId)
            return (
              <button
                key={c.categoryId}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChip(c.categoryId)}
                className={`rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {c.name}
              </button>
            )
          })}

          <select
            aria-label="Outra categoria"
            value={chips.some((c) => String(c.categoryId) === String(categoryId)) ? '' : categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputSm} shrink-0`}
          >
            <option value="">Outra categoria...</option>
            <optgroup label="Despesas">
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Receitas">
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button type="submit" disabled={saving || !accounts?.length} className={`${btnGhost} ml-auto shrink-0`}>
          {saving ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      {noAccounts ? (
        <ErrorNote className="mt-3">Cadastre uma conta para registrar.</ErrorNote>
      ) : error ? (
        <ErrorNote className="mt-3">{error}</ErrorNote>
      ) : (
        // Confirma qual conta recebeu o lancamento — a conta nao aparece na barra
        // e o periodo selecionado pode nem incluir hoje, entao sem isso o usuario
        // salva e nao ve nada mudar. Some quando ele volta a digitar.
        savedNote && (
          <p role="status" className="mt-3 text-[12px] text-ink-3">
            {savedNote}
          </p>
        )
      )}
    </section>
  )
}
