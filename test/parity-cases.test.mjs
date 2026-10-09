import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, existsSync } from 'node:fs'

// Rendered-parity gate fixture integrity (fast checks only; the
// rendered gate itself is scripts/parity-gate.mjs, driven separately with
// CHROME=... because it renders 210 programs in headless Chromium).
const fixturePath = 'test/fixtures/parity-cases.json'
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))

test('parity case matrix covers the full 210-ID authority manifest', () => {
  assert.equal(fixture.generatedFrom.manifest, 210)
  assert.equal(fixture.generatedFrom.cases, 210)
  assert.deepEqual(fixture.generatedFrom.skipped, [])
  assert.equal(fixture.cases.length, 210)
  const ids = new Set(fixture.cases.map(c => c.id))
  assert.equal(ids.size, 210)
})

test('parity case matrix pins authority identities', () => {
  const a = fixture.authorities
  assert.equal(a.upstreamCommit, '735e1fdc4945e0df8ba47f8d657cd204e1b72923')
  assert.match(a.engineBundleSha256, /^[0-9a-f]{64}$/)
  assert.match(a.manifestSha256, /^[0-9a-f]{64}$/)
  assert.match(a.companionSha256, /^[0-9a-f]{64}$/)
  assert.ok(a.engineBundle.includes('/1.0.281/'))
})

test('every parity case defines deterministic programs for all frames', () => {
  const seen = new Set()
  for (const c of fixture.cases) {
    assert.ok(c.func, `${c.id}: invocable func missing`)
    assert.ok(!seen.has(c.func + '/' + c.namespace), `duplicate func ${c.func}`)
    seen.add(c.func + '/' + c.namespace)
    for (const key of ['caseA', 'caseB']) {
      const src = c[key].source
      assert.ok(src.startsWith(`search ${c.namespace}`), `${c.id} ${key}: search directive`)
      assert.ok(src.includes('.write(o0)'), `${c.id} ${key}: write(o0)`)
      assert.ok(src.includes('render(o0)'), `${c.id} ${key}: render(o0)`)
    }
  }
})

test('parity gate harness files exist', () => {
  for (const f of [
    'scripts/parity-gate.mjs',
    'scripts/generate-parity-cases.mjs',
    'test/parity-gate/authority.html',
    'test/parity-gate/port.html'
  ]) {
    assert.ok(existsSync(f), `${f} missing`)
  }
})
