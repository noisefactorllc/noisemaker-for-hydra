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
  needsBrowserSuite,
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
  assert.match(r.stderr, /no test exercises the changed paths/)
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

test('needsBrowserSuite maps browser-facing paths and skips node-only paths', () => {
  assert.equal(needsBrowserSuite('src/lib/noisemaker-runtime.mjs'), true)
  assert.equal(needsBrowserSuite('public/app.js'), true)
  assert.equal(needsBrowserSuite('scripts/test.mjs'), true)
  assert.equal(needsBrowserSuite('test/context-loss-guards.html'), true)
  assert.equal(needsBrowserSuite('vite.config.js'), true)
  assert.equal(needsBrowserSuite('index.js'), true)
  assert.equal(needsBrowserSuite('test/noisemaker-context-loss.test.mjs'), false)
  assert.equal(needsBrowserSuite('scripts/parity-gate.mjs'), false)
  assert.equal(needsBrowserSuite('docs/index.md'), false)
})

test('a node-only changed path runs its unit slice without the browser suite', () => {
  // A changed unit test file selects itself; no part of the browser suite
  // reaches a node-only test change.
  const r = spawnSync('node', ['scripts/test-entrypoint.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NM_CHANGED_FILES: 'test/parity-gate-cache.test.mjs' },
    timeout: 120_000
  })
  assert.equal(r.status, 0)
  assert.doesNotMatch(r.stdout, /\[editor-test\]/, 'the browser suite must not run for node-only changes')
})

test('a browser-facing changed path with no unit match runs the browser suite only', () => {
  // Concatenation keeps this source free of the basename, which no unit
  // test imports, so the entrypoint takes the browser-suite-only path.
  const htmlPath = ['test', 'context-loss-guards.'].join('/') + 'html'
  const r = spawnSync('node', ['scripts/test-entrypoint.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NM_CHANGED_FILES: htmlPath },
    timeout: 240_000
  })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /\[editor-test\] PASS/, 'the browser suite must run for a browser-facing change')
})
