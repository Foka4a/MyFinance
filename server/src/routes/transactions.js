import { Router } from 'express';
import { db } from '../db.js';
import {
  ValidationError,
  requireString,
  optionalString,
  requireEnum,
  requirePositiveIntCents,
  requireDate,
  requireId,
  parseIntParam,
} from '../validate.js';

const KINDS = ['income', 'expense'];
const SORT_COLUMNS = { date: 'date', amountCents: 'amount_cents', description: 'description' };

const findCategoryStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
const findAccountStmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
const selectStmt = db.prepare(
  `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
   FROM transactions t
   LEFT JOIN categories c ON c.id = t.category_id
   JOIN accounts a ON a.id = t.account_id
   WHERE t.id = ?`
);
const insertStmt = db.prepare(
  `INSERT INTO transactions (date, description, amount_cents, kind, category_id, account_id, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const updateStmt = db.prepare(
  `UPDATE transactions
   SET date = ?, description = ?, amount_cents = ?, kind = ?, category_id = ?, account_id = ?, notes = ?
   WHERE id = ?`
);
const deleteStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
const baseFindStmt = db.prepare('SELECT id FROM transactions WHERE id = ?');

function toJson(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amountCents: row.amount_cents,
    kind: row.kind,
    categoryId: row.category_id,
    categoryName: row.category_id === null ? null : row.category_name,
    categoryColor: row.category_id === null ? null : row.category_color,
    accountId: row.account_id,
    accountName: row.account_name,
    notes: row.notes,
  };
}

function notFound() {
  return Object.assign(new Error('Nao encontrado'), { status: 404 });
}

function validateBody(body) {
  const { date, description, amountCents, kind, categoryId, accountId, notes } = body ?? {};

  const cleanDate = requireDate(date);
  const cleanDescription = requireString(description, 'Descricao');
  const cleanAmount = requirePositiveIntCents(amountCents);
  const cleanKind = requireEnum(kind, KINDS, 'Tipo do lancamento');
  const cleanNotes = optionalString(notes);

  let cleanCategoryId = null;
  if (categoryId !== undefined && categoryId !== null) {
    cleanCategoryId = requireId(categoryId, 'categoryId');
    const category = findCategoryStmt.get(cleanCategoryId);
    if (!category) throw new ValidationError('categoryId invalido');
    if (category.kind !== cleanKind) {
      throw new ValidationError('Categoria nao corresponde ao tipo do lancamento');
    }
  }

  const cleanAccountId = requireId(accountId, 'accountId');
  if (!findAccountStmt.get(cleanAccountId)) {
    throw new ValidationError('accountId invalido');
  }

  return {
    date: cleanDate,
    description: cleanDescription,
    amountCents: cleanAmount,
    kind: cleanKind,
    categoryId: cleanCategoryId,
    accountId: cleanAccountId,
    notes: cleanNotes,
  };
}

export const transactionsRouter = Router();

transactionsRouter.get('/', (req, res) => {
  const { from, to, kind, categoryId, accountId, sort, order } = req.query;

  const conditions = [];
  const params = [];

  if (from !== undefined) {
    conditions.push('t.date >= ?');
    params.push(requireDate(from, 'from'));
  }
  if (to !== undefined) {
    conditions.push('t.date <= ?');
    params.push(requireDate(to, 'to'));
  }
  if (kind !== undefined) {
    conditions.push('t.kind = ?');
    params.push(requireEnum(kind, KINDS, 'kind'));
  }
  if (categoryId !== undefined) {
    conditions.push('t.category_id = ?');
    params.push(requireId(categoryId, 'categoryId'));
  }
  if (accountId !== undefined) {
    conditions.push('t.account_id = ?');
    params.push(requireId(accountId, 'accountId'));
  }

  const page = req.query.page === undefined ? 1 : requireId(req.query.page, 'page');
  let pageSize = req.query.pageSize === undefined ? 50 : parseIntParam(req.query.pageSize, 'pageSize');
  if (pageSize === undefined || pageSize <= 0) pageSize = 50;
  if (pageSize > 200) pageSize = 200;

  const sortColumn = sort === undefined ? 'date' : sort;
  if (!Object.hasOwn(SORT_COLUMNS, sortColumn)) throw new ValidationError('sort invalido');
  const sortSql = SORT_COLUMNS[sortColumn];

  const orderDir = order === undefined ? 'desc' : order;
  if (!['asc', 'desc'].includes(orderDir)) throw new ValidationError('order invalido');

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM transactions t ${whereSql}`)
    .get(...params).n;

  const rows = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       JOIN accounts a ON a.id = t.account_id
       ${whereSql}
       ORDER BY t.${sortSql} ${orderDir}, t.id desc
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  res.json({ items: rows.map(toJson), total, page, pageSize });
});

transactionsRouter.post('/', (req, res) => {
  const clean = validateBody(req.body);
  const info = insertStmt.run(
    clean.date,
    clean.description,
    clean.amountCents,
    clean.kind,
    clean.categoryId,
    clean.accountId,
    clean.notes
  );
  res.status(201).json(toJson(selectStmt.get(info.lastInsertRowid)));
});

transactionsRouter.put('/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  if (!baseFindStmt.get(id)) throw notFound();

  const clean = validateBody(req.body);
  updateStmt.run(
    clean.date,
    clean.description,
    clean.amountCents,
    clean.kind,
    clean.categoryId,
    clean.accountId,
    clean.notes,
    id
  );
  res.json(toJson(selectStmt.get(id)));
});

transactionsRouter.delete('/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  if (!baseFindStmt.get(id)) throw notFound();
  deleteStmt.run(id);
  res.status(204).send();
});
