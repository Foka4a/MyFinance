import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { put, del } from '../lib/api.js'
import { formatBRL, formatDate } from '../lib/format.js'
import StatCard from '../components/StatCard.jsx'
import { SkeletonList, SkeletonRows } from '../components/Skeleton.jsx'
import PatrimonioChart, { periodRange } from '../components/PatrimonioChart.jsx'
import AccountForm, { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../components/AccountForm.jsx'
import SnapshotForm from '../components/SnapshotForm.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  Dot,
  EmptyState,
  ErrorNote,
  Money,
  PageHeader,
  btnGhost,
  btnLink,
  btnLinkDanger,
  btnPrimary,
  card,
  inputSm,
  th,
} from '../components/ui.jsx'

// Cor por tipo de conta, nao por conta: duas contas correntes lidas lado a lado
// contam a mesma historia, e o tipo e o que muda o peso no patrimonio.
const TYPE_COLOR = {
  corrente: '#c889d7',
  poupanca: '#8a9bff',
  carteira: '#54cc8e',
  investimento: '#00c4c4',
}

export default function Contas() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [listError, setListError] = useState(null)
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false)
  const [selectedInvId, setSelectedInvId] = useState(null)
  const [patrimonioMonths, setPatrimonioMonths] = useState(12)
  const [confirmRequest, setConfirmRequest] = useState(null)

  // Sempre ativas: base para os cards de resumo do topo (nao muda com o toggle de arquivadas).
  const { data: activeAccounts, loading: activeLoading, error: activeError, reload: reloadActive } = useApi('/accounts')

  const listPath = `/accounts?includeArchived=${includeArchived ? 1 : 0}`
  const { data: listedAccounts, loading: listLoading, error: fetchListError, reload: reloadList } = useApi(listPath)

  // Mesma janela do seletor do grafico de patrimonio: card de crescimento e grafico sempre mostram o mesmo periodo.
  const { from: networthFrom, to: networthTo } = periodRange(patrimonioMonths)
  const { data: networthSeries, loading: networthLoading, error: networthError } = useApi(
    `/networth?from=${networthFrom}&to=${networthTo}&granularity=month`
  )

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

  const growthItems = networthSeries ?? []
  const growthFirst = growthItems[0]?.totalCents ?? 0
  const growthLast = growthItems[growthItems.length - 1]?.totalCents ?? 0
  const growthDeltaCents = growthLast - growthFirst
  const growthPct = growthFirst !== 0 ? (growthDeltaCents / Math.abs(growthFirst)) * 100 : null

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

  function askDeleteAccount(account) {
    setConfirmRequest({
      title: 'Excluir conta',
      description: `A conta "${account.name}" sai do patrimônio. Se ela tiver lançamentos, arquivar preserva o histórico.`,
      confirmLabel: 'Excluir conta',
      onConfirm: async () => {
        await del(`/accounts/${account.id}`)
        reloadAccounts()
      },
    })
  }

  function askDeleteSnapshot(snapshot) {
    setConfirmRequest({
      title: 'Excluir valor registrado',
      description: `O valor de ${formatDate(snapshot.date)} (${formatBRL(snapshot.balanceCents)}) sai do histórico de patrimônio.`,
      confirmLabel: 'Excluir valor',
      onConfirm: async () => {
        await del(`/investments/snapshots/${snapshot.id}`)
        reloadSnapshots()
      },
    })
  }

  function handleSnapshotSaved() {
    setSnapshotModalOpen(false)
    reloadSnapshots()
  }

  // Ordena por tipo pra as cores agruparem sozinhas na grade.
  const visibleAccounts = [...(listedAccounts ?? [])].sort(
    (a, b) => ACCOUNT_TYPES.indexOf(a.type) - ACCOUNT_TYPES.indexOf(b.type)
  )

  function shareOf(cents) {
    if (!patrimonioTotalCents) return 'primeira conta do patrimônio'
    return `${Math.round((cents / patrimonioTotalCents) * 100)}% do patrimônio`
  }

  return (
    <div>
      <PageHeader title="Contas e investimentos" lede="Onde o dinheiro está e como o patrimônio se moveu.">
        <button type="button" onClick={openNewAccount} className={btnPrimary}>
          Nova conta
        </button>
      </PageHeader>

      {activeError ? (
        <ErrorNote className="mb-8">Não foi possível carregar as contas: {activeError.message}</ErrorNote>
      ) : (
        <>
          <section className="mb-6">
            <StatCard
              variant="hero"
              label="Patrimônio total"
              valueCents={patrimonioTotalCents}
              variationPct={growthPct}
              hint={`Variação dos últimos ${patrimonioMonths} meses.`}
              tone="auto"
              loading={activeLoading || networthLoading}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Disponível"
              valueCents={disponivelCents}
              dot={TYPE_COLOR.carteira}
              hint="fora dos investimentos"
              loading={activeLoading}
            />
            <StatCard
              label="Investido"
              valueCents={investidoCents}
              dot={TYPE_COLOR.investimento}
              hint={investidoCents === 0 ? 'nenhuma carteira cadastrada' : undefined}
              loading={activeLoading}
            />
            <StatCard
              label={`Crescimento em ${patrimonioMonths} meses`}
              valueCents={growthDeltaCents}
              dot={TYPE_COLOR.poupanca}
              tone="auto"
              loading={activeLoading || networthLoading}
            />
          </section>
        </>
      )}

      <div className="mb-5">
        <PatrimonioChart
          hasAccounts={(activeAccounts ?? []).length > 0}
          months={patrimonioMonths}
          onMonthsChange={setPatrimonioMonths}
          data={networthSeries}
          loading={networthLoading}
          error={networthError}
        />
      </div>

      <section className="mb-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-ink">Contas</h2>
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="size-4 accent-azul"
            />
            Mostrar arquivadas
          </label>
        </div>

        {listError && <ErrorNote className="mb-4">{listError}</ErrorNote>}

        {listLoading ? (
          <div className={`${card} p-5`}>
            <SkeletonList rows={4} />
          </div>
        ) : fetchListError ? (
          <ErrorNote>Não foi possível carregar as contas: {fetchListError.message}</ErrorNote>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAccounts.map((account) => (
              <article
                key={account.id}
                className={`${card} flex flex-col gap-3 p-[18px] ${account.archived ? 'opacity-55' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Dot color={TYPE_COLOR[account.type]} className="size-2.5" />
                    <span className="truncate text-sm font-semibold text-ink">{account.name}</span>
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[11px] text-ink-3">
                    {account.archived ? 'Arquivada' : ACCOUNT_TYPE_LABELS[account.type]}
                  </span>
                </div>

                <Money cents={account.balanceCents} tone="auto" className="text-[22px] font-semibold" />

                <p className="text-xs text-ink-2">
                  {account.institution ? `${account.institution} · ` : ''}
                  {shareOf(account.balanceCents)}
                </p>

                <div className="mt-auto flex gap-3 border-t border-line pt-3 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => openEditAccount(account)}
                    className={`${btnLink} text-[12.5px]`}
                    aria-label={`Editar conta ${account.name}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(account, !account.archived)}
                    className={`${btnLink} text-[12.5px]`}
                    aria-label={`${account.archived ? 'Desarquivar' : 'Arquivar'} conta ${account.name}`}
                  >
                    {account.archived ? 'Desarquivar' : 'Arquivar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => askDeleteAccount(account)}
                    className={`${btnLinkDanger} ml-auto text-[12.5px]`}
                    aria-label={`Excluir conta ${account.name}`}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}

            {/* Card fantasma do design: o convite pra cadastrar mora na propria
                grade, entao a grade nunca aparece vazia. */}
            <article className="flex flex-col items-start justify-center gap-2 rounded-card border border-dashed border-line p-[18px]">
              <p className="text-sm font-semibold text-ink-2">Adicionar conta</p>
              <p className="text-[12.5px] leading-relaxed text-ink-3">
                Cadastre a conta corrente, a carteira ou o investimento para o patrimônio começar a somar.
              </p>
              <button type="button" onClick={openNewAccount} className={`${btnGhost} mt-1 px-3.5 py-2 text-[12.5px]`}>
                Nova conta
              </button>
            </article>
          </div>
        )}
      </section>

      {investmentAccounts.length > 0 && (
        <section className={`${card} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Valores registrados</h2>
              <p className="mt-1 text-[12.5px] text-ink-3">
                {(snapshots ?? []).length === 0
                  ? 'Enquanto não houver valor registrado, o saldo do investimento é o saldo inicial cadastrado na conta.'
                  : 'O saldo de um investimento vem do último valor que você registrou.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="snapshot-account-select" className="text-sm text-ink-3">
                Conta
              </label>
              <select
                id="snapshot-account-select"
                value={selectedInvId ?? ''}
                onChange={(e) => setSelectedInvId(Number(e.target.value))}
                className={inputSm}
              >
                {investmentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setSnapshotModalOpen(true)} className={btnGhost}>
                Registrar valor
              </button>
            </div>
          </div>

          {snapshotsLoading ? (
            <SkeletonRows rows={4} cols={3} />
          ) : snapshotsError ? (
            <div className="p-5">
              <ErrorNote>Não foi possível carregar os valores: {snapshotsError.message}</ErrorNote>
            </div>
          ) : (snapshots ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum valor registrado nessa conta"
              hint="Registre quanto ela vale hoje para começar a linha de patrimônio."
              action={
                <button type="button" onClick={() => setSnapshotModalOpen(true)} className={btnPrimary}>
                  Registrar valor
                </button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Data</th>
                  <th className={`${th} text-right`}>Valor</th>
                  <th className={`${th} text-right`}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...(snapshots ?? [])]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((snap) => (
                    <tr
                      key={snap.id}
                      className="border-t border-line transition-colors hover:bg-surface-2"
                    >
                      <td className="px-5 py-3.5">
                        <span className="money text-ink-3">{formatDate(snap.date)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Money cents={snap.balanceCents} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => askDeleteSnapshot(snap)}
                          className={`${btnLinkDanger} text-[12.5px]`}
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
        </section>
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
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}
