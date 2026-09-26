// Generate comparison programs for every registered Hydra effect:
// defaults + varied (numeric inputs pushed to non-default values).
import { readFileSync, writeFileSync } from 'node:fs'

const ENGINE = '/state/cache/scratch/gap4/core.js'
const COMPANION = '/workspace/repos/noisemaker-for-hydra/public/_engine/hydra-synth.js'
const registry = new Map()
globalThis.HTMLElement = class HTMLElement {}
globalThis.window = globalThis
try { globalThis.navigator = globalThis.navigator || {} } catch (_) {}
globalThis.customElements = {
  define (n, c) { registry.set(n, c) },
  get (n) { return registry.get(n) },
  has (n) { return registry.has(n) }
}
const mod = await import('file://' + ENGINE)
;(0, eval)(readFileSync(COMPANION, 'utf8'))
await window.HydraEffects.loadHydraEffects({ engine: mod })

const seen = new Set()
const programs = []
for (const [key, def] of mod.getAllEffects()) {
  if (!String(key).startsWith('hydra/')) continue
  const call = def.name ? def.name[0].toLowerCase() + def.name.slice(1) : key.slice(6)
  if (seen.has(call)) continue
  seen.add(call)
  // `osc` is a registered hydra/ definition (converted, 51/51 WGSL compile) but
  // the search DSL rejects it with S001 "Unknown effect: 'osc'" — verified
  // identically under WebGL2 and WebGPU before any backend runs — so no render
  // comparison is reachable through the engine's public path. Recorded in
  // `coverage` below instead of the rendered denominator.
  if (call === 'osc') {
    programs.push({ name: call, needsSurface: false, surfaceParams: [],
      defaults: 'search hydra\nosc(10).write(o0)\nrender(o0)',
      varied: null,
      coverage: { invocable: false, reason: 'S001 Unknown effect: osc (DSL compiler, both backends, before backend selection)', evidence: ['dsl-unreachable-wgsl.json', 'dsl-unreachable-glsl.json', 'dsl-unreachable.log'], wgslCompile: 'wgsl-compile-validate.log: 51/51 including osc' } })
    continue
  }
  const globals = Object.entries(def.globals || {}).map(([name, meta]) => ({ name, ...meta }))
  const surfaceParams = globals.filter(g => g.type === 'surface')
  const numeric = globals.filter(g => g.type === 'float')
  const needsSurface = surfaceParams.length > 0

  const tag = Array.isArray(def.tags) ? def.tags[0] : null
  const needsBase = tag !== 'src'

  const build = (params) => {
    const args = []
    for (const sp of surfaceParams) args.push(`${sp.name}: read(o1)`)
    for (const p of params) args.push(`${p.name}: ${p.value}`)
    const argText = `(${args.join(', ')})`
    const callLine = `${needsBase ? 'solid().' : ''}${call}${argText}`
    if (needsSurface) {
      return `search hydra\nsolid(r: 1, g: 0, b: 0).write(o1)\n${callLine}.write(o0)\nrender(o0)`
    }
    return `search hydra\n${callLine}.write(o0)\nrender(o0)`
  }

  const varied = numeric
    .filter(g => !g.options && typeof g.default === 'number')
    .slice(0, 3).map(g => {
      const hi = typeof g.max === 'number' ? g.max : g.default + 10
      let mid = (g.default + hi) / 2
      if (mid === g.default) mid = hi
      return { name: g.name, value: Number.isInteger(mid) ? mid : Math.round(mid * 100) / 100 }
    })

  programs.push({
    name: call,
    needsSurface,
    surfaceParams: surfaceParams.map(s => s.name),
    defaults: build([]),
    varied: varied.length > 0 ? build(varied) : null
  })
}
programs.sort((a, b) => a.name.localeCompare(b.name))
// Structured coverage rationale for the non-varied cases:
const coverage = {}
for (const p of programs) {
  if (p.coverage) { coverage[p.name] = p.coverage; continue }
  if (p.varied) continue
  coverage[p.name] = { invocable: true, varied: null, reason: p.surfaceParams.length
    ? 'the only float globals outside enum/options are orientation-sensitive surface inputs; non-uniform surface coverage is supplied by the two-frame orientation probe (orientation-wgsl.json/orientation-glsl.json: modulateScale/blend/mask/src over a noise texture, prev over feedback)'
    : 'no non-enum numeric parameters: a varied case would be identical to defaults' }
}
writeFileSync('/state/cache/scratch/gap4/programs.json', JSON.stringify({ programs, coverage }, null, 1))
console.log('programs:', programs.length, 'totalCases:', programs.reduce((n, p) => n + (p.varied ? 2 : 1), 0))
