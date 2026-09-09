import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { del, put } from '../lib/api.js'
import { centsToInputStr, formatBRL, maskBRL, parseBRLToCents, todayISO } from '../lib/format.js'
import { monthRange } from '../lib/txQuery.js'
import Modal from './Modal.jsx'
import { SkeletonList } from './Skeleton.jsx'
import { Dot, EmptyState, ErrorNote, Field, btnGhost, btnLink, btnPrimary, card, input } from './ui.jsx'

// Projecao "estoura em N dias": ritmo medio do mes ate agora aplicado ao que
// resta do limite. Devolve null quando nao da pra projetar (ritmo zero, conta
// nao finita) ou quando o estouro cairia depois do fim do mes — nesses casos a
// frase certa e "dentro do previsto", nao um numero inventado.
function daysToOverrun(spentCents, limitCents, daysElapsed, daysLeft) {
  if (daysElapsed <= 0 || spentCents <= 0 || limitCents <= spentCents) return null
  const rate = spentCents / daysElapsed
  const days = Math.ceil((limitCents - spentCents) / rate)
  if (!Number.isFinite(days) || days <= 0 || days > daysLeft) return null
  return days
}

// Uma faixa so decide cor da barra, cor da frase e a frase — sempre a partir do
// mesmo percentual arredondado que aparece no texto.
function statusFor(item, daysElapsed, daysLeft) {
  const pct = item.limitCents > 0 ? Math.floor((item.spentCents / item.limitCents) * 100) : 0
  if (pct >= 100) {
    return {
      pct,
      bar: 'bg-vinho',
      tone: 'text-vinho',
      text:
        item.spentCents === item.limitCents
          ? `${pct}% usado — limite atingido`
          : `${pct}% usado — ${formatBRL(item.spentCents - item.limitCents)} acima do limite`,
    }
  }
  const days = pct >= 80 ? daysToOverrun(item.spentCents, item.limitCents, daysElapsed, daysLeft) : null
  if (days != null) {
    return {
      pct,
      bar: 'bg-ouro',
      tone: 'text-ouro',
      text: `${pct}% usado — no ritmo atual estoura em ${days} ${days === 1 ? 'dia' : 'dias'}`,
    }
  }
  return {
    pct,
    bar: pct >= 80 ? 'bg-ouro' : 'bg-jade',
    tone: pct >= 80 ? 'text-ouro' : 'text-ink-2',
    text: pct >= 80 ? `${pct}% usado — atenção ao ritmo` : `${pct}% usado — dentro do previsto`,
  }
}

function LimiteRow({ item, daysElapsed, daysLeft }) {
  const { pct, bar, tone, text } = statusFor(item, daysElapsed, daysLeft)

  return (
    <li>
      <div className="mb-2 flex items-center gap-2.5 text-[13px]">
        <Dot color={item.color} className="size-2.5" />
        <span className="min-w-0 flex-1 truncate text-ink">{item.name}</span>
        <span className="money shrink-0 text-ink-2">
          {formatBRL(item.spentCents)} / {formatBRL(item.limitCents)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={item.name}
        className="h-[7px] w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className={`mt-[7px] text-[11.5px] ${tone}`}>{text}</p>
    </li>
  )
}

function BudgetForm({ open, onClose, expenseCategories, budgetItems, onSaved }) {
  // ponytail: reset ao abrir feito durante o render (padrao "adjusting state
  // when a prop changes" do React) em vez de useEffect, pra nao disparar
  // set-state-in-effect e nao piscar valores antigos no primeiro frame aberto.
  const [prevOpen, setPrevOpen] = useState(open)
  const [values, setValues] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const initial = {}
      for (const c of expenseCategories) {
        const existing = budgetItems.find((b) => b.categoryId === c.id)
        initial[c.id] = existing ? centsToInputStr(existing.limitCents) : ''
      }
      setValues(initial)
      setError(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const ops = []
    for (const c of expenseCategories) {
      const existing = budgetItems.find((b) => b.categoryId === c.id)
      const raw = (values[c.id] ?? '').trim()

      if (!raw) {
        if (existing) ops.push(() => del(`/budgets/${c.id}`))
        continue
      }

      const cents = parseBRLToCents(raw)
      if (cents == null || cents <= 0) {
        setError(`Valor inválido para "${c.name}".`)
        return
      }
      if (!existing || existing.limitCents !== cents) {
        ops.push(() => put(`/budgets/${c.id}`, { limitCents: cents }))
      }
    }

    if (ops.length === 0) {
      onClose()
      return
    }

    setSaving(true)
    try {
      await Promise.all(ops.map((op) => op()))
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
      title="Definir limites do mês"
      description="Deixe o campo em branco para remover o limite de uma categoria."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        {expenseCategories.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhuma categoria de despesa cadastrada.</p>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-3.5 overflow-y-auto pr-1">
            {expenseCategories.map((c) => (
              <Field key={c.id} label={c.name} htmlFor={`budget-${c.id}`}>
                <input
                  id={`budget-${c.id}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="Sem limite"
                  value={values[c.id] ?? ''}
                  onChange={(e) => {
                    const masked = maskBRL(e.target.value)
                    setValues((v) => ({ ...v, [c.id]: masked }))
                  }}
                  className={`${input} money`}
                />
              </Field>
            ))}
          </div>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Salvando...' : 'Salvar limites'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ponytail: limites sao mensais por definicao, entao o periodo do Dashboard
// (semana/mes escolhido) nao entra aqui — sempre mes corrente, calculado direto.
export default function LimitesMes({ categories, refreshKey }) {
  const { from, to } = monthRange()
  // refreshKey entra nas deps do useApi: lancar pelo registro rapido tambem
  // atualiza o consumo dos limites.
  const { data, loading, error, reload } = useApi(`/budgets?from=${from}&to=${to}`, [refreshKey])
  const [modalOpen, setModalOpen] = useState(false)

  // monthRange() sai do "hoje", entao dia do mes basta e nao ha conta de fuso.
  const daysElapsed = Number(todayISO().slice(8))
  const daysLeft = Math.max(0, Number(to.slice(8)) - daysElapsed)

  const items = data?.items ?? []
  const expenseCategories = (categories ?? []).filter((c) => c.kind === 'expense')

  function handleSaved() {
    setModalOpen(false)
    reload()
  }

  return (
    <section className={`${card} p-5`}>
      <div className="mb-[18px] flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">Limites do mês</h2>
        <div className="flex shrink-0 items-baseline gap-3">
          <span className="text-[12px] text-ink-3">
            {daysLeft === 0 ? 'último dia do mês' : daysLeft === 1 ? 'falta 1 dia' : `faltam ${daysLeft} dias`}
          </span>
          {/* Enquanto /budgets ou /categories carregam, o formulario nasceria
              vazio — salvar assim apagaria todos os limites. Abrir so com dados. */}
          <button
            type="button"
            disabled={loading || !categories}
            onClick={() => setModalOpen(true)}
            className={`${btnLink} text-[12.5px] disabled:opacity-40`}
          >
            Definir limites
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorNote>Não foi possível carregar os limites: {error.message}</ErrorNote>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum limite definido"
          hint="Defina limites mensais por categoria para acompanhar seus gastos."
          action={
            <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary}>
              Definir limites
            </button>
          }
        />
      ) : (
        <ul className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {items.map((item) => (
            <LimiteRow key={item.categoryId} item={item} daysElapsed={daysElapsed} daysLeft={daysLeft} />
          ))}
        </ul>
      )}

      <BudgetForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        expenseCategories={expenseCategories}
        budgetItems={items}
        onSaved={handleSaved}
      />
    </section>
  )
}
