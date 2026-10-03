import assert from 'node:assert/strict'
import test from 'node:test'
import { selectCases, summarizeReport } from '../scripts/parity-summary'

test('counts authority cases rather than their six rendered frames', () => {
  const report = {
    identityOk: true,
    pass: false,
    denominator: { cases: 3, expectedComparisons: 18, executedComparisons: 16, exact: 15, tolerance: 1, failed: 0, missing: 2 },
    caseStatus: [
      { id: 'a', frames: 6, exact: 6, tolerance: 0, failed: 0, missing: 0 },
      { id: 'b', frames: 6, exact: 5, tolerance: 1, failed: 0, missing: 0 },
      { id: 'c', frames: 6, exact: 4, tolerance: 0, failed: 0, missing: 2 }
    ]
  }
  assert.deepEqual(summarizeReport(report), {
    expected: 3, executed: 2, exact: 1, strict: 1,
    near: 0, defer: 0, skip: 0, fail: 0, missing: 1
  })
})

test('rejects an incomplete or unpinned report even when every rendered frame is exact', () => {
  const report = {
    identityOk: true,
    pass: true,
    denominator: { cases: 1, expectedComparisons: 6, executedComparisons: 6, exact: 6, tolerance: 0, failed: 0, missing: 0 },
    caseStatus: [{ id: 'a', frames: 6, exact: 6, tolerance: 0, failed: 0, missing: 0 }]
  }
  assert.deepEqual(summarizeReport(report), {
    expected: 1, executed: 1, exact: 1, strict: 0,
    near: 0, defer: 0, skip: 0, fail: 0, missing: 0
  })
  assert.equal(summarizeReport({ ...report, identityOk: false }).fail, 1)
  assert.equal(summarizeReport({ ...report, caseStatus: [] }).missing, 1)
})

test('case arguments select only named manifest cases and reject unknown IDs', () => {
  const manifest = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(selectCases(manifest, ['c', 'a']).map(c => c.id), ['c', 'a'])
  assert.deepEqual(selectCases(manifest, []).map(c => c.id), ['a', 'b', 'c'])
  assert.throws(() => selectCases(manifest, ['other']), /unknown parity case/)
  assert.throws(() => selectCases(manifest, ['a', 'a']), /duplicate parity case/)
})
