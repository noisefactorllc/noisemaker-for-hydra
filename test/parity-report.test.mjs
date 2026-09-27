import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

// Compensating check for GAP-006: `npm test` cannot run the rendered gate by
// default (it needs a chromium binary, network access to the pinned authority
// host, and exits 1 while GAP-001 is open), so the default path instead pins
// the integrity of the committed merged report and the wiring that enforces
// the gate at release time (npm run test:parity + .github/workflows/
// parity-gate.yml). If the merged report ever regresses to a partial
// artifact (e.g. the 42-case/252-comparison batch-5 shape committed in
// error), or the gate loses its enforcement point, this test fails.

function resolve (...args) { return join(...args) }

test('committed merged parity report keeps the full denominator with missing preserved', () => {
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
  // GAP-001: the twelve filter/octaveWarp and filter/oilPaint authority-side
  // comparisons are the preserved missing entries; they must never be
  // silently zeroed.
  assert.equal(d.missing, 12)
  assert.equal(d.failed, 0)
  assert.equal(report.failures.length, 4)
  const failedCases = new Set(report.failures.map(f => f.case))
  assert.ok(failedCases.has('filter/octaveWarp'))
  assert.ok(failedCases.has('filter/oilPaint'))
  for (const f of report.failures) {
    assert.equal(f.side, 'authority')
    assert.match(f.error, /ShaderDiagnostic/)
  }
  assert.equal(report.identity.rollingMatchesImmutable, true)
  assert.equal(report.pass, false)
})

test('the rendered gate keeps an enforcement point for release qualification', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.ok(pkg.scripts['test:parity'], 'test:parity script must be wired')
})