import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'budgets.db');
if (existsSync(dbPath)) rmSync(dbPath);

process.env.MYFINANCE_DB = dbPath;
process.env.PORT = '3097';

const { app } = await import('../src/index.js');

const server = app.listen(3097);
const base = 'http://localhost:3097';

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
  const conta = (
    await request('POST', '/api/accounts', { name: 'Conta', type: 'corrente', openingBalanceCents: 0 })
  ).body;

  const categories = (await request('GET', '/api/categories')).body;
  const moradia = categories.find((c) => c.name === 'Moradia');
  const salario = categories.find((c) => c.name === 'Salário');
  assert.ok(moradia && salario, 'categorias seed esperadas ausentes');

  async function tx(date, amountCents, kind, categoryId) {
    const r = await request('POST', '/api/transactions', {
      date,
      description: 'tx',
      amountCents,
      kind,
      categoryId,
      accountId: conta.id,
    });
    assert.equal(r.status, 201, `falha criando transacao: ${JSON.stringify(r.body)}`);
    return r.body;
  }

  // --- PUT cria limite; GET sem transacoes -> spentCents 0 ---
  {
    const put = await request('PUT', `/api/budgets/${moradia.id}`, { limitCents: 50000 });
    assert.equal(put.status, 200);
    assert.deepEqual(put.body, {
      categoryId: moradia.id,
      name: 'Moradia',
      color: moradia.color,
      limitCents: 50000,
    });

    const list = await request('GET', '/api/budgets?from=2020-01-01&to=2020-01-31');
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].limitCents, 50000);
    assert.equal(list.body.items[0].spentCents, 0);
  }

  // --- gasto dentro e fora do periodo ---
  {
    await tx('2020-01-05', 10000, 'expense', moradia.id);
    await tx('2020-01-20', 8000, 'expense', moradia.id);
    await tx('2019-12-31', 99999, 'expense', moradia.id); // fora do periodo

    const list = await request('GET', '/api/budgets?from=2020-01-01&to=2020-01-31');
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].spentCents, 18000);
  }

  // --- PUT de novo na mesma categoria atualiza, nao duplica ---
  {
    const put = await request('PUT', `/api/budgets/${moradia.id}`, { limitCents: 60000 });
    assert.equal(put.status, 200);
    assert.equal(put.body.limitCents, 60000);

    const list = await request('GET', '/api/budgets?from=2020-01-01&to=2020-01-31');
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].limitCents, 60000);
  }

  // --- limitCents invalido ---
  {
    const zero = await request('PUT', `/api/budgets/${moradia.id}`, { limitCents: 0 });
    assert.equal(zero.status, 400);
    const negative = await request('PUT', `/api/budgets/${moradia.id}`, { limitCents: -100 });
    assert.equal(negative.status, 400);
  }

  // --- categoria de receita -> 400 ---
  {
    const r = await request('PUT', `/api/budgets/${salario.id}`, { limitCents: 10000 });
    assert.equal(r.status, 400);
  }

  // --- categoria inexistente -> 404 ---
  {
    const r = await request('PUT', '/api/budgets/999999', { limitCents: 10000 });
    assert.equal(r.status, 404);
  }

  // --- DELETE remove; GET volta vazio ---
  {
    const del = await request('DELETE', `/api/budgets/${moradia.id}`);
    assert.equal(del.status, 204);

    const list = await request('GET', '/api/budgets?from=2020-01-01&to=2020-01-31');
    assert.equal(list.body.items.length, 0);

    const delAgain = await request('DELETE', `/api/budgets/${moradia.id}`);
    assert.equal(delAgain.status, 404);
  }

  // --- limitCents com tipo invalido -> sempre 400 com {error}, nunca 500 ---
  {
    const invalidos = [
      ['nao inteiro', 100.5],
      ['string', '100'],
      ['null', null],
      ['booleano', true],
      ['acima do inteiro seguro', Number.MAX_SAFE_INTEGER + 2],
      ['1e21', 1e21],
    ];
    for (const [label, limitCents] of invalidos) {
      const r = await request('PUT', `/api/budgets/${moradia.id}`, { limitCents });
      assert.equal(r.status, 400, `limitCents ${label} deveria dar 400, veio ${r.status}`);
      assert.equal(typeof r.body?.error, 'string', `limitCents ${label} sem corpo {error}`);
    }

    const ausente = await request('PUT', `/api/budgets/${moradia.id}`, {});
    assert.equal(ausente.status, 400);
    assert.equal(typeof ausente.body?.error, 'string');

    const semCorpo = await request('PUT', `/api/budgets/${moradia.id}`);
    assert.equal(semCorpo.status, 400);

    // borda do inteiro seguro e aceita
    const borda = await request('PUT', `/api/budgets/${moradia.id}`, {
      limitCents: Number.MAX_SAFE_INTEGER,
    });
    assert.equal(borda.status, 200);
    assert.equal((await request('DELETE', `/api/budgets/${moradia.id}`)).status, 204);

    // nenhum PUT invalido gravou limite
    const list = await request('GET', '/api/budgets?from=2020-01-01&to=2020-01-31');
    assert.equal(list.body.items.length, 0);
  }

  // --- categoryId de rota invalido -> 400 em PUT e DELETE ---
  {
    for (const bad of ['abc', '0', '-1', '1.5']) {
      const put = await request('PUT', `/api/budgets/${bad}`, { limitCents: 100 });
      assert.equal(put.status, 400, `PUT categoryId "${bad}" deveria dar 400, veio ${put.status}`);
      assert.equal(typeof put.body?.error, 'string');

      const del = await request('DELETE', `/api/budgets/${bad}`);
      assert.equal(del.status, 400, `DELETE categoryId "${bad}" deveria dar 400, veio ${del.status}`);
      assert.equal(typeof del.body?.error, 'string');
    }
  }

  // --- GET com periodo invalido -> 400 ---
  {
    const casos = [
      ['from > to', '?from=2020-03-31&to=2020-03-01'],
      ['from mal formado', '?from=31-03-2020&to=2020-03-31'],
      ['to mal formado', '?from=2020-03-01&to=abc'],
      ['dia impossivel', '?from=2020-02-30&to=2020-03-31'],
      ['mes 13', '?from=2020-13-01&to=2020-13-31'],
      ['from vazio', '?from=&to=2020-03-31'],
    ];
    for (const [label, qs] of casos) {
      const r = await request('GET', `/api/budgets${qs}`);
      assert.equal(r.status, 400, `periodo ${label} deveria dar 400, veio ${r.status}`);
      assert.equal(typeof r.body?.error, 'string', `periodo ${label} sem corpo {error}`);
    }
  }

  // --- GET sem params -> mes corrente ---
  {
    const month = new Date().toISOString().slice(0, 7);
    const lastDay = new Date(Date.UTC(...month.split('-').map(Number), 0)).getUTCDate();
    const fimDoMes = `${month}-${String(lastDay).padStart(2, '0')}`;

    const r = await request('GET', '/api/budgets');
    assert.equal(r.status, 200);
    assert.equal(r.body.from, `${month}-01`);
    assert.equal(r.body.to, fimDoMes);

    const soFrom = await request('GET', '/api/budgets?from=2020-01-01');
    assert.equal(soFrom.status, 200);
    assert.equal(soFrom.body.from, '2020-01-01');
    assert.equal(soFrom.body.to, fimDoMes);
  }

  // --- spentCents isolado: so despesa, so a categoria, so o periodo ---
  {
    const transporte = categories.find((c) => c.name === 'Transporte');
    assert.ok(transporte, 'categoria seed Transporte ausente');

    await request('PUT', `/api/budgets/${moradia.id}`, { limitCents: 100000 });
    await tx('2020-03-10', 25000, 'expense', moradia.id); // unica que deve contar
    await tx('2020-03-11', 7000, 'expense', transporte.id); // outra categoria
    await tx('2020-03-12', 500000, 'income', salario.id); // receita no periodo
    await tx('2020-03-13', 4000, 'expense', undefined); // sem categoria
    await tx('2020-02-28', 90000, 'expense', moradia.id); // antes do periodo
    await tx('2020-04-01', 90000, 'expense', moradia.id); // depois do periodo

    const list = await request('GET', '/api/budgets?from=2020-03-01&to=2020-03-31');
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].spentCents, 25000);
    assert.equal(list.body.items[0].limitCents, 100000);
    assert.equal(list.body.items[0].name, 'Moradia');
    assert.equal(list.body.items[0].color, moradia.color);

    // BETWEEN inclusivo nas duas bordas
    const borda = await request('GET', '/api/budgets?from=2020-03-10&to=2020-03-10');
    assert.equal(borda.body.items[0].spentCents, 25000);
  }

  // --- excluir a categoria leva o limite junto (CASCADE) ---
  {
    const nova = (
      await request('POST', '/api/categories', { name: 'QA Temp', kind: 'expense', color: '#123456' })
    ).body;
    assert.equal((await request('PUT', `/api/budgets/${nova.id}`, { limitCents: 30000 })).status, 200);

    const antes = await request('GET', '/api/budgets?from=2020-03-01&to=2020-03-31');
    assert.equal(antes.body.items.length, 2);

    const del = await request('DELETE', `/api/categories/${nova.id}`);
    assert.equal(del.status, 204, `delete da categoria falhou: ${JSON.stringify(del.body)}`);

    const depois = await request('GET', '/api/budgets?from=2020-03-01&to=2020-03-31');
    assert.equal(depois.status, 200);
    assert.equal(depois.body.items.length, 1);
    assert.equal(depois.body.items[0].categoryId, moradia.id);

    // categoria com lancamentos continua bloqueada e o limite dela sobrevive
    const bloqueada = await request('DELETE', `/api/categories/${moradia.id}`);
    assert.equal(bloqueada.status, 409);
    const intacto = await request('GET', '/api/budgets?from=2020-03-01&to=2020-03-31');
    assert.equal(intacto.body.items.length, 1);
    assert.equal(intacto.body.items[0].limitCents, 100000);
  }

  console.log('OK - todos os testes de budgets passaram');
} finally {
  server.close();
}
