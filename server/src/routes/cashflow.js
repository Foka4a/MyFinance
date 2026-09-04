import { Router } from 'express';
import { db } from '../db.js';
import { ValidationError, requireEnum } from '../validate.js';
import {
  resolvePeriod,
  totalBalanceAtDate,
  addDays,
  enumerateDays,
  enumerateMonths,
  diffDaysInclusive,
} from '../balances.js';

const GRANULARITIES = ['day', 'month'];

const dayGroupStmt = db.prepare(
  `SELECT date AS period,
     COALESCE(SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
     COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
   FROM transactions WHERE date BETWEEN ? AND ?
   GROUP BY date`
);

const monthGroupStmt = db.prepare(
  `SELECT strftime('%Y-%m', date) AS period,
     COALESCE(SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
     COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
   FROM transactions WHERE date BETWEEN ? AND ?
   GROUP BY period`
);

export const cashflowRouter = Router();

cashflowRouter.get('/', (req, res) => {
  const { from, to } = resolvePeriod(req.query);
  const granularity =
    req.query.granularity === undefined
      ? 'day'
      : requireEnum(req.query.granularity, GRANULARITIES, 'granularity');

  if (granularity === 'day' && diffDaysInclusive(from, to) > 400) {
    throw new ValidationError('Intervalo muito longo para granularidade diaria');
  }

  const periods = granularity === 'day' ? enumerateDays(from, to) : enumerateMonths(from, to);
  const rows = (granularity === 'day' ? dayGroupStmt : monthGroupStmt).all(from, to);
  const byPeriod = new Map(rows.map((r) => [r.period, r]));

  const openingCents = totalBalanceAtDate(addDays(from, -1));

  let cumulative = openingCents;
  const items = periods.map((period) => {
    const row = byPeriod.get(period) ?? { income: 0, expense: 0 };
    const netCents = row.income - row.expense;
    cumulative += netCents;
    return {
      period,
      incomeCents: row.income,
      expenseCents: row.expense,
      netCents,
      cumulativeCents: cumulative,
    };
  });

  res.json({ openingCents, items });
});
