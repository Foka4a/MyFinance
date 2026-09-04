import { Router } from 'express';
import { db } from '../db.js';
import { requireString, optionalString, requireEnum, requireId } from '../validate.js';

const KINDS = ['income', 'expense'];

const selectStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
const listAllStmt = db.prepare('SELECT * FROM categories ORDER BY kind, name');
const listByKindStmt = db.prepare('SELECT * FROM categories WHERE kind = ? ORDER BY name');
const findByNameKindStmt = db.prepare('SELECT id FROM categories WHERE name = ? AND kind = ?');
const insertStmt = db.prepare('INSERT INTO categories (name, kind, color) VALUES (?, ?, ?)');
const updateStmt = db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ?');
const usageCountStmt = db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?');

function toJson(category) {
  return { id: category.id, name: category.name, kind: category.kind, color: category.color };
}

function notFound() {
  return Object.assign(new Error('Nao encontrado'), { status: 404 });
}

export const categoriesRouter = Router();

categoriesRouter.get('/', (req, res) => {
  const { kind } = req.query;
  if (kind !== undefined) requireEnum(kind, KINDS, 'Tipo');
  const rows = kind ? listByKindStmt.all(kind) : listAllStmt.all();
  res.json(rows.map(toJson));
});

categoriesRouter.post('/', (req, res) => {
  const { name, kind, color } = req.body ?? {};
  const cleanName = requireString(name, 'Nome');
  const cleanKind = requireEnum(kind, KINDS, 'Tipo');
  const cleanColor = optionalString(color) ?? '#64748b';

  if (findByNameKindStmt.get(cleanName, cleanKind)) {
    const err = new Error('Categoria ja existe');
    err.status = 409;
    throw err;
  }

  const info = insertStmt.run(cleanName, cleanKind, cleanColor);
  res.status(201).json(toJson(selectStmt.get(info.lastInsertRowid)));
});

categoriesRouter.put('/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  const existing = selectStmt.get(id);
  if (!existing) throw notFound();

  const { name, color, kind } = req.body ?? {};
  if (kind !== undefined && kind !== existing.kind) {
    const err = new Error('Tipo da categoria nao pode ser alterado');
    err.status = 400;
    throw err;
  }

  const cleanName = name === undefined ? existing.name : requireString(name, 'Nome');
  const cleanColor = color === undefined ? existing.color : (optionalString(color) ?? existing.color);

  if (cleanName !== existing.name) {
    const dup = findByNameKindStmt.get(cleanName, existing.kind);
    if (dup && dup.id !== id) {
      const err = new Error('Categoria ja existe');
      err.status = 409;
      throw err;
    }
  }

  updateStmt.run(cleanName, cleanColor, id);
  res.json(toJson(selectStmt.get(id)));
});

categoriesRouter.delete('/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  const existing = selectStmt.get(id);
  if (!existing) throw notFound();

  if (usageCountStmt.get(id).n > 0) {
    const err = new Error('Categoria em uso por lancamentos');
    err.status = 409;
    throw err;
  }

  deleteStmt.run(id);
  res.status(204).send();
});
