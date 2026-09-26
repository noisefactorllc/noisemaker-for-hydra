// GAP-004 GLSL reference driver: render every generated Hydra program through
// the engine's WebGL2 backend in headless chromium, collecting readbacks.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const CHROME = '/usr/bin/chromium'
const PAGE = 'http://127.0.0.1:5410/glsl-ref.html'
const OUT = '/state/cache/scratch/gap4/glsl-frames.json'
const programs = JSON.parse(readFileSync('/state/cache/scratch/gap4/programs.json', 'utf8'))

function log (m) { process.stderr.write(`[glsl-ref] ${m}\n`) }

const args = [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check',
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--user-data-dir=/state/cache/scratch/gap4/profile-glsl',
  '--remote-debugging-port=5922',
  'about:blank'
]
const child = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'], detached: true })
const killTree = () => { try { process.kill(-child.pid, 'SIGKILL') } catch (_) { try { child.kill('SIGKILL') } catch (_) {} } }
let errLog = ''
child.stderr.on('data', d => { errLog += String(d) })
try {
  let wsUrl = null
  const deadline = Date.now() + 60000
  while (Date.now() < deadline && !wsUrl) {
    const m = errLog.match(/DevTools listening on (ws:\/\/\S+)/)
    if (m) wsUrl = m[1]
    else await new Promise(r => setTimeout(r, 250))
  }
  if (!wsUrl) throw new Error(`no devtools endpoint: ${errLog.slice(-400)}`)
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws failed')) })
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
      if (line) log(`console: ${line.slice(0, 300)}`)
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
  const evaluate = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, sessionId)
    if (r.exceptionDetails) {
      const d = r.exceptionDetails
      throw new Error(`evaluate failed: ${d.text} ${(d.exception && d.exception.description) || ''}`.slice(0, 800))
    }
    return r.result && r.result.value
  }
  await send('Page.navigate', { url: PAGE }, sessionId)
  const end = Date.now() + 120000
  while (Date.now() < end) {
    const ready = await evaluate('window.__ready === true')
    if (ready) break
    await new Promise(r => setTimeout(r, 1000))
  }
  const results = await evaluate(
    `window.__run(${JSON.stringify(programs.programs ? programs.programs : programs)})`,
    true
  )
  writeFileSync(OUT, JSON.stringify(results))
  const errs = results.filter(r => r.error)
  log(`glsl results: ${results.length} errors: ${errs.length}`)
  for (const e of errs.slice(0, 10)) log(`ERR ${e.name} ${e.case} ${e.error}`)
} catch (err) {
  log(`driver error: ${err.message}`)
  process.exitCode = 1
} finally { killTree() }
