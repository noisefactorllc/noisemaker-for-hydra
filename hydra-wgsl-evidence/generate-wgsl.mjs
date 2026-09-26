// Node: load engine + companion + tracked attach, dump WGSL programs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ENGINE = '/state/cache/scratch/gap4/core.js' // pinned 1.0.182 bundle (sha-verified)
const COMPANION = '/workspace/repos/noisemaker-for-hydra/public/_engine/hydra-synth.js'


// minimal DOM shims the engine module expects at import time
const registry = new Map()
globalThis.HTMLElement = class HTMLElement {}
globalThis.customElements = { define (n, c) { registry.set(n, c) }, get: n => registry.get(n), has: n => registry.has(n) }
globalThis.window = globalThis
globalThis.document = { createElement: () => ({ style: {}, setAttribute () {}, addEventListener () {} }), getElementById: () => null, addEventListener () {} }
try { globalThis.navigator = globalThis.navigator || {} } catch (_) {}
const engine = await import('file://' + ENGINE)
const src = readFileSync(COMPANION, 'utf8')
;(0, eval)(src)
const HydraEffects = globalThis.HydraEffects
if (!HydraEffects) throw new Error('companion did not register global HydraEffects')
await HydraEffects.loadHydraEffects({ engine })

const { attachHydraWgslShaders, buildWgslProgram } = await import('/workspace/repos/noisemaker-for-hydra/src/lib/hydra-wgsl.mjs')

const defs = []
for (const [key, def] of engine.getAllEffects()) {
  if (def && def.tags && def.tags[0] && ['src', 'coord', 'color', 'combine', 'combineCoord'].includes(def.tags[0])) {
    if (key.startsWith('hydra/')) defs.push([key, def])
  }
}
console.log('hydra defs:', defs.length)
const n = attachHydraWgslShaders(engine)
console.log('attached:', n)

mkdirSync('/state/cache/scratch/gap4/wgsl', { recursive: true })
for (const [key, def] of defs) {
  const prog = def.shaders[def.func].wgsl
  writeFileSync(`/state/cache/scratch/gap4/wgsl/${def.func}.wgsl`, prog)
}
console.log('written to /state/cache/scratch/gap4/wgsl')
console.log('--- sample solid ---')
console.log(defs.find(([k]) => k === 'hydra/solid')[1].shaders.solid.wgsl)
