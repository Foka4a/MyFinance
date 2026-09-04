import { db } from './db.js';
import { requireDate, ValidationError } from './validate.js';

const txSumsUntilStmt = db.prepare(
  `SELECT
     COALESCE(SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
     COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
   FROM transactions WHERE account_id = ? AND date <= ?`
);

const latestSnapshotStmt = db.prepare(
  `SELECT balance_cents FROM investment_snapshots
   WHERE account_id = ? AND date <= ?
   ORDER BY date DESC LIMIT 1`
);

const activeAccountsStmt = db.prepare('SELECT * FROM accounts WHERE archived = 0');
const activeNonInvestmentAccountsStmt = db.prepare(
  "SELECT * FROM accounts WHERE archived = 0 AND type != 'investimento'"
);

// --- saldo ---

export function balanceAtDate(account, date) {
  if (account.type === 'investimento') {
    const snapshot = latestSnapshotStmt.get(account.id, date);
    if (snapshot) return snapshot.balance_cents;
  }
  const { income, expense } = txSumsUntilStmt.get(account.id, date);
  return account.opening_balance_cents + income - expense;
}

export function totalBalanceAtDate(date, { excludeInvestment = false } = {}) {
  const accounts = excludeInvestment
    ? activeNonInvestmentAccountsStmt.all()
    : activeAccountsStmt.all();
  return accounts.reduce((sum, account) => sum + balanceAtDate(account, date), 0);
}

// --- datas (util) ---

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toUTCDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr, delta) {
  const date = toUTCDate(dateStr);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDateStr(date);
}

export function diffDaysInclusive(from, to) {
  const ms = toUTCDate(to) - toUTCDate(from);
  return Math.round(ms / 86400000) + 1;
}

export function defaultPeriod() {
  const today = todayStr();
  const month = today.slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export function previousPeriod(from, to) {
  const len = diffDaysInclusive(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(len - 1));
  return { from: prevFrom, to: prevTo };
}

export function enumerateDays(from, to) {
  const days = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

export function monthOf(dateStr) {
  return dateStr.slice(0, 7);
}

export function nextMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function enumerateMonths(from, to) {
  const months = [];
  const end = monthOf(to);
  for (let cursor = monthOf(from); cursor <= end; cursor = nextMonth(cursor)) {
    months.push(cursor);
  }
  return months;
}

export function lastDayOfMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${yyyyMM}-${String(lastDay).padStart(2, '0')}`;
}

// resolve from/to query params: default per-field to o mes atual, valida from <= to
export function resolvePeriod(query) {
  const fallback = defaultPeriod();
  const from = query.from === undefined ? fallback.from : requireDate(query.from, 'from');
  const to = query.to === undefined ? fallback.to : requireDate(query.to, 'to');
  if (from > to) throw new ValidationError('from deve ser menor ou igual a to');
  return { from, to };
}
