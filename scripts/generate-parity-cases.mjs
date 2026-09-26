#!/usr/bin/env node
/**
 * Generate the GAP-001 rendered-parity case matrix from the pinned upstream
 * noisemaker commit's shaders/effects definitions.
 *
 * Usage: node scripts/generate-parity-cases.mjs /path/to/noisemaker-checkout
 *
 * The upstream checkout must be at commit
 * 2f47612c29045c1b91af94887a8ff20106e980ef (published authority 1.0.182).
 * Writes test/fixtures/parity-cases.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const UPSTREAM_COMMIT = '2f47612c29045c1b91af94887a8ff20106e980ef'
const AUTHORITIES = {
  upstreamCommit: UPSTREAM_COMMIT,
  engineBundle: 'https://shaders.noisedeck.app/1.0.182/noisemaker-shaders-core.esm.min.js',
  // Pinned published identities (sha256 recorded when the matrix was minted;
  // the gate verifies these before executing any case).
  engineBundleSha256: 'e1a10dc9aa7c739b416ec546304326ad6f457eb3dc5d0ca2a601cee56b9d7f50',
  manifest: 'https://shaders.noisedeck.app/1.0.182/effects/manifest.json',
  manifestSha256: '05c4d7b7744837ae90a3bb4c89e5403ff09448a74d9d7e824abb3d719ad3314e',
  rollingCore: 'https://shaders.noisedeck.app/1/noisemaker-shaders-core.esm.min.js',
  companion: '/_engine/hydra-synth.js',
  companionSha256: '5f04f7a43509cf6bb9629ee278b03314d55f734a06b8fd00ead37fa48a881ded'
}

const checkout = resolve(process.argv[2] || '')
if (!existsSync(join(checkout, 'shaders/effects'))) {
  console.error(`not a noisemaker checkout: ${checkout}`)
  process.exit(2)
}

const manifest = JSON.parse(readFileSync(join(checkout, 'shaders/effects/manifest.json'), 'utf8'))
const ids = Object.keys(manifest).sort()
if (ids.length !== 210) {
  console.error(`expected 210 manifest IDs, found ${ids.length}`)
  process.exit(2)
}

// Deterministic varied value for a global. Choice-valued globals pick the
// first non-default choice NAME (emitted as a bare DSL identifier, since
// choice params are numeric enums). Numeric globals take min + 0.77 * range.
// String/text/asset params keep their defaults.
function variedValue (g) {
  if (g.choices && typeof g.choices === 'object') {
    // null-valued keys are UI group headers ("Shapes:", "Misc:"), not
    // selectable choices; exclude them or the DSL source gets a bare
    // group-header name that the parser rejects.
    const entries = Object.entries(g.choices).filter(([, v]) => v !== null && v !== undefined)
    if (!entries.length) return undefined
    entries.sort((a, b) => a[1] - b[1])
    const defaultName = entries.find(([name]) => name === g.default)
    const base = defaultName ? defaultName[0] : entries[0][0]
    const pick = entries.find(([name]) => name !== base)
    return pick ? pick[0] : undefined
  }
  const t = g.type
  if (t === 'boolean' || t === 'bool') return !g.default
  if (t === 'string' || t === 'asset' || t === 'text') return undefined
  if (t === 'int' && typeof g.min === 'number' && typeof g.max === 'number' && g.max > g.min) {
    return Math.min(g.max, Math.max(g.min, Math.round(g.min + 0.77 * (g.max - g.min))))
  }
  if (typeof g.min === 'number' && typeof g.max === 'number' && g.max > g.min) {
    const v = g.min + 0.77 * (g.max - g.min)
    return Math.round(v * 1e6) / 1e6
  }
  if ((t === 'int' || t === 'float') && typeof g.default === 'number') return g.default
  return undefined
}

function formatKwarg (name, value, g) {
  const isBare = typeof value === 'number' || typeof value === 'boolean' || (g && g.choices && typeof value === 'string')
  return isBare ? `${name}: ${value}` : `${name}: ${JSON.stringify(value)}`
}

const cases = []
const skipped = []
for (const id of ids) {
  const [ns, name] = id.split('/')
  const defPath = join(checkout, 'shaders/effects', ns, name, 'definition.js')
  if (!existsSync(defPath)) { skipped.push({ id, reason: 'definition.js missing' }); continue }
  let raw
  try {
    raw = (await import(pathToFileURL(defPath).href)).default
  } catch (err) { skipped.push({ id, reason: `definition import failed: ${err.message}` }); continue }
  const def = typeof raw === 'function' ? new raw() : raw

  const func = def.func || Object.keys(manifest[id].glsl || {})[0]
  if (!func) { skipped.push({ id, reason: 'no invocable effect name' }); continue }

  const globals = def.globals || {}
  const surfaceParams = Object.entries(globals)
    .filter(([, g]) => g.type === 'surface')
    .map(([name, g]) => ({ name, default: g.default }))
  const paramsB = []
  const definesB = []
  for (const [gname, g] of Object.entries(globals)) {
    if (g.type === 'surface') continue
    const v = variedValue(g)
    if (v === undefined) continue
    const entry = { name: gname, value: v }
    // Define-backed globals are ordinary DSL kwargs too: the engine re-bakes
    // the define at program compile time. They MUST stay in paramsB so the
    // varied caseB source actually exercises them; definesB records which
    // kwargs are define-backed for evidence.
    if (g.define) definesB.push({ ...entry, define: g.define })
    paramsB.push(entry)
  }
  const passes = def.passes || []
  const needsInput = Boolean(
    manifest[id].hasTex ||
    passes.some(p => Object.values(p.inputs || {}).some(v => v === 'inputTex')) ||
    passes.some(p => Object.values(p.inputs || {}).some(v => v === 'inputTex3d'))
  )
  const needs3d = passes.some(p => Object.values(p.inputs || {}).some(v => v === 'inputTex3d'))
  const isStarter = manifest[id].starter === true
  const chainSource = !isStarter && needsInput ? (needs3d ? 'noise3d()' : 'noise()') : ''
  const explicitTex = surfaceParams.filter(s => s.default !== 'inputTex').map(s => s.name)
  // The search line must resolve every effect invoked by either case: caseB
  // always emits a `noise()` feeder for its o1 surface, so synth must be
  // searched; synth3d is needed when the chain source is noise3d(). The
  // case's own namespace is searched first, so its own effects win, and it
  // is not duplicated.
  const searchNs = `search ${ns}` +
    (ns === 'synth' ? '' : ', synth') +
    (needs3d && ns !== 'synth3d' ? ', synth3d' : '')

  const kw = (params) => params.map(p => formatKwarg(p.name, p.value, globals[p.name])).join(', ')
  const body = (params, texBound) => {
    const texKwargs = texBound ? explicitTex.map(n => `${n}: read(o1)`) : []
    const prefix = chainSource ? chainSource + '.' : ''
    return `${prefix}${func}(${[kw(params), ...texKwargs].filter(Boolean).join(', ')}).write(o0)`
  }
  const sourceA = `${searchNs}\n${body([], false)}\nrender(o0)`
  const sourceB = `${searchNs}\nnoise(speed: 0).write(o1)\n${body(paramsB, true)}\nrender(o0)`

  cases.push({
    id,
    namespace: ns,
    name: def.name,
    func,
    isStarter,
    hasTex: Boolean(manifest[id].hasTex),
    needsSurface: Boolean(needsInput || explicitTex.length),
    tags: def.tags || [],
    caseA: { label: 'defaults', params: [], surfaceBindings: [], source: sourceA },
    caseB: {
      label: 'varied',
      params: paramsB,
      defines: definesB,
      surfaceBindings: explicitTex,
      source: sourceB
    }
  })
}

const doc = {
  generator: 'scripts/generate-parity-cases.mjs',
  upstreamCommit: UPSTREAM_COMMIT,
  generatedFrom: { manifest: ids.length, cases: cases.length, skipped },
  frames: {
    caseA: [0, 0.37, 0.74],
    caseB: [0, 0.37],
    sizeA: { width: 32, height: 24 },
    sizeC: { width: 24, height: 18, label: 'size-variant', params: [], times: [0] }
  },
  authorities: AUTHORITIES,
  cases
}
const outPath = join(process.cwd(), 'test/fixtures/parity-cases.json')
if (!existsSync(join(process.cwd(), 'test/fixtures'))) {
  console.error('run from the repository root')
  process.exit(2)
}
writeFileSync(outPath, JSON.stringify(doc, null, 1) + '\n')
const h = createHash('sha256').update(readFileSync(outPath)).digest('hex')
console.log(`wrote ${outPath} (${cases.length} cases, ${skipped.length} skipped) sha256=${h}`)