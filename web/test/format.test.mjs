import assert from 'node:assert/strict'
import { formatBRL, formatDate, parseBRLToCents, formatPct, maskBRL, centsToInputStr } from '../src/lib/format.js'

// formatBRL
assert.equal(formatBRL(1234), 'R$ 12,34')
assert.equal(formatBRL(null), 'R$ 0,00')
assert.equal(formatBRL(undefined), 'R$ 0,00')
assert.equal(formatBRL(0), 'R$ 0,00')

// formatDate — must not shift day due to timezone
assert.equal(formatDate('2026-03-09'), '09/03/2026')
assert.equal(formatDate('2026-01-01'), '01/01/2026')

// parseBRLToCents
assert.equal(parseBRLToCents('1.234,56'), 123456)
assert.equal(parseBRLToCents('12,3'), 1230)
assert.equal(parseBRLToCents(''), null)
assert.equal(parseBRLToCents('R$ 12,34'), 1234)
assert.equal(parseBRLToCents('R$ 1.000,00'), 100000)

// maskBRL: digitar so numeros ja sai formatado, e volta inteiro pelo parse
assert.equal(maskBRL('150'), '1,50')
assert.equal(maskBRL('15000'), '150,00')
assert.equal(maskBRL('R$ 1.234,56'), '1.234,56')
assert.equal(maskBRL(''), '')
assert.equal(maskBRL('abc'), '')
assert.equal(parseBRLToCents(maskBRL('1234567')), 1234567)
assert.equal(centsToInputStr(123456), '1.234,56')
assert.equal(centsToInputStr(null), '')

// formatPct
assert.equal(formatPct(12.34), '+12,3%')
assert.equal(formatPct(-5), '-5,0%')
assert.equal(formatPct(null), '—')

console.log('format.test.mjs: all assertions passed')
