// Deno harness: render every generated Hydra program through the real
// noisemaker engine's WGSL (WebGPU) backend offscreen, collecting readbacks.
const CDN = 'https://shaders.noisedeck.app/1.0.182'

// --- DOM shim -------------------------------------------------------------
class FakeContext {
  constructor (canvas, kind) { this.canvas = canvas; this.kind = kind }
  configure (cfg) { this._cfg = cfg; this.device = cfg.device }
  unconfigure () {}
  getCurrentTexture () { return { view: 'fake-view', destroy () {} } }
}
class FakeCanvas {
  constructor () { this.width = 300; this.height = 150; this.style = {} }
  getContext (kind) {
    if (!contexts.has(this)) contexts.set(this, new Map())
    const m = contexts.get(this)
    if (!m.has(kind)) {
      if (kind === 'webgpu') {
        throw new Error('fake-canvas: webgpu context must be provided externally')
      }
      m.set(kind, new FakeContext(this, kind))
    }
    return m.get(kind)
  }
  addEventListener () {}
  removeEventListener () {}
  getBoundingClientRect () { return { left: 0, top: 0, width: this.width, height: this.height } }
}
const contexts = new Map()
const elements = new Set()
globalThis.document = {
  createElement (tag) {
    tag = String(tag).toLowerCase()
    if (tag === 'canvas') return new FakeCanvas()
    return { style: {}, set innerHTML (v) {}, get innerHTML () { return '' }, appendChild () {}, addEventListener () {}, removeEventListener () {}, setAttribute () {}, getBoundingClientRect () { return { left: 0, top: 0, width: 0, height: 0 } } }
  },
  createElementNS (ns, tag) { return this.createElement(tag) },
  createTextNode (t) { return { text: t } },
  body: { appendChild () {}, style: {} },
  head: { appendChild () {} },
  getElementById () { return null },
  querySelector () { return null },
  querySelectorAll () { return [] },
  addEventListener () {},
  removeEventListener () {},
  documentElement: { style: {}, setAttribute () {} },
  visibilityState: 'visible',
  hidden: false,
  fullscreenElement: null,
  exitFullscreen () { return Promise.resolve() }
}
globalThis.window = globalThis
globalThis.navigator = globalThis.navigator || {}
globalThis.location = new URL('http://127.0.0.1:5410/')
globalThis.HTMLElement = class HTMLElement {}
globalThis.HTMLCanvasElement = class HTMLCanvasElement extends HTMLElement {}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.devicePixelRatio = 1
globalThis.self = globalThis
globalThis.ResizeObserver = class { observe () {} unobserve () {} disconnect () {} }
globalThis.matchMedia = () => ({ matches: false, addListener () {}, removeListener () {}, addEventListener () {}, removeEventListener () {} })
const registry = new Map()
globalThis.customElements = {
  define (name, ctor) { registry.set(name, ctor) },
  get (name) { return registry.get(name) },
  has (name) { return registry.has(name) }
}

// --- engine ---------------------------------------------------------------
const mod = await import(`${CDN}/noisemaker-shaders-core.esm.min.js`)
const gpu = navigator.gpu
const adapter = await gpu.requestAdapter()
if (!adapter) throw new Error('no webgpu adapter')
const device = await adapter.requestDevice()
const configured = []
FakeContext.prototype.configure = function (cfg) {
  this._cfg = cfg
  this.device = cfg.device
  configured.push(this)
}
const realGetContext = FakeCanvas.prototype.getContext
FakeCanvas.prototype.getContext = function (kind, ...rest) {
  if (kind === 'webgpu') {
    if (!this._webgpuCtx) {
      this._webgpuCtx = {
        canvas: this,
        configure (cfg) { this._cfg = cfg; this.device = cfg.device },
        unconfigure () {},
        getCurrentTexture () {
          return { view: { label: 'fake-canvas-view' }, destroy () {}, width: this.canvas.width, height: this.canvas.height }
        }
      }
    }
    return this._webgpuCtx
  }
  return realGetContext.call(this, kind, ...rest)
}

// --- companion + hydra wgsl -------------------------------------------------
const companionSrc = await (await fetch('file:///workspace/repos/noisemaker-for-hydra/public/_engine/hydra-synth.js')).text()
;(0, eval)(companionSrc)
await window.HydraEffects.loadHydraEffects({ engine: mod })
const { attachHydraWgslShaders, attachHydraWgslCompile } = await import('file:///workspace/repos/noisemaker-for-hydra/src/lib/hydra-wgsl.mjs')
const attached = attachHydraWgslShaders(mod)
const compileHooked = attachHydraWgslCompile(mod)

const renderer = new mod.CanvasRenderer({
  canvas: new FakeCanvas(),
  width: 32,
  height: 24,
  basePath: CDN,
  bundlePath: `${CDN}/effects`,
  useBundles: true,
  preferWebGPU: true
})
await renderer.loadManifest()
await renderer.loadEffects(Object.keys(renderer.manifest || {}))
renderer.start()
renderer.stop()
console.log('wgsl driver ready; attached:', attached, 'hook:', compileHooked, 'backend:', renderer.backend)

const programs = JSON.parse(await (await fetch('file:///state/cache/scratch/gap4/programs.json')).text()).programs
const results = []
for (const prog of programs) {
  for (const label of ['defaults', 'varied']) {
    const source = prog[label]
    if (!source) continue
    const item = { name: prog.name, case: label }
    try {
      await renderer.compile(source)
      renderer.syncTime(0)
      renderer.render(0)
      const pipeline = renderer.pipeline
      const surface = pipeline.surfaces.get('o0')
      const px = await pipeline.backend.readPixels(surface.read)
      item.data = Array.from(px.data ?? px).slice(0, 32 * 24 * 4)
    } catch (err) {
      item.error = JSON.stringify({ code: err.code, detail: err.detail, message: err.message, program: err.program }).slice(0, 500)
    }
    results.push(item)
    process.stdout.write(`${item.error ? 'E' : '.'}`)
  }
}
console.log('')
await (await import('node:fs/promises')).writeFile('/state/cache/scratch/gap4/wgsl-frames.json', JSON.stringify(results))
const failed = results.filter(r => r.error)
console.log('wgsl results:', results.length, 'errors:', failed.length)
for (const f of failed) console.log('ERR', f.name, f.case, f.error)
