#!/usr/bin/env node
/**
 * Test entrypoint implementing the changed-paths rule.
 *
 * When NM_CHANGED_FILES is set (newline-separated repository paths), the
 * entrypoint runs only the tests that exercise those paths:
 *   - a changed test file runs itself,
 *   - a changed src/ or scripts/ module runs every unit test whose source
 *     imports that file's basename,
 * and the browser suite then exercises the runtime end to end. Every
 * invocation stays inside the 300s bound; when the changed-path tests would
 * not, this entrypoint splits them itself: with NM_SHARD_INDEX (from 0) and
 * NM_SHARD_COUNT set, it runs only the corresponding slice of the selected
 * unit tests (round-robin over the sorted list), so the shards together run
 * every such test. When those variables are unset nothing is split.
 *
 * With NM_CHANGED_FILES unset the whole suite runs exactly as published:
 *   node --test test/*.test.mjs && node scripts/test.mjs
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const changed = (process.env.NM_CHANGED_FILES || '').split('\n').map(s => s.trim()).filter(Boolean)
const unitFiles = readdirSync(join(ROOT, 'test')).filter(f => f.endsWith('.test.mjs')).sort()

function runUnit (files) {
  const r = spawnSync('node', ['--test', ...files], { stdio: 'inherit', cwd: ROOT })
  if (r.status !== 0) process.exit(r.status || 1)
}

function runBrowserSuite () {
  const r = spawnSync('node', ['scripts/test.mjs'], { stdio: 'inherit', cwd: ROOT })
  process.exit(r.status || 0)
}

if (!changed.length) {
  runUnit(unitFiles.map(f => `test/${f}`))
  runBrowserSuite()
}

const selected = new Set()
for (const path of changed) {
  if (path.startsWith('test/') && path.endsWith('.test.mjs')) {
    selected.add(path)
    continue
  }
  const base = path.split('/').pop()
  for (const f of unitFiles) {
    try {
      if (readFileSync(join(ROOT, 'test', f), 'utf8').includes(base)) selected.add(`test/${f}`)
    } catch (_) {}
  }
}
const selectedList = [...selected].sort()

// Changed-path sharding: NM_SHARD_INDEX/NM_SHARD_COUNT select one round-robin
// slice of the sorted unit-test list, so the shards together run every
// selected test exactly once. Unset or degenerate counts run the full list.
const shardIndex = process.env.NM_SHARD_INDEX !== undefined && process.env.NM_SHARD_INDEX !== ''
  ? Number(process.env.NM_SHARD_INDEX)
  : null
const shardCount = process.env.NM_SHARD_COUNT !== undefined && process.env.NM_SHARD_COUNT !== ''
  ? Number(process.env.NM_SHARD_COUNT)
  : null
const shardValid = shardIndex !== null && Number.isInteger(shardIndex) && shardIndex >= 0 &&
  shardCount !== null && Number.isInteger(shardCount) && shardCount > 1 && shardIndex < shardCount
const shardList = shardValid ? selectedList.filter((_, i) => i % shardCount === shardIndex) : selectedList

runUnit(shardList)
runBrowserSuite()
