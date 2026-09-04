import { Router } from 'express';
import { db } from '../db.js';
import { ValidationError, requireDate, requireId, requireEnum, requireNonNegativeIntCents } from '../validate.js';
import {
  resolvePeriod,
  totalBalanceAtDate,
  enumerateMonths,
  lastDayOfMonth,
  todayStr,
} from '../balances.js';

const findAccountStmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
const findSnapshotByIdStmt = db.prepare('SELECT id FROM investment_snapshots WHERE id = ?');
const selectByAccountDateStmt = db.prepare(
  `SELECT s.*, a.name AS account_name FROM investment_snapshots s
   JOIN accounts a ON a.id = s.account_id
   WHERE s.account_id = ? AND s.date = ?`
);
const upsertStmt = db.prepare(
  `INSERT INTO investment_snapshots (account_id, date, balance_cents) VALUES (?, ?, ?)
   ON CONFLICT(account_id, date) DO UPDATE SET balance_cents = excluded.balance_cents`
);
const deleteSnapshotStmt = db.prepare('DELETE FROM investment_snapshots WHERE id = ?');

function toJson(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    date: row.date,
    balanceCents: row.balance_cents,
  };
}

export const investmentsRouter = Router();

investmentsRouter.get('/snapshots', (req, res) => {
  const { accountId, from, to } = req.query;
  const conditions = [];
  const params = [];

  if (accountId !== undefined) {
    conditions.push('s.account_id = ?');
    params.push(requireId(accountId, 'accountId'));
  }
  if (from !== undefined) {
    conditions.push('s.date >= ?');
    params.push(requireDate(from, 'from'));
  }
  if (to !== undefined) {
    conditions.push('s.date <= ?');
    params.push(requireDate(to, 'to'));
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT s.*, a.name AS account_name FROM investment_snapshots s
       JOIN accounts a ON a.id = s.account_id
       ${whereSql}
       ORDER BY s.date DESC`
    )
    .all(...params);

  res.json(rows.map(toJson));
});

investmentsRouter.post('/snapshots', (req, res) => {
  const { accountId, date, balanceCents } = req.body ?? {};
  const cleanAccountId = requireId(accountId, 'accountId');
  const account = findAccountStmt.get(cleanAccountId);
  if (!account || account.type !== 'investimento') {
    throw new ValidationError('Snapshot so pode ser criado em conta de investimento');
  }
  const cleanDate = requireDate(date);
  const cleanBalance = requireNonNegativeIntCents(balanceCents);

  upsertStmt.run(cleanAccountId, cleanDate, cleanBalance);
  const row = selectByAccountDateStmt.get(cleanAccountId, cleanDate);
  res.status(201).json(toJson(row));
});

investmentsRouter.delete('/snapshots/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  if (!findSnapshotByIdStmt.get(id)) {
    throw Object.assign(new Error('Nao encontrado'), { status: 404 });
  }
  deleteSnapshotStmt.run(id);
  res.status(204).send();
});

// patrimonio (crescimento) - serie por mes usando o saldo total no fim de cada periodo
export const networthRouter = Router();

networthRouter.get('/', (req, res) => {
  const { from, to } = resolvePeriod(req.query);
  if (req.query.granularity !== undefined) {
    requireEnum(req.query.granularity, ['month'], 'granularity');
  }

  const today = todayStr();
  const items = enumerateMonths(from, to).map((period) => {
    const monthEnd = lastDayOfMonth(period);
    const effectiveDate = monthEnd < today ? monthEnd : today;
    return { period, totalCents: totalBalanceAtDate(effectiveDate) };
  });

  res.json(items);
});
