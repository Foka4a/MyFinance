import { Router } from 'express';
import { db } from '../db.js';
import { requireEnum } from '../validate.js';
import { resolvePeriod, previousPeriod, totalBalanceAtDate, todayStr } from '../balances.js';

const KINDS = ['income', 'expense'];

const sumsStmt = db.prepare(
  `SELECT
     COALESCE(SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
     COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
   FROM transactions WHERE date BETWEEN ? AND ?`
);

const byCategoryStmt = db.prepare(
  `SELECT c.id AS categoryId, c.name AS name, c.color AS color,
          COALESCE(SUM(t.amount_cents), 0) AS totalCents
   FROM transactions t
   JOIN categories c ON c.id = t.category_id
   WHERE t.kind = ? AND t.date BETWEEN ? AND ? AND t.category_id IS NOT NULL
   GROUP BY c.id, c.name, c.color
   ORDER BY totalCents DESC`
);

const uncategorizedStmt = db.prepare(
  `SELECT COALESCE(SUM(amount_cents), 0) AS totalCents
   FROM transactions
   WHERE kind = ? AND date BETWEEN ? AND ? AND category_id IS NULL`
);

function pct(curr, prev) {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

export const summaryRouter = Router();

summaryRouter.get('/', (req, res) => {
  const { from, to } = resolvePeriod(req.query);
  const { income, expense } = sumsStmt.get(from, to);
  const net = income - expense;

  const prev = previousPeriod(from, to);
  const prevSums = sumsStmt.get(prev.from, prev.to);
  const prevNet = prevSums.income - prevSums.expense;

  const today = todayStr();
  const balanceCents = totalBalanceAtDate(today);
  const availableCents = totalBalanceAtDate(today, { excludeInvestment: true });

  res.json({
    from,
    to,
    incomeCents: income,
    expenseCents: expense,
    netCents: net,
    balanceCents,
    availableCents,
    previous: {
      from: prev.from,
      to: prev.to,
      incomeCents: prevSums.income,
      expenseCents: prevSums.expense,
      netCents: prevNet,
    },
    variation: {
      incomePct: pct(income, prevSums.income),
      expensePct: pct(expense, prevSums.expense),
      netPct: pct(net, prevNet),
    },
  });
});

summaryRouter.get('/by-category', (req, res) => {
  const { from, to } = resolvePeriod(req.query);
  const kind = req.query.kind === undefined ? 'expense' : requireEnum(req.query.kind, KINDS, 'kind');

  const rows = byCategoryStmt.all(kind, from, to);
  const result = rows.map((r) => ({
    categoryId: r.categoryId,
    name: r.name,
    color: r.color,
    totalCents: r.totalCents,
  }));

  const uncategorized = uncategorizedStmt.get(kind, from, to).totalCents;
  if (uncategorized > 0) {
    result.push({ categoryId: null, name: 'Sem categoria', color: '#94a3b8', totalCents: uncategorized });
  }

  res.json(result);
});
