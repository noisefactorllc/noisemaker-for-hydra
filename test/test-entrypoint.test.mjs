/**
 * Bounded tests for the changed-paths test entrypoint: selection, sharding
 * and fail-closed behavior. The fail-closed cases spawn the entrypoint
 * directly; they exit before any test runs, so they stay inside the time
 * bound.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  ROOT,
  selectChangedTests,
  shardIsValid,
  shardTestList
} from '../scripts/test-entrypoint.mjs'

const UNIT_FILES = ['a.test.mjs', 'b.test.mjs', 'entrypoint.test.mjs']
const SOURCES = {
  'a.test.mjs': "import { effect } from '../src/lib/a-effect.mjs'",
  'b.test.mjs': "import { shared } from '../src/lib/shared.mjs'\nimport { effect } from '../src/lib/a-effect.mjs'",
  'entrypoint.test.mjs': "import { shardTestList } from '../scripts/test-entrypoint.mjs'"
}
const readFake = (path) => SOURCES[path.split('/').pop()]

test('a changed test file selects itself', () => {
  assert.deepEqual(
    selectChangedTests(['test/b.test.mjs'], UNIT_FILES, readFake),
    ['test/b.test.mjs']
  )
})

test('a changed src module selects every test importing its basename', () => {
  assert.deepEqual(
    selectChangedTests(['src/lib/a-effect.mjs'], UNIT_FILES, readFake),
    ['test/a.test.mjs', 'test/b.test.mjs']
  )
})

test('a changed scripts module selects the test mentioning it', () => {
  assert.deepEqual(
    selectChangedTests(['scripts/test-entrypoint.mjs'], UNIT_FILES, readFake),
    ['test/entrypoint.test.mjs']
  )
})

test('a changed path no test mentions selects nothing', () => {
  assert.deepEqual(
    selectChangedTests(['docs/unrelated.md'], UNIT_FILES, readFake),
    []
  )
})

test('selection against the real tree covers the entrypoint itself', () => {
  const selected = selectChangedTests(
    ['scripts/test-entrypoint.mjs', 'src/lib/noisemaker-context-loss.mjs'],
    ['test-entrypoint.test.mjs', 'noisemaker-context-loss.test.mjs', 'parity-cases.test.mjs']
  )
  assert.ok(selected.includes('test/test-entrypoint.test.mjs'),
    'a changed entrypoint must select its own bounded test')
  assert.ok(selected.includes('test/noisemaker-context-loss.test.mjs'),
    'a changed guard module must select its guard test')
})

test('shardIsValid accepts exactly one shard of several and rejects degenerate counts', () => {
  assert.equal(shardIsValid(0, 2), true)
  assert.equal(shardIsValid(1, 2), true)
  assert.equal(shardIsValid(2, 2), false, 'the index must stay below the count')
  assert.equal(shardIsValid(0, 1), false, 'a single shard is not a split')
  assert.equal(shardIsValid(null, 2), false)
  assert.equal(shardIsValid(0, null), false)
  assert.equal(shardIsValid(-1, 2), false)
  assert.equal(shardIsValid(0.5, 2), false)
})

test('shardTestList splits round-robin so the shards cover the list exactly once', () => {
  const list = ['t1', 't2', 't3', 't4', 't5']
  const shards = [0, 1, 2].map(index => shardTestList(list, index, 3))
  assert.deepEqual(shards, [['t1', 't4'], ['t2', 't5'], ['t3']])
  const union = shards.flat().sort()
  assert.deepEqual(union, list, 'the shards together run every selected test')
  assert.equal(new Set(union).size, union.length, 'no test runs in two shards')
})

test('an empty shard slice stays empty instead of falling back to the list', () => {
  assert.deepEqual(shardTestList(['t1'], 1, 2), [])
})

test('the entrypoint fails closed when no test matches a changed path', () => {
  // Built by concatenation so this test's own source never contains the
  // basename: the entrypoint would otherwise select this file and re-spawn
  // itself endlessly.
  const noMatchPath = ['docs', 'no-test-covers'].join('/') + '-this.md'
  const r = spawnSync('node', ['scripts/test-entrypoint.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NM_CHANGED_FILES: noMatchPath },
    timeout: 60_000
  })
  assert.equal(r.status, 1, 'no-match selection must exit nonzero')
  assert.match(r.stderr, /no unit test exercises the changed paths/)
})

test('the entrypoint fails closed when a shard slice is empty', () => {
  const r = spawnSync('node', ['scripts/test-entrypoint.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NM_CHANGED_FILES: 'test/test-entrypoint.test.mjs', NM_SHARD_INDEX: '1', NM_SHARD_COUNT: '4' },
    timeout: 60_000
  })
  assert.equal(r.status, 1, 'an empty shard must exit nonzero instead of full discovery')
  assert.match(r.stderr, /selects no test/)
})
