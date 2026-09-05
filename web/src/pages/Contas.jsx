import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { put, del } from '../lib/api.js'
import { formatBRL, formatDate } from '../lib/format.js'
import StatCard from '../components/StatCard.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import PatrimonioChart from '../components/PatrimonioChart.jsx'
import AccountForm, { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../components/AccountForm.jsx'
import SnapshotForm from '../components/SnapshotForm.jsx'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthsAgoISO(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Contas() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [listError, setListError] = useState(null)
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false)
  const [selectedInvId, setSelectedInvId] = useState(null)

  // Sempre ativas: base para os cards de resumo do topo (nao muda com o toggle de arquivadas).
  const { data: activeAccounts, loading: activeLoading, error: activeError, reload: reloadActive } = useApi('/accounts')

  const listPath = `/accounts?includeArchived=${includeArchived ? 1 : 0}`
  const { data: listedAccounts, loading: listLoading, error: fetchListError, reload: reloadList } = useApi(listPath)

  // Janela fixa de 12 meses para o card de crescimento, independente do seletor do grafico.
  const { data: networth12 } = useApi(`/networth?from=${monthsAgoISO(11)}&to=${todayISO()}&granularity=month`)

  function reloadAccounts() {
    reloadActive()
    reloadList()
  }

  const investmentAccounts = (listedAccounts ?? []).filter((a) => a.type === 'investimento')

  useEffect(() => {
    if (selectedInvId == null && investmentAccounts.length > 0) {
      setSelectedInvId(investmentAccounts[0].id)
    }
  }, [investmentAccounts, selectedInvId])

  const snapshotsPath = selectedInvId
    ? `/investments/snapshots?accountId=${selectedInvId}`
    : '/investments/snapshots'
  const { data: snapshots, loading: snapshotsLoading, error: snapshotsError, reload: reloadSnapshots } = useApi(snapshotsPath)

  const patrimonioTotalCents = (activeAccounts ?? []).reduce((sum, a) => sum + a.balanceCents, 0)
  const disponivelCents = (activeAccounts ?? [])
    .filter((a) => a.type !== 'investimento')
    .reduce((sum, a) => sum + a.balanceCents, 0)
  const investidoCents = (activeAccounts ?? [])
    .filter((a) => a.type === 'investimento')
    .reduce((sum, a) => sum + a.balanceCents, 0)

  const growthItems = networth12 ?? []
  const growthFirst = growthItems[0]?.totalCents ?? 0
  const growthLast = growthItems[growthItems.length - 1]?.totalCents ?? 0
  const growthDeltaCents = growthLast - growthFirst
  const growthPct = growthFirst !== 0 ? (growthDeltaCents / Math.abs(growthFirst)) * 100 : growthDeltaCents !== 0 ? 100 : 0

  function openNewAccount() {
    setEditingAccount(null)
    setAccountModalOpen(true)
  }

  function openEditAccount(account) {
    setEditingAccount(account)
    setAccountModalOpen(true)
  }

  function handleAccountSaved() {
    setAccountModalOpen(false)
    reloadAccounts()
  }

  async function handleArchive(account, archived) {
    setListError(null)
    try {
      await put(`/accounts/${account.id}`, {
        name: account.name,
        type: account.type,
        institution: account.institution,
        openingBalanceCents: account.openingBalanceCents,
        archived,
      })
      reloadAccounts()
    } catch (err) {
      setListError(err.message)
    }
  }

  async function handleDeleteAccount(account) {
    if (!confirm(`Excluir a conta "${account.name}"?`)) return
    setListError(null)
    try {
      await del(`/accounts/${account.id}`)
      reloadAccounts()
    } catch (err) {
      setListError(err.message)
    }
  }

  async function handleDeleteSnapshot(snapshot) {
    if (!confirm(`Excluir o valor registrado em ${formatDate(snapshot.date)}?`)) return
    await del(`/investments/snapshots/${snapshot.id}`)
    reloadSnapshots()
  }

  function handleSnapshotSaved() {
    setSnapshotModalOpen(false)
    reloadSnapshots()
  }

  const grouped = ACCOUNT_TYPES.map((type) => ({
    type,
    accounts: (listedAccounts ?? []).filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Contas e Investimentos</h1>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patrimônio total" valueCents={patrimonioTotalCents} loading={activeLoading} />
        <StatCard label="Disponível" valueCents={disponivelCents} loading={activeLoading} />
        <StatCard label="Investido" valueCents={investidoCents} loading={activeLoading} />
        <StatCard
          label="Crescimento no período"
          valueCents={growthDeltaCents}
          variationPct={growthPct}
          hint="últimos 12 meses"
          loading={activeLoading}
        />
      </div>

      {activeError && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-rose-600 shadow-sm">
          Não foi possível carregar as contas: {activeError.message}
        </div>
      )}

      <div className="mb-4">
        <PatrimonioChart hasAccounts={(activeAccounts ?? []).length > 0} />
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-700">Contas</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              Mostrar contas arquivadas
            </label>
            <button
              type="button"
              onClick={openNewAccount}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Nova conta
            </button>
          </div>
        </div>

        {listError && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {listError}
          </p>
        )}

        {listLoading ? (
          <SkeletonCard />
        ) : fetchListError ? (
          <p className="text-sm text-rose-600">Não foi possível carregar as contas: {fetchListError.message}</p>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-slate-500">Nenhuma conta cadastrada ainda.</p>
            <button
              type="button"
              onClick={openNewAccount}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Nova conta
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((group) => (
              <div key={group.type}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {ACCOUNT_TYPE_LABELS[group.type]}
                </h3>
                <div className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {group.accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        account.archived ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{account.name}</span>
                          {account.archived && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                              Arquivada
                            </span>
                          )}
                        </div>
                        {account.institution && (
                          <span className="text-sm text-slate-500">{account.institution}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-medium ${
                            account.balanceCents >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatBRL(account.balanceCents)}
                        </span>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => openEditAccount(account)}
                            className="text-sm text-slate-500 hover:text-slate-900"
                            aria-label={`Editar conta ${account.name}`}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(account, !account.archived)}
                            className="text-sm text-slate-500 hover:text-slate-900"
                            aria-label={`${account.archived ? 'Desarquivar' : 'Arquivar'} conta ${account.name}`}
                          >
                            {account.archived ? 'Desarquivar' : 'Arquivar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(account)}
                            className="text-sm text-rose-500 hover:text-rose-700"
                            aria-label={`Excluir conta ${account.name}`}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {investmentAccounts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-700">Snapshots de investimento</h2>
            <div className="flex items-center gap-3">
              <label htmlFor="snapshot-account-select" className="text-sm text-slate-600">
                Conta
              </label>
              <select
                id="snapshot-account-select"
                value={selectedInvId ?? ''}
                onChange={(e) => setSelectedInvId(Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {investmentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSnapshotModalOpen(true)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Registrar valor
              </button>
            </div>
          </div>

          {snapshotsLoading ? (
            <SkeletonCard />
          ) : snapshotsError ? (
            <p className="text-sm text-rose-600">Não foi possível carregar os valores: {snapshotsError.message}</p>
          ) : (snapshots ?? []).length === 0 ? (
            <p className="py-6 text-center text-slate-500">Nenhum valor registrado para essa conta ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Data
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Valor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...(snapshots ?? [])]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((snap) => (
                    <tr key={snap.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2">{formatDate(snap.date)}</td>
                      <td className="px-4 py-2">{formatBRL(snap.balanceCents)}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap)}
                          className="text-sm text-rose-500 hover:text-rose-700"
                          aria-label={`Excluir valor de ${formatDate(snap.date)}`}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <AccountForm
        open={accountModalOpen}
        editing={editingAccount}
        onClose={() => setAccountModalOpen(false)}
        onSaved={handleAccountSaved}
      />
      <SnapshotForm
        open={snapshotModalOpen}
        accounts={investmentAccounts}
        defaultAccountId={selectedInvId}
        onClose={() => setSnapshotModalOpen(false)}
        onSaved={handleSnapshotSaved}
      />
    </div>
  )
}
