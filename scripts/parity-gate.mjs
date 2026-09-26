#!/usr/bin/env node
/**
 * GAP-001 complete rendered parity gate.
 *
 * Serves the repository with a zero-extra-thread static file server, then
 * drives headless Chromium over the DevTools protocol through
 * test/fixtures/parity-cases.json (210 pinned authority effect IDs):
 *   - the authority side: test/parity-gate/authority.html renders each case
 *     with the raw published Noisemaker engine (pinned immutable 1.0.182 CDN
 *     bundle, default CanvasRenderer wiring), and
 *   - the port side: test/parity-gate/port.html renders the same programs
 *     through the tracked companion bundle plus the fork's
 *     src/lib/noisemaker-runtime.mjs wiring.
 * The two sides run SEQUENTIALLY in one live WebGL context per chromium:
 * with authority and port contexts alive simultaneously, SwiftShader resource
 * contention made heavy effects' (filter/octaveWarp, filter/oilPaint) compiles
 * fail with ERR_SHADER_COMPILE on the authority side. The node driver compares
 * the two frame sets itself: exact equality first, the legacy +-2 numerical
 * contract reported separately. Failures and missing cases are preserved in
 * the report and make the gate exit nonzero.
 *
 * Cases run in GATE_BATCH (default 5; a 30-case slice crashed the SwiftShader
 * GPU process in this environment) sized slices, one fresh headless Chromium
 * process per slice: SwiftShader GPU memory is freed between slices.
 *
 * Usage: CHROME=/usr/bin/chromium node scripts/parity-gate.mjs [outdir]
 * Writes parity-gate-report.json into outdir (default: parity-evidence).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createHash } from 'node:crypto'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = Number(process.env.PORT || 5199)
const OUTDIR = resolve(process.argv[2] || join(ROOT, 'parity-evidence'))
const BATCH = Number(process.env.GATE_BATCH || 5)
const TOTAL = Number(process.env.GATE_TOTAL || 210)
const fixtureSha256 = createHash('sha256')
  .update(readFileSync(join(ROOT, 'test/fixtures/parity-cases.json')))
  .digest('hex')
const fixture = JSON.parse(readFileSync(join(ROOT, 'test/fixtures/parity-cases.json'), 'utf8'))
const pinned = fixture.authorities
const S32 = { width: 32, height: 24 }
const S18 = { width: 24, height: 18 }

// Zero-extra-thread static file server (replaces the vite dev server:
// chromium's SwiftShader thread spikes plus vite's threads exceeded the
// container's 256-pid cgroup cap and starved the harness).
import { createServer } from 'node:http'
import { extname } from 'node:path'
const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }
let serverLog = ''
const server = createServer((req, res) => {
  try {
    const path = decodeURIComponent((req.url || '/').split('?')[0])
    const rel = path === '/' ? 'index.html' : path.replace(/^\//, '')
    // vite-equivalent root: repository root first, then the public/ dir
    let file = join(ROOT, rel)
    try {
      readFileSync(file)
    } catch (_) {
      file = join(ROOT, 'public', rel)
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')
    }
  }
})
server.on('error', err => { serverLog += String(err) })

function log (msg) { process.stderr.write(`[parity-gate] ${msg}\n`) }

// Module-scoped so runSlice (defined before the main try) can see them.
let identity = null
let identityOk = false

async function sha256OfUrl (url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex')
}

// Authority identity is checked by the driver itself, not the page: pinned
// immutable bundle + manifest from the CDN, companion from the tracked file.
async function checkIdentity () {
  const identity = {}
  for (const [name, url, expected, local] of [
    ['engineBundle', pinned.engineBundle, pinned.engineBundleSha256],
    ['manifest', pinned.manifest, pinned.manifestSha256],
    ['rollingCore', pinned.rollingCore, pinned.engineBundleSha256],
    ['companion', null, pinned.companionSha256, join(ROOT, 'public', pinned.companion)]
  ]) {
    try {
      const sha = local
        ? createHash('sha256').update(readFileSync(local)).digest('hex')
        : await sha256OfUrl(url)
      identity[name] = { url: url || pinned.companion, sha256: sha, matchesPinned: sha === expected }
    } catch (err) {
      identity[name] = { url: url || pinned.companion, error: String(err && err.message || err) }
    }
  }
  identity.rollingMatchesImmutable = Boolean(
    identity.rollingCore && identity.engineBundle &&
    identity.rollingCore.sha256 === identity.engineBundle.sha256
  )
  const identityOk = ['engineBundle', 'manifest', 'companion'].every(n => identity[n] && identity[n].matchesPinned)
  return { identity, identityOk }
}

// Per-frame comparison in the driver: exact equality first, the legacy +-2
// numerical contract reported separately.
function compare (a, p) {
  if (a.width !== p.width || a.height !== p.height) {
    return { status: 'FAIL', reason: `size mismatch authority ${a.width}x${a.height} vs port ${p.width}x${p.height}` }
  }
  const ad = a.data; const pd = p.data
  if (ad.length !== pd.length) {
    return { status: 'FAIL', reason: `channel count mismatch ${ad.length} vs ${pd.length}` }
  }
  let maxDiff = 0; let unequal = 0
  for (let i = 0; i < ad.length; i++) {
    const d = Math.abs(ad[i] - pd[i])
    if (d !== 0) { unequal++; if (d > maxDiff) maxDiff = d }
  }
  const exact = unequal === 0
  return {
    status: exact ? 'EXACT' : (maxDiff <= 2 ? 'TOLERANCE' : 'FAIL'),
    exact, maxDiff, unequalChannels: unequal,
    channels: ad.length
  }
}

// Launch chromium with a fresh per-slice profile, connect over CDP, and hand
// the caller { navigate, waitReady, evaluate } against a single target.
// Console lines and exceptions are echoed into the gate log. Always kills the
// whole chromium process group on exit.
async function withCdp (chrome, args, log, fn) {
  const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'], detached: true })
  const killTree = () => { try { process.kill(-child.pid, 'SIGKILL') } catch (_) { try { child.kill('SIGKILL') } catch (_) {} } }
  let errLog = ''
  child.stderr.on('data', d => { errLog += String(d) })
  try {
    let wsUrl = null
    const bootDeadline = Date.now() + 60000
    while (Date.now() < bootDeadline && !wsUrl) {
      const m = errLog.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) wsUrl = m[1]
      else await new Promise(r => setTimeout(r, 250))
    }
    if (!wsUrl) throw new Error(`DevTools endpoint never appeared: ${errLog.slice(-500)}`)
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('devtools websocket failed')) })
    let mid = 0
    const pending = new Map()
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data)
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id)
        m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
        return
      }
      if (m.method === 'Runtime.consoleAPICalled') {
        const line = (m.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ')
        log(`console.${m.params.type}: ${line.slice(0, 300)}`)
      } else if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails
        log(`exception: ${d.text} ${(d.exception && d.exception.description) || ''}`.slice(0, 400))
      }
    }
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
      const id = ++mid
      pending.set(id, { res, rej })
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Runtime.enable', {}, sessionId)
    await send('Page.enable', {}, sessionId)
    const navigate = (url) => send('Page.navigate', { url }, sessionId)
    const evaluate = async (expression, awaitPromise = false) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, sessionId)
      if (r.exceptionDetails) {
        const d = r.exceptionDetails
        throw new Error(`evaluate failed: ${d.text} ${(d.exception && d.exception.description) || ''}`.slice(0, 500))
      }
      return r.result && r.result.value
    }
    const waitReady = async (prefix, timeoutMs) => {
      const end = Date.now() + timeoutMs
      while (Date.now() < end) {
        const text = await evaluate('document.getElementById("out") ? document.getElementById("out").innerText : ""')
        if (String(text || '').startsWith(prefix)) return String(text)
        await new Promise(r => setTimeout(r, 2000))
      }
      throw new Error(`page did not report ${prefix} within ${timeoutMs}ms`)
    }
    return await fn({ navigate, evaluate, waitReady, browser: null })
  } finally {
    killTree()
  }
}

// Run one slice: fresh chromium, authority pass, port pass, driver-side
// comparison. Returns the slice report (pass=false when any group is missing
// or failed — the caller retries and keeps the best result).
async function runSlice (sliceStart, limit, attempt, log) {
  const sliceCases = fixture.cases.slice(sliceStart, sliceStart + limit)
  const base = `http://127.0.0.1:${PORT}/test/parity-gate`
  const cdpPort = PORT + 1000 + (sliceStart % 100)
  const chromeArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-logging=stderr',
    '--v=0',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${join(OUTDIR, `chrome-profile-${sliceStart}`)}`,
    // Shared persistent HTTP cache across slice launches: the authority page
    // pulls the pinned CDN bundle plus 210 effect bundles on every fresh
    // chromium; without a warm cache each launch re-downloads them.
    `--disk-cache-dir=${join(OUTDIR, 'chrome-http-cache')}`,
    '--disk-cache-size=524288000',
    'about:blank'
  ]
  log(`slice ${sliceStart}..${sliceStart + limit - 1}: launching headless Chromium (attempt ${attempt})`)
  log(`command: ${CHROME} ${chromeArgs.join(' ')}`)
  // A profile left by a previous container run (or crashed slice) holds a
  // stale SingletonLock that blocks the new chromium; clear it first.
  try {
    rmSync(join(OUTDIR, `chrome-profile-${sliceStart}`), { recursive: true, force: true, maxRetries: 3, retryDelay: 300 })
  } catch (_) {}
  return withCdp(CHROME, chromeArgs, log, async ({ navigate, evaluate, waitReady }) => {
    // AUTHORITY pass: one live context.
    log(`navigate: ${base}/authority.html`)
    await navigate(`${base}/authority.html`)
    await waitReady('authority-ready', 180000)
    const gl = await evaluate(`(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); return g ? g.getParameter(g.VERSION) + ' / ' + g.getParameter(g.RENDERER) : 'no-webgl2' })()`)
    log(`authority webgl: ${gl}`)
    // A hung evaluate must not wedge the slice forever; watchdog each page
    // call and let the retry loop re-run the slice.
    const evWatch = (expr, ms = Number(process.env.GATE_EVAL_TIMEOUT_MS || 240000)) =>
      Promise.race([
        evaluate(expr, true),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`evaluate timed out after ${ms}ms`)), ms))
      ])
    const authorityFrames = new Map()
    const authorityErrors = new Map()
    for (const c of sliceCases) {
      const groups = [
        { label: 'AB', programs: [
          { key: 'A', source: c.caseA.source, size: S32, times: [0, 0.37, 0.74] },
          { key: 'B', source: c.caseB.source, size: S32, times: [0, 0.37] }
        ] },
        { label: 'C', programs: [{ key: 'C', source: c.caseA.source, size: S18, times: [0] }] }
      ]
      for (const g of groups) {
        const expr = `window.__gateRun(${JSON.stringify(g.programs)})`
        try {
          const frames = await evWatch(expr)
          authorityFrames.set(`${c.id}|${g.label}`, frames)
        } catch (err) {
          // Capture the raw ANGLE/SwiftShader compile logs recorded by the
          // page's compile diagnostics.
          let shaderLogs = ''
          try { shaderLogs = await evaluate('JSON.stringify((window.__shaderLogs || []).slice(-4))') } catch (_) {}
          authorityErrors.set(`${c.id}|${g.label}`, `${String(err && err.message || err)} shaderLogs=${shaderLogs}`)
        }
      }
      log(`authority done so far: ${sliceCases.indexOf(c) + 1}/${sliceCases.length} ${c.id}`)
    }
    // PORT pass: the authority context is gone; one live context again.
    log(`navigate: ${base}/port.html`)
    await navigate(`${base}/port.html`)
    await waitReady('port-ready', 180000)
    const portFrames = new Map()
    const portErrors = new Map()
    for (const c of sliceCases) {
      const groups = [
        { label: 'AB', programs: [
          { key: 'A', source: c.caseA.source, size: S32, times: [0, 0.37, 0.74] },
          { key: 'B', source: c.caseB.source, size: S32, times: [0, 0.37] }
        ] },
        { label: 'C', programs: [{ key: 'C', source: c.caseA.source, size: S18, times: [0] }] }
      ]
      for (const g of groups) {
        const expr = `window.__gateRun(${JSON.stringify(g.programs)})`
        try {
          const frames = await evWatch(expr)
          portFrames.set(`${c.id}|${g.label}`, frames)
        } catch (err) {
          portErrors.set(`${c.id}|${g.label}`, String(err && err.message || err))
        }
      }
      log(`port done so far: ${sliceCases.indexOf(c) + 1}/${sliceCases.length} ${c.id}`)
    }
    // Compare in the driver, per case, per frame.
    const perFrame = []
    const caseStatus = []
    const failures = []
    let executedComparisons = 0
    let exactCount = 0; let toleranceCount = 0; let failCount = 0; let missingCount = 0
    for (const c of sliceCases) {
      for (const label of ['AB', 'C']) {
        const key = `${c.id}|${label}`
        const aFrames = authorityFrames.get(key)
        const pFrames = portFrames.get(key)
        const n = label === 'AB' ? 5 : 1
        if (aFrames && pFrames) {
          if (!Array.isArray(aFrames) || !Array.isArray(pFrames) || aFrames.length !== n || pFrames.length !== n) {
            const reason = `frame count mismatch ${label}: authority ${Array.isArray(aFrames) ? aFrames.length : 'non-array'} port ${Array.isArray(pFrames) ? pFrames.length : 'non-array'} expected ${n}`
            for (let i = 0; i < n; i++) {
              perFrame.push({ case: c.id, group: label, status: 'MISSING', reason })
              missingCount++
            }
            failures.push({ case: c.id, group: label, error: reason })
            continue
          }
          for (let i = 0; i < n; i++) {
            const a = aFrames[i]; const p = pFrames[i]
            const cmp = compare(a, p)
            perFrame.push({ case: c.id, group: label, key: a.key, t: a.t, status: cmp.status, maxDiff: cmp.maxDiff, unequalChannels: cmp.unequalChannels, channels: cmp.channels })
            executedComparisons++
            if (cmp.status === 'EXACT') exactCount++
            else if (cmp.status === 'TOLERANCE') toleranceCount++
            else { failCount++; failures.push({ case: c.id, group: label, key: a.key, t: a.t, ...cmp }) }
          }
        } else {
          const side = !aFrames ? 'authority' : 'port'
          const err = !aFrames ? authorityErrors.get(key) : portErrors.get(key)
          for (let i = 0; i < n; i++) {
            perFrame.push({ case: c.id, group: label, status: 'MISSING', reason: `${side}: ${err}` })
            missingCount++
          }
          failures.push({ case: c.id, group: label, side, error: err })
        }
      }
      const frameStatuses = perFrame.filter(f => f.case === c.id).map(f => f.status)
      caseStatus.push({
        id: c.id,
        frames: frameStatuses.length,
        exact: frameStatuses.filter(s => s === 'EXACT').length,
        tolerance: frameStatuses.filter(s => s === 'TOLERANCE').length,
        failed: frameStatuses.filter(s => s === 'FAIL').length,
        missing: frameStatuses.filter(s => s === 'MISSING').length,
        status: frameStatuses.length === 6 && frameStatuses.every(s => s === 'EXACT')
          ? 'EXACT' : (frameStatuses.some(s => s === 'FAIL') ? 'FAIL' : (frameStatuses.length < 6 ? 'MISSING' : 'TOLERANCE'))
      })
      log(`compared so far: ${sliceCases.indexOf(c) + 1}/${sliceCases.length} ${c.id} ${caseStatus[caseStatus.length - 1].status}`)
    }
    const expectedComparisons = sliceCases.length * 6
    return {
      gate: 'gap-001-rendered-parity',
      identityOk,
      slice: { start: sliceStart, limit },
      pinned,
      identity,
      env: { node: process.version, platform: `${process.platform}-${process.arch}`, webgl: gl },
      fixture: { cases: fixture.cases.length, upstreamCommit: fixture.upstreamCommit, generator: fixture.generator, sha256: fixtureSha256 },
      denominator: {
        cases: sliceCases.length,
        expectedComparisons,
        executedComparisons,
        exact: exactCount,
        tolerance: toleranceCount,
        failed: failCount,
        missing: missingCount
      },
      pass: identityOk && executedComparisons === expectedComparisons && failCount === 0 && missingCount === 0,
      failures,
      caseStatus,
      perFrame
    }
  })
}

server.listen(PORT, '127.0.0.1')

let exitCode = 0
try {
  const started = Date.now()
  while (Date.now() - started < 30000) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/test/parity-gate/port.html`)
      if (res.ok) break
    } catch (_) {}
    await new Promise(r => setTimeout(r, 250))
  }
  log('static gate server up')

  const checked = await checkIdentity()
  identity = checked.identity
  identityOk = checked.identityOk
  log(`identity: bundle=${identity.engineBundle.matchesPinned} manifest=${identity.manifest.matchesPinned} companion=${identity.companion.matchesPinned} rollingMatchesImmutable=${identity.rollingMatchesImmutable}`)

  const reports = []
  mkdirSync(OUTDIR, { recursive: true })
  for (let sliceStart = 0; sliceStart < TOTAL; sliceStart += BATCH) {
    const limit = Math.min(BATCH, TOTAL - sliceStart)
    const sliceFile = join(OUTDIR, `slice-${String(sliceStart).padStart(3, '0')}.json`)
    let cached = null
    try { cached = JSON.parse(readFileSync(sliceFile, 'utf8')) } catch (_) {}
    if (cached && cached.fixture && cached.fixture.sha256 === fixtureSha256) {
      reports.push({ report: cached, chromeExit: 0 })
      log(`slice ${sliceStart}: reusing cached slice report ${sliceFile} (fixture sha matches)`)
      continue
    }
    if (cached) log(`slice ${sliceStart}: cached slice report fixture sha mismatch, re-running`)
    // A chromium launch or page run can transiently fail (container pid cap,
    // GPU OOM), and heavy-shader compiles fail nondeterministically in
    // SwiftShader with an empty ANGLE info log even in a fresh chromium
    // (observed on filter/octaveWarp and filter/oilPaint). Retry whole slices
    // and keep the best result (fewest missing+failed) so neither a transient
    // launch failure nor a flaky compile masks a case.
    let report = null; let chromeExit = -1
    const attempts = Number(process.env.GATE_SLICE_ATTEMPTS || 3)
    let best = null
    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (attempt > 1) {
        log(`slice ${sliceStart}: retrying (attempt ${attempt})`)
        await new Promise(r => setTimeout(r, 5000))
      }
      let current = null
      try {
        current = await runSlice(sliceStart, limit, attempt, log)
      } catch (err) {
        log(`slice run failed (attempt ${attempt}): ${String(err && err.message || err)}`)
        continue
      }
      chromeExit = 0
      const d = current.denominator || {}
      log(`slice ${sliceStart}: executed=${d.executedComparisons}/${d.expectedComparisons} exact=${d.exact} tolerance=${d.tolerance} failed=${d.failed} missing=${d.missing} chromiumExit=0`)
      if (!best || (d.missing + d.failed) < (best.denominator.missing + best.denominator.failed)) best = current
      if (current.pass) { report = current; break }
    }
    report = report || best
    if (!report) {
      process.exitCode = 2
      log(`slice ${sliceStart}: giving up after retries (no report produced)`)
      break
    }
    if (!report.pass) {
      // The slice's own failures (missing/failed comparisons) are preserved in
      // the slice report and merged at the end; the run continues so every
      // remaining case is still executed.
      log(`slice ${sliceStart}: not passing after ${attempts} attempt(s); preserving failures and continuing`)
    }
    writeFileSync(sliceFile, JSON.stringify(report, null, 1))
    // Chromium children may still be flushing the profile dir; a failed
    // cleanup must never fail the slice itself.
    try {
      rmSync(join(OUTDIR, `chrome-profile-${sliceStart}`), { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
    } catch (cleanupErr) {
      log(`slice ${sliceStart}: profile cleanup skipped: ${cleanupErr.message}`)
    }
    reports.push({ report, chromeExit })
  }

  if (reports.length) {
    mkdirSync(OUTDIR, { recursive: true })
    const first = reports[0].report
    const denominator = {
      cases: TOTAL,
      expectedComparisons: TOTAL * 6,
      executedComparisons: 0,
      exact: 0, tolerance: 0, failed: 0, missing: 0
    }
    const caseStatus = []
    const perFrame = []
    const failures = []
    let identityOkMerged = true
    let rollingOk = true
    for (const { report, chromeExit } of reports) {
      const rd = report.denominator
      for (const k of ['executedComparisons', 'exact', 'tolerance', 'failed', 'missing']) {
        denominator[k] += rd[k]
      }
      identityOkMerged = identityOkMerged && report.identityOk
      rollingOk = rollingOk && report.identity.rollingMatchesImmutable === true
      caseStatus.push(...report.caseStatus)
      perFrame.push(...report.perFrame)
      failures.push(...report.failures)
      if (chromeExit !== 0) failures.push({ fatal: true, slice: report.slice, chromiumExitCode: chromeExit })
    }
    const merged = {
      gate: 'gap-001-rendered-parity',
      identityOk: identityOkMerged,
      // Informational only: the rolling /1 URL is upstream-managed and can
      // drift ahead of the pinned immutable bundle; the gate pins 1.0.182.
      rollingOk,
      pinned: first.pinned,
      identity: first.identity,
      env: first.env,
      fixture: first.fixture,
      batch: { size: BATCH, slices: reports.length },
      denominator,
      pass: identityOkMerged && denominator.executedComparisons === denominator.expectedComparisons &&
        denominator.failed === 0 && denominator.missing === 0 && reports.length === Math.ceil(TOTAL / BATCH),
      failures,
      caseStatus,
      perFrame
    }
    writeFileSync(join(OUTDIR, 'parity-gate-report.json'), JSON.stringify(merged, null, 1))
    const d = merged.denominator
    log(`merged: executed=${d.executedComparisons}/${d.expectedComparisons} exact=${d.exact} tolerance=${d.tolerance} failed=${d.failed} missing=${d.missing} identityOk=${identityOkMerged} rollingMatchesImmutable=${rollingOk} pass=${merged.pass}`)
    process.exitCode = merged.pass ? 0 : 1
  }
} finally {
  server.close()
}
