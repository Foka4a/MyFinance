import { pathToFileURL } from 'node:url';

const INCOME_CATEGORIES = [
  ['Salario', '#22c55e'],
  ['Freelance', '#10b981'],
  ['Rendimentos', '#14b8a6'],
  ['Outras receitas', '#84cc16'],
];

const EXPENSE_CATEGORIES = [
  ['Moradia', '#ef4444'],
  ['Alimentacao', '#f97316'],
  ['Transporte', '#f59e0b'],
  ['Saude', '#ec4899'],
  ['Educacao', '#8b5cf6'],
  ['Lazer', '#06b6d4'],
  ['Assinaturas', '#6366f1'],
  ['Outras despesas', '#64748b'],
];

export function seed(db) {
  const insertCategory = db.prepare(
    'INSERT OR IGNORE INTO categories (name, kind, color) VALUES (?, ?, ?)'
  );
  const insertAccount = db.prepare(
    'INSERT INTO accounts (name, type, opening_balance_cents) VALUES (?, ?, ?)'
  );

  const run = db.transaction(() => {
    for (const [name, color] of INCOME_CATEGORIES) insertCategory.run(name, 'income', color);
    for (const [name, color] of EXPENSE_CATEGORIES) insertCategory.run(name, 'expense', color);

    const accountCount = db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n;
    if (accountCount === 0) {
      insertAccount.run('Carteira', 'carteira', 0);
    }
  });

  run();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { db } = await import('./db.js');
  seed(db);
  console.log('Seed concluido.');
}
