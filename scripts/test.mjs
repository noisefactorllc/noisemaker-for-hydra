#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Explicit CHROME wins; otherwise resolve the first installed browser so a
// Linux runner without CHROME set does not silently ENOENT every case
// (empty DOM, 'expected DSL did not load' across the board, no stderr).
const CHROME = process.env.CHROME ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/chrome'
  ].find(existsSync) ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const HOST = '127.0.0.1'
const REQUESTED_PORT = Number(process.env.PORT) || 0 // 0 = bind an OS-assigned free port (a collision on the fixed dev port makes Chrome load a foreign blank page while waitForServer passes)
const SOURCE = 'search hydra\ngradient(speed: 0).write(o0)'

function startServer() {
  return spawn(process.execPath, [
    'node_modules/vite/bin/vite.js',
    '.',
    '--host',
    '--port', String(REQUESTED_PORT),
    '--strictPort'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

// Read the actually-bound port from vite's startup banner so the driver and
// headless Chrome always target the same server instance.
function resolveBoundPort(server, timeoutMs = 15000) {
  const PORT = REQUESTED_PORT
  if (PORT) return Promise.resolve(PORT)
  return new Promise((resolve, reject) => {
    let stderr = ''
    let buf = ''
    server.stderr.on('data', data => { stderr += String(data) })
    const timer = setTimeout(() => reject(new Error(`vite startup banner not seen in time; stdout=${JSON.stringify(buf.trim().slice(-2000))}; stderr=${JSON.stringify(stderr.trim().slice(-2000))}`)), timeoutMs)
    const onData = d => {
      buf += String(d)
      const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)\//)
      if (m) {
        clearTimeout(timer)
        server.stdout.off('data', onData)
        resolve(Number(m[1]))
      }
    }
    server.stdout.on('data', onData)
  })
}

async function waitForServer(port, timeoutMs = 10000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://${HOST}:${port}/`)
      if (response.ok) return
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Vite did not start on port ${port}`)
}

let BOUND_PORT = 0

// A headless Chrome that never returns (it hung a CI job for 90 minutes on a
// shared GPU runner) must fail the case quickly instead of holding the job.
// Shared runners can also be merely slow: a contended launch may need well
// over two minutes per page, so the budget is large enough for that while a
// genuinely hung page still exhausts the retry budget instead of hanging CI.
const EDITOR_TIMEOUT_MS = 180000
// A sustained runner stall can outlast a single retry: give editor launches a
// multi-attempt budget with short backoff, the same tolerance the parity gate
// applies to its slice runs (which exposes its budget as GATE_SLICE_ATTEMPTS).
// Only a timed-out launch is retried; assertion failures still fail
// immediately, and the case still fails after the budget is spent.
const EDITOR_LAUNCH_ATTEMPTS = (() => {
  const raw = process.env.EDITOR_LAUNCH_ATTEMPTS
  if (raw == null || raw === '') return 3
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`EDITOR_LAUNCH_ATTEMPTS must be a positive integer, got '${raw}'`)
  }
  return value
})()

// The editor suite must never touch the browser's default profile. A shared
// default profile accretes HTTP and GPU cache across every launch and every
// run; on a small or shared filesystem it eventually wedges page loads (a
// 180 s launch timeout on every case, as observed on a runner whose default
// headless profile had grown to hundreds of MB). A dedicated directory under
// the system temp dir keeps the suite self-contained and bounded, while
// staying warm across the cases of one run so pages do not pay cold-cache
// and first-run service costs under the virtual time budget.
const EDITOR_PROFILE_DIR = mkdtempSync(join(tmpdir(), 'editor-test-profile-'))
const EDITOR_DISK_CACHE_BYTES = 128 * 1024 * 1024

process.on('exit', () => {
  try { rmSync(EDITOR_PROFILE_DIR, { recursive: true, force: true }) } catch { /* best effort */ }
})

function launchChrome(url, windowSize) {
  return spawnSync(CHROME, [
    '--headless=new',
    '--no-sandbox',
    `--user-data-dir=${EDITOR_PROFILE_DIR}`,
    // The parity-gate driver uses the same hardening: no background services
    // fighting the page for the virtual time budget (sync, component
    // updates, GCM registration, first-run prompts).
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    `--disk-cache-size=${EDITOR_DISK_CACHE_BYTES}`,
    // The renderer crashes or hangs at navigation when /dev/shm is exhausted
    // (sandboxes cap it at 64MB), which surfaces as a launch timeout after the
    // full retry budget. Standard Chromium hardening: move shared memory to
    // /tmp. CI VMs have no such cap, so the flag is pure hardening there.
    '--disable-dev-shm-usage',
    // Force software WebGL so a headless GPU stack can never wedge the page or
    // stall browser teardown (the parity gate launches its own slices with
    // the same ANGLE/SwiftShader flags).
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    // Ambient proxy env must not route the loopback dev server through a
    // proxy (blank pages, every case 'expected DSL did not load'); external
    // hosts keep any ambient proxy.
    '--proxy-bypass-list=<-loopback>',
    `--window-size=${windowSize}`,
    '--virtual-time-budget=30000',
    '--dump-dom',
    url
  ], { encoding: 'utf8', timeout: EDITOR_TIMEOUT_MS, killSignal: 'SIGKILL' })
}

async function runEditor(path, windowSize = '1024,768') {
  const url = `http://${HOST}:${BOUND_PORT}${path}`
  for (let attempt = 1; attempt <= EDITOR_LAUNCH_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.error(`[editor-test] retrying ${url} (attempt ${attempt} of ${EDITOR_LAUNCH_ATTEMPTS})`)
      await new Promise(resolve => setTimeout(resolve, 5000 * Math.min(attempt, 4)))
    }
    const result = launchChrome(url, windowSize)
    if (result.error?.code !== 'ETIMEDOUT') return result
    // A one-off runner hiccup (CDN stall, GPU process stall) can hang a single
    // headless page past its timeout without producing any verdict. Assertion
    // failures are never retried; only a timed-out launch is.
  }
  throw new Error(`Chrome did not finish ${url} within ${EDITOR_TIMEOUT_MS / 1000} s per attempt across ${EDITOR_LAUNCH_ATTEMPTS} attempts`)
}

let server
let exitCode = 0
try {
  server = startServer()
  BOUND_PORT = await resolveBoundPort(server)
  await waitForServer(BOUND_PORT)
  function encodeSource(source) {
  return Buffer.from(encodeURIComponent(source)).toString('base64')
}

const readmeNoiseSource = 'search hydra\nnoise(scale: 5)\n  .write(o0)\n\nrender(o0)'
const readmeChainSource = 'search hydra, points, render\nnoise(scale: 5)\n  .pointsEmit()\n  .flow()\n  .pointsRender()\n  .write(o0)\n\nrender(o0)'
const invalidEffectSource = 'search hydra\nbogusEffect().write(o0)\nrender(o0)'

const cases = [
  {
    name: 'encoded DSL',
    path: `/?code=${encodeURIComponent(encodeSource(SOURCE))}`,
    expected: ['search hydra', 'gradient(speed: 0).write(o0)']
  },
  {
    name: 'default DSL',
    path: '/',
    expected: ['search hydra', '.write(o0)']
  },
  {
    name: 'chained variable alias DSL',
    path: `/?code=${encodeURIComponent(encodeSource('search hydra\nlet eff = rotate(angle: 0.1)\ngradient().eff().write(o0)'))}`,
    expected: ['search hydra', 'let eff = rotate(angle: 0.1)', 'gradient().eff().write(o0)']
  },
  {
    name: 'midi note mode DSL',
    path: `/?code=${encodeURIComponent(encodeSource('search hydra, synth\nlet m = midi(mode: midiMode.noteChange, channel: 1)\ngradient(speed: m).write(o0)'))}`,
    expected: ['search hydra', 'midiMode.noteChange', 'gradient(speed: m).write(o0)']
  },
  {
    name: 'adjust filter DSL',
    path: `/?code=${encodeURIComponent(encodeSource('search hydra, synth, filter\ngradient().adjust(contrast: 1.2, brightness: 0.1).write(o0)'))}`,
    expected: ['search hydra', 'gradient().adjust(contrast: 1.2, brightness: 0.1).write(o0)']
  },
  {
    name: 'output surface boundary DSL',
    path: `/?code=${encodeURIComponent(encodeSource('search hydra, synth\ngradient(speed: 0).write(o7)\nrender(o7)'))}`,
    expected: ['search hydra', 'gradient(speed: 0).write(o7)', 'render(o7)']
  },
  {
    name: 'synth noise DSL',
    path: `/?code=${encodeURIComponent(encodeSource('search hydra, synth\nnoise(scale: 10, offset: 0.1).write(o0)\nrender(o0)'))}`,
    expected: ['search hydra', 'noise(scale: 10, offset: 0.1).write(o0)', 'render(o0)']
  },
  {
    name: 'README noise example',
    path: `/?code=${encodeURIComponent(encodeSource(readmeNoiseSource))}`,
    expected: ['search hydra', 'noise(scale: 5)', '.write(o0)', 'render(o0)']
  },
  {
    name: 'README chained points example',
    path: `/?code=${encodeURIComponent(encodeSource(readmeChainSource))}`,
    expected: ['search hydra', 'noise(scale: 5)', '.pointsEmit()', '.flow()', '.pointsRender()', '.write(o0)', 'render(o0)']
  },
  {
    name: 'invalid effect diagnostic',
    path: `/?code=${encodeURIComponent(encodeSource(invalidEffectSource))}`,
    expected: ['search hydra', 'bogusEffect'],
    expectedDiagnostics: ['Unknown effect'],
    expectErrorLog: true
  },
  {
    name: 'accessibility semantics',
    path: '/',
    expected: ['search hydra', '.write(o0)'],
    expectedDom: [
      '<button type="button" id="run-button"',
      'aria-label="Run all code (ctrl+shift+enter)"',
      'aria-label="clear all"',
      'aria-label="load library or extension"',
      'aria-label="show random sketch"',
      'aria-label="make random change"',
      'aria-label="hide info window"',
      '<textarea aria-label="Hydra program editor"',
      'role="textbox" aria-label="Hydra program editor"',
      'role="log" aria-label="Editor diagnostics" aria-live="polite"'
    ]
  },
  {
    name: 'resized window DSL',
    path: `/?code=${encodeURIComponent(encodeSource(SOURCE))}`,
    expected: ['search hydra', 'gradient(speed: 0).write(o0)'],
    windowSize: '640,480',
    extraPage: { path: '/test/tile-media.html', expected: ['tile-media-ready'] },
    extraPages: [
      { path: '/test/particle-inputs.html', expected: ['particle-inputs-ready'] }
    ]
  }
]

  for (const testCase of cases) {
    const result = await runEditor(testCase.path, testCase.windowSize)
    const dom = result.stdout || ''
    const text = dom
      .replace(/<[^>]*>/g, '')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
    const sourceLoaded = testCase.expected.every(part => text.includes(part))
    const expectedDom = testCase.expectedDom || []
    const expectedDomPresent = expectedDom.every(part => dom.includes(part))
    const expectedDiagnostics = testCase.expectedDiagnostics || []
    const expectedDiagnosticsPresent = expectedDiagnostics.every(message => text.includes(message))
    const errorLogPresent = dom.includes('log-error')
    const knownFailures = [
      'engine not ready',
      'ReferenceError',
      'SyntaxError',
      'Unknown effect',
      'Unknown argument',
      'Recompilation failed',
      'out of range'
    ]
    let failures = knownFailures.filter(message => text.includes(message) && !expectedDiagnostics.includes(message))
    if (expectedDiagnostics.length > 0 || testCase.expectErrorLog) {
      if (!expectedDiagnosticsPresent) failures.push(`expected diagnostic missing: ${expectedDiagnostics.join(', ')}`)
      if (testCase.expectErrorLog && !errorLogPresent) failures.push('log-error missing')
    }
    if (dom.includes('log-error') && !testCase.expectErrorLog) {
      failures.push('log-error')
    }

    // An extraPage runs as a second launch inside the same case verdict, so
    // the suite's PASS count stays stable for the CI gate's exact-count check.
    // extraPages carries additional required pages the same way.
    const extraPages = testCase.extraPages || []
    if (testCase.extraPage) extraPages.push(testCase.extraPage)
    for (const extra of extraPages) {
      const extraResult = await runEditor(extra.path, extra.windowSize)
      const extraDom = extraResult.stdout || ''
      const extraOk = extra.expected.every(part => extraDom.includes(part)) && extraResult.status === 0
      if (!extraOk) failures.push(`extraPage ${extra.path} did not pass`)
    }

    if (!sourceLoaded || failures.length > 0 || !expectedDomPresent || result.status !== 0) {
      console.error(`[editor-test] FAIL ${testCase.name}`)
      if (!sourceLoaded) console.error('[editor-test] expected DSL did not load')
      if (!expectedDomPresent) console.error(`[editor-test] expected DOM missing: ${expectedDom.filter(part => !dom.includes(part)).join(' | ')}`)
      if (failures.length > 0) console.error(`[editor-test] diagnostics: ${failures.join(', ')}`)
      if (result.stderr) console.error(result.stderr.trim())
      exitCode = 1
    } else {
      console.log(`[editor-test] PASS ${testCase.name}`)
    }
  }
} catch (error) {
  console.error(`[editor-test] ERROR ${error.message}`)
  exitCode = 2
} finally {
  if (server) server.kill('SIGTERM')
}

process.exit(exitCode)
