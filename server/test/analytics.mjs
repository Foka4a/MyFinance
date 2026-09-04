import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'analytics.db');
if (existsSync(dbPath)) rmSync(dbPath);

process.env.MYFINANCE_DB = dbPath;
process.env.PORT = '3098';

const { app } = await import('../src/index.js');

const server = app.listen(3098);
const base = 'http://localhost:3098';

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
  // --- setup: contas ---
  const contaA = (
    await request('POST', '/api/accounts', { name: 'Conta A', type: 'corrente', openingBalanceCents: 100000 })
  ).body;
  const contaInvest = (
    await request('POST', '/api/accounts', { name: 'Conta Invest', type: 'investimento' })
  ).body;

  const categories = (await request('GET', '/api/categories')).body;
  const salario = categories.find((c) => c.name === 'Salario');
  const moradia = categories.find((c) => c.name === 'Moradia');
  const transporte = categories.find((c) => c.name === 'Transporte');
  assert.ok(salario && moradia && transporte, 'categorias seed esperadas ausentes');

  async function tx(date, description, amountCents, kind, categoryId, accountId = contaA.id) {
    const r = await request('POST', '/api/transactions', {
      date,
      description,
      amountCents,
      kind,
      categoryId: categoryId ?? undefined,
      accountId,
    });
    assert.equal(r.status, 201, `falha criando transacao ${description}: ${JSON.stringify(r.body)}`);
    return r.body;
  }

  // previous period (dez/2019): so despesa, sem receita -> testa variacao null
  await tx('2019-12-15', 'Aluguel dez', 10000, 'expense', moradia.id);

  // current period (jan/2020)
  await tx('2020-01-10', 'Salario jan', 50000, 'income', salario.id);
  await tx('2020-01-05', 'Aluguel jan', 20000, 'expense', moradia.id);
  await tx('2020-01-06', 'Onibus jan', 1000, 'expense', transporte.id);
  await tx('2020-01-07', 'Despesa sem categoria', 5000, 'expense', null);

  // janela de fluxo de caixa (jan/2019), isolada das outras datas
  await tx('2019-01-01', 'Entrada fluxo', 1000, 'income', salario.id);
  await tx('2019-01-03', 'Saida fluxo', 400, 'expense', moradia.id);

  // --- summary: math de periodo, anterior e variacao ---
  {
    const r = await request('GET', '/api/summary?from=2020-01-01&to=2020-01-31');
    assert.equal(r.status, 200);
    assert.equal(r.body.incomeCents, 50000);
    assert.equal(r.body.expenseCents, 26000); // 20000 + 1000 + 5000
    assert.equal(r.body.netCents, 24000);
    assert.equal(r.body.previous.from, '2019-12-01');
    assert.equal(r.body.previous.to, '2019-12-31');
    assert.equal(r.body.previous.incomeCents, 0);
    assert.equal(r.body.previous.expenseCents, 10000);
    assert.equal(r.body.previous.netCents, -10000);
    assert.equal(r.body.variation.incomePct, null); // anterior 0 -> null
    assert.equal(r.body.variation.expensePct, 160); // (26000-10000)/10000*100
    assert.equal(r.body.variation.netPct, 340); // (24000 - (-10000))/10000*100
  }

  // --- summary: from > to -> 400 ---
  {
    const r = await request('GET', '/api/summary?from=2020-02-01&to=2020-01-01');
    assert.equal(r.status, 400);
  }

  // --- summary: default period = mes atual ---
  {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const lastDay = new Date(Date.UTC(...month.split('-').map(Number), 0)).getUTCDate();
    const r = await request('GET', '/api/summary');
    assert.equal(r.status, 200);
    assert.equal(r.body.from, `${month}-01`);
    assert.equal(r.body.to, `${month}-${String(lastDay).padStart(2, '0')}`);
  }

  // --- by-category: ordenacao + "Sem categoria" sempre por ultimo ---
  {
    const r = await request(
      'GET',
      '/api/summary/by-category?from=2020-01-01&to=2020-01-31&kind=expense'
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 3);
    assert.equal(r.body[0].name, 'Moradia');
    assert.equal(r.body[0].totalCents, 20000);
    assert.equal(r.body[1].name, 'Transporte');
    assert.equal(r.body[1].totalCents, 1000);
    // "Sem categoria" tem 5000 (> Transporte) mas deve ficar por ultimo mesmo assim
    assert.equal(r.body[2].categoryId, null);
    assert.equal(r.body[2].name, 'Sem categoria');
    assert.equal(r.body[2].totalCents, 5000);
  }

  // --- cashflow (day): serie continua com zeros + acumulado ---
  {
    const r = await request('GET', '/api/cashflow?from=2019-01-01&to=2019-01-03&granularity=day');
    assert.equal(r.status, 200);
    assert.equal(r.body.openingCents, 100000); // soma opening_balance de todas contas (nenhuma tx <= 2018-12-31)
    assert.equal(r.body.items.length, 3);
    assert.deepEqual(r.body.items[0], {
      period: '2019-01-01',
      incomeCents: 1000,
      expenseCents: 0,
      netCents: 1000,
      cumulativeCents: 101000,
    });
    assert.deepEqual(r.body.items[1], {
      period: '2019-01-02',
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      cumulativeCents: 101000,
    });
    assert.deepEqual(r.body.items[2], {
      period: '2019-01-03',
      incomeCents: 0,
      expenseCents: 400,
      netCents: -400,
      cumulativeCents: 100600,
    });
  }

  // --- cashflow: guard de intervalo diario > 400 dias ---
  {
    const r = await request('GET', '/api/cashflow?from=2019-01-01&to=2020-06-01&granularity=day');
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'Intervalo muito longo para granularidade diaria');
  }

  // --- investimentos: validacoes ---
  {
    const wrongAccount = await request('POST', '/api/investments/snapshots', {
      accountId: contaA.id,
      date: '2019-02-01',
      balanceCents: 1000,
    });
    assert.equal(wrongAccount.status, 400);
    assert.equal(wrongAccount.body.error, 'Snapshot so pode ser criado em conta de investimento');

    const negativeBalance = await request('POST', '/api/investments/snapshots', {
      accountId: contaInvest.id,
      date: '2019-02-01',
      balanceCents: -1,
    });
    assert.equal(negativeBalance.status, 400);
  }

  // --- investimentos: upsert nao duplica ---
  {
    const first = await request('POST', '/api/investments/snapshots', {
      accountId: contaInvest.id,
      date: '2019-02-15',
      balanceCents: 7000,
    });
    assert.equal(first.status, 201);
    const second = await request('POST', '/api/investments/snapshots', {
      accountId: contaInvest.id,
      date: '2019-02-15',
      balanceCents: 9000,
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.id, first.body.id);
    assert.equal(second.body.balanceCents, 9000);

    await request('POST', '/api/investments/snapshots', {
      accountId: contaInvest.id,
      date: '2019-02-01',
      balanceCents: 5000,
    });
    await request('POST', '/api/investments/snapshots', {
      accountId: contaInvest.id,
      date: '2019-03-10',
      balanceCents: 15000,
    });

    const list = await request('GET', `/api/investments/snapshots?accountId=${contaInvest.id}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 3, 'upsert nao deveria duplicar linha');
    assert.deepEqual(
      list.body.map((s) => s.date),
      ['2019-03-10', '2019-02-15', '2019-02-01']
    );
  }

  // --- investimentos: delete ---
  {
    const throwaway = await request('POST', '/api/investments/snapshots', {
      accountId: contaInvest.id,
      date: '2099-01-01',
      balanceCents: 99999,
    });
    const del = await request('DELETE', `/api/investments/snapshots/${throwaway.body.id}`);
    assert.equal(del.status, 204);
    const delAgain = await request('DELETE', `/api/investments/snapshots/${throwaway.body.id}`);
    assert.equal(delAgain.status, 404);
  }

  // --- networth: usa snapshot mais recente <= fim do periodo, com fallback pra ledger ---
  {
    const r = await request('GET', '/api/networth?from=2019-01-01&to=2019-03-01');
    assert.equal(r.status, 200);
    assert.deepEqual(
      r.body.map((i) => i.period),
      ['2019-01', '2019-02', '2019-03']
    );
    // jan/2019: nenhum snapshot <= fim do mes -> Conta Invest cai na formula de ledger (0)
    assert.equal(r.body[0].totalCents, 100600); // carteira 0 + contaA 100600 + invest 0
    // fev/2019: snapshot mais recente <= 2019-02-28 e o de 02-15 (9000, apos upsert)
    assert.equal(r.body[1].totalCents, 109600);
    // mar/2019: snapshot mais recente <= 2019-03-31 e o de 03-10 (15000)
    assert.equal(r.body[2].totalCents, 115600);
  }

  // --- summary: balanceCents inclui investimento, availableCents exclui ---
  {
    const r = await request('GET', '/api/summary?from=2020-01-01&to=2020-01-31');
    assert.equal(r.status, 200);
    // Conta A "hoje": 100000 + (1000+50000) - (400+20000+1000+5000+10000) = 114600
    // Conta Invest "hoje": snapshot mais recente = 2019-03-10 = 15000
    assert.equal(r.body.availableCents, 114600);
    assert.equal(r.body.balanceCents, 129600);
  }

  console.log('OK - todos os testes de analytics passaram');
} finally {
  server.close();
}
