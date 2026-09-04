import assert from 'node:assert/strict'
import { buildTransactionsQuery, monthRange, centsToInputStr } from '../src/lib/txQuery.js'

// buildTransactionsQuery
assert.equal(
  buildTransactionsQuery({ from: '2026-09-01', to: '2026-09-30' }, { column: 'date', order: 'desc' }, 1, 20),
  'from=2026-09-01&to=2026-09-30&sort=date&order=desc&page=1&pageSize=20'
)
assert.equal(
  buildTransactionsQuery(
    { from: '', to: '', kind: 'income', categoryId: 3, accountId: '' },
    { column: 'amountCents', order: 'asc' },
    2,
    10
  ),
  'kind=income&categoryId=3&sort=amountCents&order=asc&page=2&pageSize=10'
)

// monthRange — must not shift due to timezone
const { from, to } = monthRange(new Date(2026, 8, 4)) // 4 Sep 2026
assert.equal(from, '2026-09-01')
assert.equal(to, '2026-09-30')

// centsToInputStr
assert.equal(centsToInputStr(123456), '1234,56')
assert.equal(centsToInputStr(0), '0,00')
assert.equal(centsToInputStr(null), '')

console.log('txQuery.test.mjs: all assertions passed')
