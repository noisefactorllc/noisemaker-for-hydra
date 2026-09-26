#!/usr/bin/env node
/**
 * GAP-001 complete rendered parity gate.
 *
 * Serves the repository with vite, then drives headless Chromium through
 * test/parity-gate/parent.html, which renders the case slice in
 * test/fixtures/parity-cases.json (210 pinned authority effect IDs) through:
 *   - the authority side: raw published Noisemaker engine (pinned immutable
 *     1.0.182 CDN bundle, default CanvasRenderer wiring), and
 *   - the port side: the tracked companion bundle plus the fork's
 *     src/lib/noisemaker-runtime.mjs wiring.
 * Every frame is compared exact-equality first; the legacy +-2 numerical
 * contract is reported separately. Failures and missing cases are preserved
 * in the report and make the gate exit nonzero.
 *
 * Cases run in GATE_BATCH (default 30) sized slices, one fresh headless
 * Chromium process per slice: SwiftShader GPU memory is freed between
 * slices; long single-page runs crash the GPU process with exit_code=9.
 *
 * Usage: CHROME=/usr/bin/chromium node scripts/parity-gate.mjs [outdir]
 * Writes parity-gate-report.json into outdir (default: parity-evidence).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = Number(process.env.PORT || 5199)
const OUTDIR = resolve(process.argv[2] || join(ROOT, 'parity-evidence'))
const BATCH = Number(process.env.GATE_BATCH || 5)
const TOTAL = 210

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

server.listen(PORT, '127.0.0.1')

let exitCode = 0
try {
  const started = Date.now()
  while (Date.now() - started < 30000) {
    try {
      const res = await fetch(`http://localhost:${PORT}/test/parity-gate/parent.html`)
      if (res.ok) break
    } catch (_) {}
    await new Promise(r => setTimeout(r, 250))
  }
  log('static gate server up')

  const reports = []
  mkdirSync(OUTDIR, { recursive: true })
  for (let sliceStart = 0; sliceStart < TOTAL; sliceStart += BATCH) {
    const limit = Math.min(BATCH, TOTAL - sliceStart)
    const sliceFile = join(OUTDIR, `slice-${String(sliceStart).padStart(3, '0')}.json`)
    try {
      reports.push({ report: JSON.parse(readFileSync(sliceFile, 'utf8')), chromeExit: 0 })
      log(`slice ${sliceStart}: reusing cached slice report ${sliceFile}`)
      continue
    } catch (_) {}
    // A chromium launch or page run can transiently fail (container pid cap,
    // GPU OOM); retry each slice before giving up.
    let report = null; let chromeExit = -1
    for (let attempt = 1; attempt <= Number(process.env.GATE_SLICE_ATTEMPTS || 3) && !report; attempt++) {
      if (attempt > 1) {
        log(`slice ${sliceStart}: retrying (attempt ${attempt})`)
        await new Promise(r => setTimeout(r, 5000))
      }
      log(`slice ${sliceStart}..${sliceStart + limit - 1}: launching headless Chromium (attempt ${attempt})`)
      const url = `http://localhost:${PORT}/test/parity-gate/parent.html?start=${sliceStart}&limit=${limit}`
      const chromeArgs = [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--enable-logging=stderr',
        '--v=0',
        `--virtual-time-budget=${process.env.GATE_VIRTUAL_TIME_MS || 90000000}`,
        '--dump-dom',
        url
      ]
      log(`command: ${CHROME} ${chromeArgs.join(' ')}`)
      const result = await new Promise((res) => {
        const child = spawn(CHROME, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
        let out = ''; let err = ''
        child.stdout.on('data', d => { out += d })
        child.stderr.on('data', d => { err += d; process.stderr.write(d) })
        const timer = setTimeout(() => child.kill('SIGKILL'), Number(process.env.GATE_TIMEOUT_MS || 600000))
        child.on('exit', code => { clearTimeout(timer); res({ code, out, err }) })
      })
      chromeExit = result.code
      const start = result.out.indexOf('<pre id="out">')
      const end = result.out.indexOf('</pre>', start)
      if (start === -1 || end === -1) {
        log(`gate report marker not found in DOM dump (attempt ${attempt})`)
        log(result.err.slice(-2000))
        writeFileSync(join(OUTDIR, `chromium-dump-${sliceStart}.txt`), result.out)
        writeFileSync(join(OUTDIR, `chromium-err-${sliceStart}.txt`), result.err)
        continue
      }
      const raw = result.out.slice(start + '<pre id="out">'.length, end)
      try {
        report = JSON.parse(raw)
      } catch (err) {
        log(`report JSON parse failed: ${err.message} (attempt ${attempt})`)
        writeFileSync(join(OUTDIR, `report-raw-${sliceStart}.txt`), raw)
        continue
      }
      if (!report) continue
      writeFileSync(sliceFile, JSON.stringify(report, null, 1))
      const d = report.denominator || {}
      log(`slice ${sliceStart}: executed=${d.executedComparisons}/${d.expectedComparisons} exact=${d.exact} tolerance=${d.tolerance} failed=${d.failed} missing=${d.missing} chromiumExit=${result.code}`)
    }
    if (!report) {
      process.exitCode = 2
      log(`slice ${sliceStart}: giving up after retries`)
      break
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
    let identityOk = true
    for (const { report, chromeExit } of reports) {
      const rd = report.denominator
      for (const k of ['executedComparisons', 'exact', 'tolerance', 'failed', 'missing']) {
        denominator[k] += rd[k]
      }
      identityOk = identityOk && report.identityOk
      caseStatus.push(...report.caseStatus)
      perFrame.push(...report.perFrame)
      failures.push(...report.failures)
      if (chromeExit !== 0) failures.push({ fatal: true, slice: report.slice, chromiumExitCode: chromeExit })
    }
    const merged = {
      gate: 'gap-001-rendered-parity',
      identityOk,
      pinned: first.pinned,
      identity: first.identity,
      env: first.env,
      fixture: first.fixture,
      batch: { size: BATCH, slices: reports.length },
      denominator,
      pass: identityOk && denominator.executedComparisons === denominator.expectedComparisons &&
        denominator.failed === 0 && denominator.missing === 0 && reports.length === Math.ceil(TOTAL / BATCH),
      failures,
      caseStatus,
      perFrame
    }
    writeFileSync(join(OUTDIR, 'parity-gate-report.json'), JSON.stringify(merged, null, 1))
    const d = merged.denominator
    log(`merged: executed=${d.executedComparisons}/${d.expectedComparisons} exact=${d.exact} tolerance=${d.tolerance} failed=${d.failed} missing=${d.missing} identityOk=${identityOk} pass=${merged.pass}`)
    process.exitCode = merged.pass ? 0 : 1
  }
} finally {
  server.close()
}