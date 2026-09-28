import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

// Compensating check for GAP-006: `npm test` cannot run the rendered gate by
// default (it needs a chromium binary and network access to the pinned
// authority host), so the default path instead pins the integrity of the
// committed merged report and the wiring that enforces the gate at release
// time (npm run test:parity + .github/workflows/parity-gate.yml). GAP-001
// closed 2026-09-28 on the harness GPU host (native-GL authority leg): all
// 1260 comparisons executed and exact, so the committed report is the passing
// full-denominator shape; if it ever regresses to a partial artifact (missing
// frames, a tolerance/failed leg, or a lost backend identity), this test
// fails.

function resolve (...args) { return join(...args) }

test('committed merged parity report keeps the full passing denominator', () => {
  const report = JSON.parse(
    readFileSync(join(ROOT, 'parity-evidence/parity-gate-report.json'), 'utf8')
  )
  const d = report.denominator
  assert.equal(report.batch.size, 5)
  assert.equal(report.batch.slices, 42)
  assert.equal(d.cases, 210)
  assert.equal(d.expectedComparisons, 1260)
  assert.equal(report.caseStatus.length, 210)
  assert.equal(report.perFrame.length, 1260)
  // Merged arithmetic must account for every comparison; nothing dropped.
  assert.equal(d.executedComparisons + d.missing, d.expectedComparisons)
  assert.equal(d.exact + d.tolerance + d.failed + d.missing, d.expectedComparisons)
  // GAP-001 closed: every inventoried comparison executed and matched exactly.
  assert.equal(d.executedComparisons, 1260)
  assert.equal(d.exact, 1260)
  assert.equal(d.tolerance, 0)
  assert.equal(d.failed, 0)
  assert.equal(d.missing, 0)
  assert.equal(report.failures.length, 0)
  assert.equal(report.pass, true)
  // The qualifying run executed the authority leg on a native-GL host, where
  // the pinned engine compiles the programs SwiftShader could not finish.
  assert.equal(report.env.glBackend, 'native')
  // Pinned-authority identities verified in-run; the rolling /1 core drift is
  // informational only (recorded, not gating).
  assert.equal(report.identity.engineBundle.matchesPinned, true)
  assert.equal(report.identity.manifest.matchesPinned, true)
  assert.equal(report.identity.companion.matchesPinned, true)
  assert.equal(report.identity.rollingMatchesImmutable, false)
})

test('the rendered gate keeps an enforcement point for release qualification', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.ok(pkg.scripts['test:parity'], 'test:parity script must be wired')
})
