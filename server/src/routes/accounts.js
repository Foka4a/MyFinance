import { Router } from 'express';
import { db } from '../db.js';
import {
  requireString,
  optionalString,
  requireEnum,
  requireIntCents,
  requireId,
} from '../validate.js';
import { balanceAtDate, todayStr } from '../balances.js';

const ACCOUNT_TYPES = ['corrente', 'poupanca', 'carteira', 'investimento'];

const selectStmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
const insertStmt = db.prepare(
  'INSERT INTO accounts (name, type, institution, opening_balance_cents) VALUES (?, ?, ?, ?)'
);
const updateStmt = db.prepare(
  'UPDATE accounts SET name = ?, type = ?, institution = ?, opening_balance_cents = ?, archived = ? WHERE id = ?'
);
const deleteStmt = db.prepare('DELETE FROM accounts WHERE id = ?');
const listStmt = db.prepare('SELECT * FROM accounts ORDER BY name');
const listActiveStmt = db.prepare('SELECT * FROM accounts WHERE archived = 0 ORDER BY name');
const txCountStmt = db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?');
const snapshotCountStmt = db.prepare(
  'SELECT COUNT(*) AS n FROM investment_snapshots WHERE account_id = ?'
);

function computeBalanceCents(account) {
  return balanceAtDate(account, todayStr());
}

function toJson(account) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    institution: account.institution,
    openingBalanceCents: account.opening_balance_cents,
    archived: account.archived === 1,
    balanceCents: computeBalanceCents(account),
  };
}

export const accountsRouter = Router();

accountsRouter.get('/', (req, res) => {
  const includeArchived = req.query.includeArchived === '1';
  const rows = includeArchived ? listStmt.all() : listActiveStmt.all();
  res.json(rows.map(toJson));
});

accountsRouter.post('/', (req, res) => {
  const { name, type, institution, openingBalanceCents } = req.body ?? {};
  const cleanName = requireString(name, 'Nome');
  const cleanType = requireEnum(type, ACCOUNT_TYPES, 'Tipo de conta');
  const cleanInstitution = optionalString(institution);
  const cleanOpening = openingBalanceCents === undefined ? 0 : requireIntCents(openingBalanceCents);

  const info = insertStmt.run(cleanName, cleanType, cleanInstitution, cleanOpening);
  const account = selectStmt.get(info.lastInsertRowid);
  res.status(201).json(toJson(account));
});

accountsRouter.put('/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  const existing = selectStmt.get(id);
  if (!existing) throw Object.assign(new Error('Nao encontrado'), { status: 404 });

  const { name, type, institution, openingBalanceCents, archived } = req.body ?? {};
  const cleanName = requireString(name, 'Nome');
  const cleanType = requireEnum(type, ACCOUNT_TYPES, 'Tipo de conta');
  const cleanInstitution = optionalString(institution);
  const cleanOpening = openingBalanceCents === undefined ? existing.opening_balance_cents : requireIntCents(openingBalanceCents);
  const cleanArchived = archived === undefined ? existing.archived : archived ? 1 : 0;

  updateStmt.run(cleanName, cleanType, cleanInstitution, cleanOpening, cleanArchived, id);
  const account = selectStmt.get(id);
  res.json(toJson(account));
});

accountsRouter.delete('/:id', (req, res) => {
  const id = requireId(req.params.id, 'Id');
  const existing = selectStmt.get(id);
  if (!existing) throw Object.assign(new Error('Nao encontrado'), { status: 404 });

  const hasTx = txCountStmt.get(id).n > 0;
  const hasSnapshots = snapshotCountStmt.get(id).n > 0;
  if (hasTx || hasSnapshots) {
    const err = new Error('Conta possui lancamentos, arquive em vez de excluir');
    err.status = 409;
    throw err;
  }

  deleteStmt.run(id);
  res.status(204).send();
});
