#!/usr/bin/env node
/**
 * Test entrypoint implementing the changed-paths rule.
 *
 * When NM_CHANGED_FILES is set (newline-separated repository paths), the
 * entrypoint runs only the tests that exercise those paths:
 *   - a changed test file runs itself,
 *   - a changed src/ or scripts/ module runs every unit test whose source
 *     imports that file's basename,
 * and the browser suite then exercises the runtime end to end. Selection
 * fails closed: when no unit test matches a changed path the entrypoint
 * exits nonzero instead of silently running everything or nothing. Every
 * invocation stays inside the 300s bound; when the changed-path tests would
 * not, this entrypoint splits them itself: with NM_SHARD_INDEX (from 0) and
 * NM_SHARD_COUNT set, it runs only the corresponding slice of the selected
 * unit tests (round-robin over the sorted list), so the shards together run
 * every such test. An empty shard slice fails closed too: it must never fall
 * back to full discovery. When those variables are unset nothing is split.
 *
 * With NM_CHANGED_FILES unset the whole suite runs exactly as published:
 *   node --test test/*.test.mjs && node scripts/test.mjs
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const ROOT = new URL('..', import.meta.url).pathname

/**
 * Selects the unit tests that exercise the changed paths: a changed test
 * file selects itself; any other changed path selects every unit test whose
 * source mentions the path's basename. The result is sorted and deduped.
 * @param {string[]} changedPaths - repository paths, one per entry.
 * @param {string[]} unitFiles - test file names under test/.
 * @param {(path: string) => string} readTestSource - reads a test file.
 * @returns {string[]} selected test paths ('test/<file>'), sorted.
 */
export function selectChangedTests (changedPaths, unitFiles, readTestSource = (p) => readFileSync(p, 'utf8')) {
  const selected = new Set()
  for (const changedPath of changedPaths) {
    if (changedPath.startsWith('test/') && changedPath.endsWith('.test.mjs')) {
      selected.add(changedPath)
      continue
    }
    const base = changedPath.split('/').pop()
    for (const unitFile of unitFiles) {
      try {
        if (readTestSource(join(ROOT, 'test', unitFile)).includes(base)) selected.add(`test/${unitFile}`)
      } catch (_) { /* unreadable test file selects nothing */ }
    }
  }
  return [...selected].sort()
}

/**
 * Whether the shard variables select exactly one shard of several.
 * @param {number|null} shardIndex - NM_SHARD_INDEX, from 0.
 * @param {number|null} shardCount - NM_SHARD_COUNT, above 1.
 * @returns {boolean}
 */
export function shardIsValid (shardIndex, shardCount) {
  return shardIndex !== null && Number.isInteger(shardIndex) && shardIndex >= 0 &&
    shardCount !== null && Number.isInteger(shardCount) && shardCount > 1 && shardIndex < shardCount
}

/**
 * Picks one round-robin slice of the sorted selected-test list, so the
 * shards together run every selected test exactly once. The slice may be
 * empty when the shard count exceeds the list length; callers must fail
 * closed on an empty slice instead of running full discovery.
 * @param {string[]} selectedTests - sorted selected test paths.
 * @param {number} shardIndex - shard to run, from 0.
 * @param {number} shardCount - total shard count, above 1.
 * @returns {string[]} this shard's test paths, in list order.
 */
export function shardTestList (selectedTests, shardIndex, shardCount) {
  return selectedTests.filter((_, index) => index % shardCount === shardIndex)
}

function readShardNumber (name) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return null
  const value = Number(raw)
  return Number.isNaN(value) ? null : value
}

function runUnit (files) {
  if (!files.length) {
    console.error('test-entrypoint: no unit tests to run; refusing to start full discovery')
    process.exit(1)
  }
  const r = spawnSync('node', ['--test', ...files], { stdio: 'inherit', cwd: ROOT })
  if (r.status !== 0) process.exit(r.status || 1)
}

function runBrowserSuite () {
  const r = spawnSync('node', ['scripts/test.mjs'], { stdio: 'inherit', cwd: ROOT })
  process.exit(r.status || 0)
}

function main () {
  const changed = (process.env.NM_CHANGED_FILES || '').split('\n').map(s => s.trim()).filter(Boolean)
  const unitFiles = readdirSync(join(ROOT, 'test')).filter(f => f.endsWith('.test.mjs')).sort()

  if (!changed.length) {
    runUnit(unitFiles.map(f => `test/${f}`))
    runBrowserSuite()
  }

  const selected = selectChangedTests(changed, unitFiles)
  if (!selected.length) {
    console.error(`test-entrypoint: no unit test exercises the changed paths: ${changed.join(', ')}`)
    process.exit(1)
  }

  const shardIndex = readShardNumber('NM_SHARD_INDEX')
  const shardCount = readShardNumber('NM_SHARD_COUNT')
  const shardList = shardIsValid(shardIndex, shardCount)
    ? shardTestList(selected, shardIndex, shardCount)
    : selected
  if (!shardList.length) {
    console.error(`test-entrypoint: shard ${shardIndex} of ${shardCount} selects no test of ${selected.length}`)
    process.exit(1)
  }

  runUnit(shardList)
  runBrowserSuite()
}

const invokedDirectly = process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) main()
