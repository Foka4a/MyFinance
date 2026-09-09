import { Router } from 'express';
import { db } from '../db.js';
import { ValidationError, requireId, requirePositiveIntCents } from '../validate.js';
import { resolvePeriod } from '../balances.js';

const selectCategoryStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
const selectBudgetStmt = db.prepare('SELECT * FROM budgets WHERE category_id = ?');
const upsertStmt = db.prepare(
  `INSERT INTO budgets (category_id, limit_cents) VALUES (?, ?)
   ON CONFLICT(category_id) DO UPDATE SET limit_cents = excluded.limit_cents`
);
const deleteStmt = db.prepare('DELETE FROM budgets WHERE category_id = ?');

const listStmt = db.prepare(
  `SELECT c.id AS categoryId, c.name AS name, c.color AS color, b.limit_cents AS limitCents,
          COALESCE((
            SELECT SUM(t.amount_cents) FROM transactions t
            WHERE t.category_id = c.id AND t.kind = 'expense' AND t.date BETWEEN ? AND ?
          ), 0) AS spentCents
   FROM budgets b
   JOIN categories c ON c.id = b.category_id
   ORDER BY c.name`
);

function notFound() {
  return Object.assign(new Error('Nao encontrado'), { status: 404 });
}

export const budgetsRouter = Router();

budgetsRouter.get('/', (req, res) => {
  const { from, to } = resolvePeriod(req.query);
  const items = listStmt.all(from, to);
  res.json({ from, to, items });
});

budgetsRouter.put('/:categoryId', (req, res) => {
  const categoryId = requireId(req.params.categoryId, 'categoryId');
  const category = selectCategoryStmt.get(categoryId);
  if (!category) throw notFound();
  if (category.kind !== 'expense') {
    throw new ValidationError('Limite so vale para categoria de despesa');
  }

  const { limitCents } = req.body ?? {};
  const cleanLimitCents = requirePositiveIntCents(limitCents);

  upsertStmt.run(categoryId, cleanLimitCents);
  res.json({ categoryId, name: category.name, color: category.color, limitCents: cleanLimitCents });
});

budgetsRouter.delete('/:categoryId', (req, res) => {
  const categoryId = requireId(req.params.categoryId, 'categoryId');
  if (!selectBudgetStmt.get(categoryId)) throw notFound();

  deleteStmt.run(categoryId);
  res.status(204).send();
});
