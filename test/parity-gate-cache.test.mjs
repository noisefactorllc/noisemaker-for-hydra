import test from 'node:test'
import assert from 'node:assert/strict'

import { sliceCacheReusable } from '../scripts/parity-gate-cache.mjs'

const FIXTURE_SHA = 'a'.repeat(64)

test('sliceCacheReusable rejects a cached slice produced with a different slice limit', () => {
  // The batch-1 slice cache that produced the invalid merged report: a
  // single-case report whose slice record carries limit 1 must never be
  // reused by a batched run (limit 5), even with a matching fixture sha.
  const cachedBatch1 = {
    fixture: { sha256: FIXTURE_SHA },
    slice: { start: 0, limit: 1 }
  }
  assert.equal(sliceCacheReusable(cachedBatch1, FIXTURE_SHA, 5), false)
  assert.equal(sliceCacheReusable(cachedBatch1, FIXTURE_SHA, 1), true)
})

test('sliceCacheReusable rejects a mismatched fixture revision at any slice limit', () => {
  const cached = {
    fixture: { sha256: 'b'.repeat(64) },
    slice: { start: 0, limit: 5 }
  }
  assert.equal(sliceCacheReusable(cached, FIXTURE_SHA, 5), false)
})

test('sliceCacheReusable tolerates legacy slice records without a slice object', () => {
  const legacy = { fixture: { sha256: FIXTURE_SHA } }
  assert.equal(sliceCacheReusable(legacy, FIXTURE_SHA, 5), true)
  assert.equal(sliceCacheReusable(null, FIXTURE_SHA, 5), false)
  assert.equal(sliceCacheReusable({}, FIXTURE_SHA, 5), false)
})

test('sliceCacheReusable rejects a cached slice holding different cases than the current slice', () => {
  const cached = {
    fixture: { sha256: FIXTURE_SHA },
    slice: { start: 0, limit: 5 },
    caseStatus: [{ id: 'classicNoisedeck/bitEffects' }, { id: 'classicNoisedeck/caustic' }]
  }
  // Same slice shape, but the cached report ran a different case slice: a
  // shard run sharing the evidence directory must rerun, not reuse it.
  assert.equal(sliceCacheReusable(cached, FIXTURE_SHA, 5, 'classicNoisedeck/cellNoise'), false)
  assert.equal(sliceCacheReusable(cached, FIXTURE_SHA, 5, 'classicNoisedeck/bitEffects'), true)
  // A report without case status cannot be validated and is never reused
  // when a case-id check is requested.
  assert.equal(sliceCacheReusable({ fixture: { sha256: FIXTURE_SHA } }, FIXTURE_SHA, 5, 'classicNoisedeck/bitEffects'), false)
  // Omitting the case id keeps the pre-existing behavior exactly.
  assert.equal(sliceCacheReusable(cached, FIXTURE_SHA, 5), true)
})
