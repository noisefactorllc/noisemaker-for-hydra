#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'

const CHROME = process.env.CHROME ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = process.env.PORT || 5173
const SOURCE = 'search hydra\ngradient(speed: 0).write(o0)'

function startServer() {
  return spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

async function waitForServer(timeoutMs = 10000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://localhost:${PORT}/`)
      if (response.ok) return
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Vite did not start on port ${PORT}`)
}

function runEditor(path, windowSize = '1024,768') {
  const url = `http://localhost:${PORT}${path}`
  return spawnSync(CHROME, [
    '--headless',
    '--no-sandbox',
    `--window-size=${windowSize}`,
    '--virtual-time-budget=30000',
    '--dump-dom',
    url
  ], { encoding: 'utf8' })
}

let server
let exitCode = 0
try {
  server = startServer()
  await waitForServer()
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
    name: 'resized window DSL',
    path: `/?code=${encodeURIComponent(encodeSource(SOURCE))}`,
    expected: ['search hydra', 'gradient(speed: 0).write(o0)'],
    windowSize: '640,480'
  }
]

  for (const testCase of cases) {
    const result = runEditor(testCase.path, testCase.windowSize)
    const dom = result.stdout || ''
    const text = dom
      .replace(/<[^>]*>/g, '')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
    const sourceLoaded = testCase.expected.every(part => text.includes(part))
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

    if (!sourceLoaded || failures.length > 0 || result.status !== 0) {
      console.error(`[editor-test] FAIL ${testCase.name}`)
      if (!sourceLoaded) console.error('[editor-test] expected DSL did not load')
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
