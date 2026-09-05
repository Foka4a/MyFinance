import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'smoke.db');
if (existsSync(dbPath)) rmSync(dbPath);

process.env.MYFINANCE_DB = dbPath;
process.env.PORT = '3099';

const { app } = await import('../src/index.js');

const server = app.listen(3099);
const base = 'http://localhost:3099';

async function request(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  return { status: res.status, body: json };
}

try {
  // health
  {
    const r = await request('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
  }

  // seeded categories/account already present
  const categoriesList = await request('GET', '/api/categories?kind=expense');
  assert.equal(categoriesList.status, 200);
  assert.ok(categoriesList.body.length > 0, 'deveria ter categorias seed');

  const accountsList = await request('GET', '/api/accounts');
  assert.equal(accountsList.status, 200);
  assert.ok(accountsList.body.some((a) => a.name === 'Carteira'), 'deveria ter conta Carteira seed');

  // create account
  const accountRes = await request('POST', '/api/accounts', {
    name: 'Conta Teste',
    type: 'corrente',
    openingBalanceCents: 10000,
  });
  assert.equal(accountRes.status, 201);
  const account = accountRes.body;
  assert.equal(account.balanceCents, 10000);

  // create category
  const categoryRes = await request('POST', '/api/categories', {
    name: 'Categoria Teste',
    kind: 'expense',
    color: '#123456',
  });
  assert.equal(categoryRes.status, 201);
  const category = categoryRes.body;

  // wrong-kind category rejected 400
  const wrongKind = await request('POST', '/api/transactions', {
    date: '2026-09-01',
    description: 'Errado',
    amountCents: 500,
    kind: 'income',
    categoryId: category.id,
    accountId: account.id,
  });
  assert.equal(wrongKind.status, 400);
  assert.equal(wrongKind.body.error, 'Categoria nao corresponde ao tipo do lancamento');

  // negative amount rejected 400
  const negativeAmount = await request('POST', '/api/transactions', {
    date: '2026-09-01',
    description: 'Negativo',
    amountCents: -500,
    kind: 'expense',
    accountId: account.id,
  });
  assert.equal(negativeAmount.status, 400);
  assert.equal(negativeAmount.body.error, 'Valor deve ser inteiro positivo em centavos');

  // create transaction (expense, correct kind)
  const txRes = await request('POST', '/api/transactions', {
    date: '2026-09-01',
    description: 'Compra teste',
    amountCents: 3000,
    kind: 'expense',
    categoryId: category.id,
    accountId: account.id,
    notes: 'nota',
  });
  assert.equal(txRes.status, 201);
  const tx = txRes.body;
  assert.equal(tx.categoryName, 'Categoria Teste');
  assert.equal(tx.categoryColor, '#123456');
  assert.equal(tx.accountName, 'Conta Teste');

  // create income transaction too, to test balance math
  const incomeRes = await request('POST', '/api/transactions', {
    date: '2026-09-02',
    description: 'Salario teste',
    amountCents: 20000,
    kind: 'income',
    accountId: account.id,
  });
  assert.equal(incomeRes.status, 201);

  // list with filter
  const listRes = await request(
    'GET',
    `/api/transactions?accountId=${account.id}&kind=expense`
  );
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.total, 1);
  assert.equal(listRes.body.items[0].id, tx.id);

  // delete category in use -> 409
  const deleteCategoryInUse = await request('DELETE', `/api/categories/${category.id}`);
  assert.equal(deleteCategoryInUse.status, 409);
  assert.equal(deleteCategoryInUse.body.error, 'Categoria em uso por lancamentos');

  // account balance math correct: opening 10000 + income 20000 - expense 3000 = 27000
  const accountAfter = await request('GET', '/api/accounts');
  const found = accountAfter.body.find((a) => a.id === account.id);
  assert.equal(found.balanceCents, 27000);

  // delete account with transactions -> 409
  const deleteAccountInUse = await request('DELETE', `/api/accounts/${account.id}`);
  assert.equal(deleteAccountInUse.status, 409);

  // unknown id 404
  const notFound = await request('DELETE', '/api/transactions/999999');
  assert.equal(notFound.status, 404);

  // --- regressao: amountCents alem de MAX_SAFE_INTEGER deve ser rejeitado, nada gravado ---
  {
    const before = await request('GET', `/api/transactions?accountId=${account.id}`);
    const unsafeAmount = await request('POST', '/api/transactions', {
      date: '2026-09-01',
      description: 'qa-unsafe-int',
      kind: 'expense',
      accountId: account.id,
      amountCents: 9007199254740993,
    });
    assert.equal(unsafeAmount.status, 400);
    assert.equal(unsafeAmount.body.error, 'Valor deve ser inteiro positivo em centavos');
    const after = await request('GET', `/api/transactions?accountId=${account.id}`);
    assert.equal(after.body.total, before.body.total, 'nao deveria ter gravado a transacao invalida');
  }

  // --- regressao: openingBalanceCents alem de MAX_SAFE_INTEGER deve ser rejeitado ---
  {
    const unsafeOpening = await request('POST', '/api/accounts', {
      name: 'Conta Unsafe',
      type: 'corrente',
      openingBalanceCents: 9007199254740993,
    });
    assert.equal(unsafeOpening.status, 400);
    assert.equal(unsafeOpening.body.error, 'Valor deve ser inteiro em centavos');
  }

  // --- regressao: balanceCents de snapshot alem de MAX_SAFE_INTEGER deve ser rejeitado ---
  {
    const investAccount = await request('POST', '/api/accounts', { name: 'Invest Unsafe', type: 'investimento' });
    assert.equal(investAccount.status, 201);
    const unsafeSnapshot = await request('POST', '/api/investments/snapshots', {
      accountId: investAccount.body.id,
      date: '2026-01-05',
      balanceCents: 9007199254740993,
    });
    assert.equal(unsafeSnapshot.status, 400);
    assert.equal(unsafeSnapshot.body.error, 'Valor deve ser inteiro nao negativo em centavos');
  }

  // --- regressao: corpo JSON malformado -> 400 com mensagem pt-BR (nao a mensagem em ingles do express.json) ---
  {
    const res = await fetch(base + '/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ this is not json',
    });
    const malformed = { status: res.status, body: JSON.parse(await res.text()) };
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error, 'Corpo da requisicao nao e um JSON valido');
  }

  console.log('OK - todos os testes de smoke passaram');
} finally {
  server.close();
}
