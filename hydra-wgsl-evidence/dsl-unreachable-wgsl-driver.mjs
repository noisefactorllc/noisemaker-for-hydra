// Orientation probe (Deno/wgpu): render non-uniform texture-consumers twice
// (t=0, t=0.5) to expose feedback/texture row-order differences vs WebGL2.
const CDN = 'https://shaders.noisedeck.app/1.0.182'
class FakeCanvas {
  constructor () { this.width = 300; this.height = 150; this.style = {} }
  getContext (kind) {
    if (kind === 'webgpu') {
      if (!this._webgpuCtx) {
        this._webgpuCtx = {
          canvas: this,
          configure () {},
          unconfigure () {},
          getCurrentTexture () { return { view: { label: 'v' }, destroy () {}, width: this.width, height: this.height } }
        }
      }
      return this._webgpuCtx
    }
    return { canvas: this }
  }
  addEventListener () {}
  removeEventListener () {}
  getBoundingClientRect () { return { left: 0, top: 0, width: this.width, height: this.height } }
}
globalThis.document = {
  createElement (tag) { return tag === 'canvas' ? new FakeCanvas() : { style: {}, set innerHTML (v) {}, get innerHTML () { return '' }, appendChild () {}, addEventListener () {}, removeEventListener () {}, setAttribute () {}, getBoundingClientRect () { return { left: 0, top: 0, width: 0, height: 0 } } } },
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
globalThis.customElements = { define (n, c) { registry.set(n, c) }, get (n) { return registry.get(n) }, has (n) { return registry.has(n) } }

const mod = await import(`${CDN}/noisemaker-shaders-core.esm.min.js`)
const gpu = navigator.gpu
const adapter = await gpu.requestAdapter()
if (!adapter) throw new Error('no webgpu adapter')
await adapter.requestDevice()
const companionSrc = await (await fetch('file:///workspace/repos/noisemaker-for-hydra/public/_engine/hydra-synth.js')).text()
;(0, eval)(companionSrc)
await window.HydraEffects.loadHydraEffects({ engine: mod })
const { attachHydraWgslShaders, attachHydraWgslCompile } = await import('file:///workspace/repos/noisemaker-for-hydra/src/lib/hydra-wgsl.mjs')
attachHydraWgslShaders(mod)
attachHydraWgslCompile(mod)
const origResolve = mod.WebGPUBackend.prototype.resolveWGSLSource
mod.WebGPUBackend.prototype.resolveWGSLSource = function (program) {
  try { return origResolve.call(this, program) } catch (err) {
    console.error('RESOLVE-FAIL keys', Object.keys(program), 'name', program.name)
    for (const [k, v] of Object.entries(program)) if (typeof v === 'string') console.error('KEY', k, v.slice(0, 3000))
    throw err
  }
}

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

const programs = JSON.parse(await (await fetch('file:///state/cache/scratch/gap4/programs-probe.json')).text())
const results = []
for (const prog of programs) {
  const item = { name: prog.name, case: 'defaults' }
  try {
    await renderer.compile(prog.defaults)
    const frames = []
    for (const t of [0, 0.5]) {
      renderer.syncTime(t)
      renderer.render(t)
      const pipeline = renderer.pipeline
      for (const name of ['o0', 'o1']) {
        const surface = pipeline.surfaces.get(name)
        if (!surface) continue
        const px = await pipeline.backend.readPixels(surface.read)
        frames.push({ name, data: Array.from(px.data ?? px).slice(0, 32 * 24 * 4) })
      }
    }
    item.surfaces = frames
  } catch (err) {
    item.error = JSON.stringify(Object.assign({ code: err.code, message: err.message }, err.diagnostics ? { diagnostics: JSON.stringify(err.diagnostics).slice(0, 1500) } : {}, err.source ? { source: String(err.source).slice(0, 1500) } : {})).slice(0, 3000)
  }
  results.push(item)
  console.log(prog.name, item.error ? 'ERR ' + item.error : 'ok')
}
await (await import('node:fs/promises')).writeFile('/state/cache/scratch/gap4/wgsl-osc.json', JSON.stringify(results))
console.log('done', results.length)
