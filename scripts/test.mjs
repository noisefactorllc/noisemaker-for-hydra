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

function runEditor(path) {
  const url = `http://localhost:${PORT}${path}`
  return spawnSync(CHROME, [
    '--headless',
    '--no-sandbox',
    '--window-size=1024,768',
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
  const encoded = Buffer.from(encodeURIComponent(SOURCE)).toString('base64')
  const cases = [
    {
      name: 'encoded DSL',
      path: `/?code=${encodeURIComponent(encoded)}`,
      expected: ['search hydra', 'gradient(speed: 0).write(o0)']
    },
    {
      name: 'default DSL',
      path: '/',
      expected: ['search hydra', '.write(o0)']
    }
  ]

  for (const testCase of cases) {
    const result = runEditor(testCase.path)
    const dom = result.stdout || ''
    const text = dom
      .replace(/<[^>]*>/g, '')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
    const sourceLoaded = testCase.expected.every(part => text.includes(part))
    const knownFailures = [
      'engine not ready',
      'ReferenceError',
      'Unknown effect',
      'Unknown argument',
      'Recompilation failed'
    ]
    const failures = knownFailures.filter(message => text.includes(message))

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
