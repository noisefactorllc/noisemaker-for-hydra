// Deno harness: run the real noisemaker engine's WGSL (WebGPU) backend offscreen.
// Shims just enough DOM for CanvasRenderer; the WebGPU device is real (Deno/wgpu).
const CDN = 'https://shaders.noisedeck.app/1.0.182'

// --- DOM shim -------------------------------------------------------------
const contexts = new Map()
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
console.log('engine exports:', Object.keys(mod).length)

// webgpu canvas context injection: patch FakeCanvas.getContext to hand out a
// real GPUCanvasContext-like shim once the renderer created its device.
const gpu = navigator.gpu
const adapter = await gpu.requestAdapter()
if (!adapter) throw new Error('no webgpu adapter')
const device = await adapter.requestDevice()
console.log('device acquired')
const configured = []
FakeContext.prototype.configure = function (cfg) {
  this._cfg = cfg
  this.device = cfg.device
  configured.push(this)
}
// The engine likely calls canvas.getContext('webgpu'); provide it:
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

// --- companion --------------------------------------------------------------
const companionSrc = await (await fetch('file:///workspace/repos/noisemaker-for-hydra/public/_engine/hydra-synth.js')).text()
;(0, eval)(companionSrc)
await window.HydraEffects.loadHydraEffects({ engine: mod })
console.log('companion registered; namespaces now include hydra')
const { attachHydraWgslShaders, attachHydraWgslCompile } = await import('file:///workspace/repos/noisemaker-for-hydra/src/lib/hydra-wgsl.mjs')
const attached = attachHydraWgslShaders(mod)
const compileHooked = attachHydraWgslCompile(mod)
console.log('wgsl attached to', attached, 'hydra definitions; compile hook:', compileHooked)

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
const ids = Object.keys(renderer.manifest || {})
console.log('manifest effects:', ids.length)
await renderer.loadEffects(ids)
renderer.start()
renderer.stop()
const backend = renderer.pipeline && renderer.pipeline.backend
console.log('backend:', renderer.backend, 'pipeline backend:', backend && backend.constructor && backend.constructor.name)
try {
  await renderer.compile('search hydra\nsolid(r: 1, g: 0, b: 0).write(o0)\nrender(o0)')
  renderer.syncTime(0)
  renderer.render(0)
  const pipeline = renderer.pipeline
  const surface = pipeline.surfaces.get('o0')
  const px = await pipeline.backend.readPixels(surface.read)
  const d = Array.from(px.data ?? px)
  console.log('solid OK len=' + d.length, 'head=' + d.slice(0, 16).join(','))
} catch (err) {
  console.log('solid FAIL:', JSON.stringify({ code: err.code, detail: err.detail, message: err.message, program: err.program }).slice(0, 600))
}
