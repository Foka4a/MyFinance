import { pathToFileURL } from 'node:url';

// Cores de categoria fazem parte da paleta da interface (aparecem no donut e nos
// marcadores da tabela). A rampa de despesas gira o matiz devagar, com claridade
// parecida, pra que oito fatias vizinhas continuem distinguiveis no grafico.
// Receitas ficam na familia verde porque entrada ja e verde no resto do app.
// A claridade alta (oklch L ~0.72-0.78) e o que faz elas aparecerem sobre o
// fundo escuro da interface — a rampa anterior era calibrada pra fundo claro.
const INCOME_CATEGORIES = [
  ['Salário', '#54cc8e'],
  ['Freelance', '#3ecfae'],
  ['Rendimentos', '#7ecb62'],
  ['Outras receitas', '#a8c552'],
];

const EXPENSE_CATEGORIES = [
  ['Moradia', '#8a9bff'],
  ['Alimentação', '#00c4c4'],
  ['Transporte', '#eba941'],
  ['Saúde', '#f57373'],
  ['Educação', '#55b8f8'],
  ['Lazer', '#c889d7'],
  ['Assinaturas', '#e58fb0'],
  ['Outras despesas', '#9da2a9'],
];

// Cores das versoes anteriores do seed. Bancos criados antes da paleta atual
// ainda as tem; so trocamos quando a cor ainda e exatamente uma das antigas,
// pra nunca sobrescrever uma cor que alguem tenha mudado depois.
const LEGACY_COLORS = {
  'Salário': ['#22c55e', '#0E7C55'],
  Freelance: ['#10b981', '#1F8F74'],
  Rendimentos: ['#14b8a6', '#43893F'],
  'Outras receitas': ['#84cc16', '#7B9A34'],
  Moradia: ['#ef4444', '#A8385F'],
  'Alimentação': ['#f97316', '#C0603A'],
  Transporte: ['#f59e0b', '#A97A1E'],
  'Saúde': ['#ec4899', '#4E8C4A'],
  'Educação': ['#8b5cf6', '#2F8E86'],
  Lazer: ['#06b6d4', '#3D6FB5'],
  Assinaturas: ['#6366f1', '#6558B8'],
  'Outras despesas': ['#64748b', '#7A7F94'],
};

// Nomes sem acento das versoes anteriores do seed.
const LEGACY_NAMES = {
  Salario: 'Salário',
  Alimentacao: 'Alimentação',
  Saude: 'Saúde',
  Educacao: 'Educação',
};

// Roda em todo boot: bancos criados antes da paleta/grafia atual sao atualizados
// sem que ninguem precise apagar o arquivo.
export function migrateLegacyCategories(db) {
  // OR IGNORE: se o nome acentuado ja existir, deixa o antigo quieto em vez de estourar no unique.
  const rename = db.prepare('UPDATE OR IGNORE categories SET name = ? WHERE name = ?');
  const recolor = db.prepare('UPDATE categories SET color = ? WHERE name = ? AND color = ?');
  const run = db.transaction(() => {
    for (const [old, name] of Object.entries(LEGACY_NAMES)) rename.run(name, old);
    for (const [name, color] of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
      for (const old of LEGACY_COLORS[name] ?? []) recolor.run(color, name, old);
    }
  });
  run();
}

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
