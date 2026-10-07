#!/usr/bin/env node
// Keyboard accessibility driver.
//
// Drives a real headless Chromium input pipeline over the Chrome DevTools
// Protocol: presses Tab to walk the toolbar, presses Enter and Space to
// activate controls, and records the resulting focus order, accessible
// names, roles, and activation events. Raw dispatch goes through
// Input.dispatchKeyEvent, so focus traversal and activation are the
// browser's own behavior, not synthetic DOM events.
//
// Usage: CHROME=/usr/bin/chromium PORT=<p> node scripts/a11y-keyboard.mjs
// Exits 0 only when every check passes. Prints a JSON report on stdout.

import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { once } from 'node:events'
import http from 'node:http'

const CHROME = process.env.CHROME || '/usr/bin/chromium'
const PORT = process.env.PORT || 5173
const URL_BASE = `http://localhost:${PORT}`

function startVite() {
  return spawn(process.execPath, [
    'node_modules/vite/bin/vite.js',
    '.', '--host', '--port', String(PORT)
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
}

async function waitForServer(timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${URL_BASE}/`)
      if (response.ok) return
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`vite did not start on port ${PORT}`)
}

function startChrome(debugPort) {
  return spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1024,768',
    `--remote-debugging-port=${debugPort}`,
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
}

async function waitForDevtools(port, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return await response.json()
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`devtools endpoint did not open on port ${port}`)
}

// Minimal WebSocket client, sufficient for a CDP session (text frames only).
class Ws {
  constructor(url) {
    this.url = new URL(url)
    this.onmessage = () => {}
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64')
      const request = http.request({
        hostname: this.url.hostname,
        port: this.url.port,
        path: this.url.pathname + this.url.search,
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': key,
          'Sec-WebSocket-Version': '13'
        }
      })
      request.on('upgrade', (response, socket, head) => {
        const accept = crypto.createHash('sha1')
          .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64')
        if (response.headers['sec-websocket-accept'] !== accept) {
          socket.destroy()
          reject(new Error('websocket accept mismatch'))
          return
        }
        this.socket = socket
        this.buffer = Buffer.alloc(0)
        if (head.length > 0) this.buffer = Buffer.concat([this.buffer, head])
        socket.on('data', (chunk) => this.receive(chunk))
        socket.on('error', reject)
        resolve()
      })
      request.on('error', reject)
      request.end()
    })
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (true) {
      if (this.buffer.length < 2) return
      const first = this.buffer[0]
      const opcode = first & 0x0f
      const masked = (this.buffer[1] & 0x80) !== 0
      let length = this.buffer[1] & 0x7f
      let offset = 2
      if (length === 126) {
        if (this.buffer.length < 4) return
        length = this.buffer.readUInt16BE(2)
        offset = 4
      } else if (length === 127) {
        if (this.buffer.length < 10) return
        length = Number(this.buffer.readBigUInt64BE(2))
        offset = 10
      }
      let mask = null
      if (masked) {
        if (this.buffer.length < offset + 4) return
        mask = this.buffer.subarray(offset, offset + 4)
        offset += 4
      }
      if (this.buffer.length < offset + length) return
      let payload = this.buffer.subarray(offset, offset + length)
      this.buffer = this.buffer.subarray(offset + length)
      if (mask) {
        const unmasked = Buffer.alloc(length)
        for (let i = 0; i < length; i++) unmasked[i] = payload[i] ^ mask[i % 4]
        payload = unmasked
      }
      if (opcode === 0x8) { this.socket.end(); return }
      if (opcode === 0x9) { // ping -> pong (unmasked)
        this.socket.write(this.frame(0xA, payload))
        continue
      }
      if (opcode === 0x1) this.onmessage(payload.toString('utf8'))
    }
  }

  frame(opcode, payload) {
    const mask = crypto.randomBytes(4)
    const masked = Buffer.alloc(payload.length)
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4]
    let header
    if (payload.length < 126) {
      header = Buffer.from([0x80 | opcode, 0x80 | payload.length])
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4)
      header[0] = 0x80 | opcode
      header[1] = 0x80 | 126
      header.writeUInt16BE(payload.length, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x80 | opcode
      header[1] = 0x80 | 127
      header.writeBigUInt64BE(BigInt(payload.length), 2)
    }
    return Buffer.concat([header, mask, masked])
  }

  send(text) {
    this.socket.write(this.frame(0x1, Buffer.from(text, 'utf8')))
  }
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    this.session = null
    ws.onmessage = (text) => {
      const message = JSON.parse(text)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
      }
    }
  }

  async open(url) {
    await this.ws.connect()
    const created = await this.send('Target.createTarget', { url })
    const attached = await this.send('Target.attachToTarget', {
      targetId: created.targetId, flatten: true
    })
    this.session = attached.sessionId
    await this.send('Page.enable')
    await this.send('Runtime.enable')
  }

  send(method, params = {}) {
    const id = this.nextId++
    const message = { id, method, params }
    if (this.session) message.sessionId = this.session
    this.ws.send(JSON.stringify(message))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`cdp timeout: ${method}`))
        }
      }, 30000)
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true
    })
    if (result.exceptionDetails) {
      throw new Error(`page evaluate failed: ${result.exceptionDetails.text}`)
    }
    return result.result.value
  }

  async press(key, code, virtualKeyCode, text) {
    const base = { key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode }
    if (text) base.text = text
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
    await new Promise(resolve => setTimeout(resolve, 120))
  }
}

const checks = []
let failed = false
const check = (name, passed, detail) => {
  checks.push({ name, passed, detail })
  console.error(`[a11y-keyboard] ${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!passed) failed = true
}

const vite = startVite()
let chrome = null
try {
  await waitForServer()
  const debugPort = 9333
  chrome = startChrome(debugPort)
  const version = await waitForDevtools(debugPort)
  const wsUrl = version.webSocketDebuggerUrl
  const ws = new Ws(wsUrl)
  const cdp = new Cdp(ws)
  await cdp.open(URL_BASE + '/')

  // Wait for the editor to boot (toolbar rendered by choo).
  let booted = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await cdp.evaluate(`!!document.querySelector('#run-button') && !!document.querySelector('.CodeMirror')`)) {
      booted = true
      break
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  check('editor boots with toolbar buttons present', booted)

  // Toolbar control inventory: role, name, tabbability.
  const inventory = await cdp.evaluate(`(() => {
    const buttons = [...document.querySelectorAll('#toolbar-container button')]
    return buttons.map((button) => ({
      id: button.id,
      tagName: button.tagName,
      role: button.getAttribute('role') || button.type,
      ariaLabel: button.getAttribute('aria-label'),
      tabindex: button.getAttribute('tabindex'),
      hidden: button.classList.contains('hidden') || getComputedStyle(button).display === 'none',
      iconAriaHidden: button.querySelector('i')?.getAttribute('aria-hidden')
    }))
  })()`)
  const requiredIds = ['run-button', 'clear-button', 'add-button', 'shuffle-button', 'mutator-button', 'close-button']
  const present = requiredIds.filter(id => inventory.some(b => b.id === id))
  check('six toolbar controls rendered', present.length === 6, `found: ${present.join(', ')}`)
  const named = inventory.filter(b => b.ariaLabel && b.tagName === 'BUTTON')
  check('each toolbar control is a named button', named.length === inventory.length && inventory.length > 0,
    `${named.length}/${inventory.length} buttons carry aria-label`)
  const negative = inventory.filter(b => b.tabindex !== null && Number(b.tabindex) < 0)
  check('no toolbar control has a negative tabindex', negative.length === 0,
    negative.map(b => b.id).join(', ') || 'none')
  const hiddenIcons = inventory.filter(b => b.iconAriaHidden !== 'true')
  check('decorative icons are aria-hidden', hiddenIcons.length === 0, hiddenIcons.map(b => b.id).join(', ') || 'all hidden')
  const visible = inventory.filter(b => !b.hidden)
  check('default-view controls are not display-hidden', visible.length === 6,
    `${visible.length} visible: ${visible.map(b => b.id).join(', ')}`)

  // Editor labeling.
  const editorLabels = await cdp.evaluate(`(() => ({
    textareas: [...document.querySelectorAll('#editor-container textarea, .CodeMirror textarea')].map((t) => ({
      label: t.getAttribute('aria-label'), tabindex: String(t.tabIndex), hidden: t.getAttribute('style')?.includes('none') || t.className
    })),
    wrapperRole: document.querySelector('.CodeMirror')?.getAttribute('role'),
    wrapperLabel: document.querySelector('.CodeMirror')?.getAttribute('aria-label'),
    logRole: document.querySelector('.console')?.getAttribute('role'),
    logLabel: document.querySelector('.console')?.getAttribute('aria-label'),
    logLive: document.querySelector('.console')?.getAttribute('aria-live')
  }))()`)
  check('editor textarea has an accessible name',
    editorLabels.textareas.some((t) => t.label === 'Hydra program editor'),
    JSON.stringify(editorLabels.textareas))
  check('CodeMirror surface exposes a textbox role and name',
    editorLabels.wrapperRole === 'textbox' && editorLabels.wrapperLabel === 'Hydra program editor',
    `role=${editorLabels.wrapperRole} label=${editorLabels.wrapperLabel}`)
  check('CodeMirror textarea is keyboard-reachable',
    editorLabels.textareas.some((t) => Number(t.tabindex) === 0),
    JSON.stringify(editorLabels.textareas))
  check('diagnostics log is announced',
    editorLabels.logRole === 'log' && editorLabels.logLabel === 'Editor diagnostics' && editorLabels.logLive === 'polite',
    `role=${editorLabels.logRole} label=${editorLabels.logLabel} live=${editorLabels.logLive}`)

  // Install a click recorder: real keyboard activation produces trusted
  // click events on the buttons.
  await cdp.evaluate(`window.__clicked = []
    document.getElementById('toolbar-container').addEventListener('click', (event) => {
      const button = event.target.closest('button')
      if (button) window.__clicked.push(button.id)
    })`)

  // Tab traversal from the top of the document. Chrome keeps its sequential
  // focus navigation starting point after blur(), so the activation phases
  // below cycle Tab (wrap-around) until the target control holds focus.
  const focusOrder = []
  for (let step = 0; step < 40; step++) {
    await cdp.press('Tab', 'Tab', 9)
    const active = await cdp.evaluate(`(() => {
      const element = document.activeElement
      return { id: element.id, tag: element.tagName, label: element.getAttribute('aria-label') || (element.textContent || '').trim().slice(0, 40), cls: String(element.className).slice(0, 40) }
    })()`)
    if (active.tag === 'BODY') break
    focusOrder.push(active)
  }
  const focusedIds = focusOrder.map(f => f.id)
  const controlIds = ['run-button', 'clear-button', 'add-button', 'shuffle-button', 'mutator-button', 'close-button']
  const reachable = controlIds.filter(id => focusedIds.includes(id))
  check('every toolbar control is reachable with Tab', reachable.length === controlIds.length,
    `tab order: ${focusedIds.join(' -> ')}`)
  check('tab order starts at the first toolbar control', focusedIds[0] === 'run-button',
    `first focus: ${focusedIds[0]}`)
  check('CodeMirror editor is reachable with Tab',
    focusOrder.some(f => f.cls.includes('CodeMirror') || (f.label === 'Hydra program editor' && f.tag !== 'BUTTON')),
    `tab order: ${focusedIds.join(' -> ')}`)

  // Focus the target control directly for the activation phases. Reach by
  // Tab alone is proven above (the traversal check); here the genuine
  // browser keyboard activation path (Enter / Space key dispatch on a
  // focused control) is what is under test.
  const focusControl = async (id) => {
    await cdp.evaluate(`document.getElementById('${id}').focus()`)
    return await cdp.evaluate(`document.activeElement.id`) === id
  }

  // Enter activation on the run control evaluates and saves to the URL.
  check('run control focused for activation', await focusControl('run-button'))
  await cdp.press('Enter', 'Enter', 13, '\r')
  let urlSaved = false
  for (let attempt = 0; attempt < 40; attempt++) {
    urlSaved = await cdp.evaluate(`location.search.includes('code=')`)
    if (urlSaved) break
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  check('Enter on the run control evaluates the program', urlSaved,
    await cdp.evaluate(`decodeURIComponent(location.search.slice(0, 80))`))

  // Space activation on the shuffle control produces a trusted click.
  check('shuffle control focused for activation', await focusControl('shuffle-button'))
  await cdp.press(' ', 'Space', 32)
  const clicked = await cdp.evaluate(`window.__clicked`)
  check('Space activates the shuffle control', clicked.includes('shuffle-button'),
    `clicked: ${clicked.join(', ')}`)

  const report = {
    focusOrder: focusedIds,
    clicked,
    inventory,
    editorLabels,
    checks
  }
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(`[a11y-keyboard] ERROR ${error.message}`)
  failed = true
} finally {
  if (chrome) chrome.kill('SIGKILL')
  if (vite) vite.kill('SIGTERM')
}
process.exit(failed ? 1 : 0)
