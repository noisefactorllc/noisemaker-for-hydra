/**
 * WGSL (WebGPU) shader sources for the Hydra namespace.
 *
 * The Hydra-namespace effects registered by the companion bundle carry GLSL
 * sources only (`definition.shaders[name] = { glsl }`). Under the engine's
 * WGSL backend, `resolveWGSLSource(spec)` finds no `wgsl`/`source`/non-version
 * `fragment` key and throws ERR_NO_WGSL_SOURCE for every Hydra node program
 * (e.g. `node_0_solid`), so no Hydra program renders under WebGPU.
 *
 * This module derives a WGSL program for each registered Hydra effect
 * definition from the same GLSL program text the engine already stores in
 * `definition.shaders[name].glsl`: it extracts the effect's wrapper function
 * body and the inlined utility functions from that program and converts them
 * to WGSL with a converter restricted to the constructs the Hydra GLSL
 * corpus (40 executable effects plus the four inlined utility functions)
 * actually uses. attachHydraWgslShaders() mutates the registered definitions
 * in place: `definition.shaders[name].wgsl = program`, which is exactly the
 * key the engine's WGSL backend resolves. It is idempotent per definition.
 *
 * The generated WGSL mirrors the GLSL program statement-for-statement:
 * the same `_st` formula (`vec2(pos.x, pos.y) / resolution`),
 * the same uniform set (`resolution`, `time`, effect inputs), the same
 * texture sampling coordinates (including the GLSL template's explicit
 * `1.0 - y` flips), and the same wrapper-function naming (`_hydra_<name>`).
 * Bindings follow the engine's individual-binding convention (see upstream
 * filter/scale): a sampler, one texture per template sampler, then
 * `vec2<f32> resolution`, `f32 time`, and one uniform per effect input,
 * each as its own `@group(0) @binding(N)` resource.
 */

const HYDRA_TYPES = ['src', 'coord', 'color', 'combine', 'combineCoord']

const LEADING_ARGS = {
  src: [{ type: 'vec2', name: '_st' }],
  coord: [{ type: 'vec2', name: '_st' }],
  color: [{ type: 'vec4', name: '_c0' }],
  combine: [{ type: 'vec4', name: '_c0' }, { type: 'vec4', name: '_c1' }],
  combineCoord: [{ type: 'vec2', name: '_st' }, { type: 'vec4', name: '_c0' }]
}

const WGSL_SCALARS = {
  f32: 'f32',
  float: 'f32',
  i32: 'i32',
  vec2: 'vec2<f32>',
  vec3: 'vec3<f32>',
  vec4: 'vec4<f32>'
}

const SWIZZLE_DIMS = { x: 0, y: 1, z: 2, w: 3, r: 0, g: 1, b: 2, a: 3 }

// Convert GLSL float literals to WGSL form: no leading-dot floats (`.5`),
// and a trailing bare dot (`10.`) gets a zero. The `(?![\d\w])` guard keeps
// `1.0` intact.
function normalizeFloatLiterals (src) {
  return src
    .replace(/(^|[^\w.])\.(\d)/g, '$10.$2')
    .replace(/(\d)\.(?![\d\w])/g, '$1.0')
}

function splitTopLevel (src, sep = ',') {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of src) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === sep && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim() !== '') parts.push(current)
  return parts.map(p => p.trim()).filter(p => p !== '')
}

// Scan the normalized GLSL source for identifier types: declarations
// (`vecN NAME = ...` / `float NAME = ...` / `vecN NAME;`), function
// parameters, and for-loop counters. This map drives the swizzle rewrites,
// which need the base vector size of each swizzled identifier. `seeds`
// pre-types identifiers that are not declared in the converted fragment
// (uniforms visible to a fused program, wrapper inputs of a per-effect
// program); declarations in the fragment itself shadow them.
function scanTypes (src, seeds) {
  const types = new Map(seeds)
  const asType = g => (g === 'float' ? 'float' : g)
  for (const m of src.matchAll(/\b(?:const\s+)?(?:vec([234])|float)\s+([\w]+)\s*(=|;)/g)) {
    types.set(m[2], m[1] ? `vec${m[1]}` : 'float')
  }
  for (const m of src.matchAll(/\b(?:vec[234]|float)\s+[\w]+\s*\(([^)]*)\)\s*\{/g)) {
    for (const arg of splitTopLevel(m[1])) {
      const p = arg.match(/^(vec[234]|float)\s+([\w]+)\s*$/)
      if (p) types.set(p[2], asType(p[1]))
    }
  }
  for (const m of src.matchAll(/for\s*\(\s*int\s+([\w]+)/g)) {
    types.set(m[1], 'i32')
  }
  return types
}

function analyzeSwizzle (swizzle, baseDim) {
  if (!/^[xyzwrgba]+$/.test(swizzle)) return null
  const comps = [...swizzle]
  const dims = comps.map(c => SWIZZLE_DIMS[c])
  if (dims.some(d => d >= baseDim) || new Set(comps).size !== comps.length) {
    return comps
  }
  return 'ok'
}

/**
 * Convert a GLSL source fragment (Hydra wrapper body or utility function
 * group) to WGSL. Handles exactly the constructs used by the Hydra GLSL
 * corpus: scalar/vector declarations and assignments, if/else, for loops
 * with int counters, function definitions, vecN constructors, component
 * swizzles (including repeated/over-length forms), mat2, atan(y,x), mod(),
 * texture2D(), and the common builtins with WGSL-identical names.
 */
export function glslToWgsl (glsl, { indent = '', seedTypes = [] } = {}) {
  const normalized = normalizeFloatLiterals(glsl)
  const types = scanTypes(normalized, seedTypes)

  let src = normalized

  // --- textual rewrites ---------------------------------------------------
  src = src.replace(/\batan\s*\(/g, 'atan2(')
  src = src.replace(/\bmod\s*\(/g, 'mod_f(')
  src = src.replace(/\bmat2\s*\(/g, 'mat2x2<f32>(')
  src = src.replace(/\bvec2\s*\(/g, 'vec2<f32>(')
  src = src.replace(/\bvec3\s*\(/g, 'vec3<f32>(')
  src = src.replace(/\bvec4\s*\(/g, 'vec4<f32>(')
  src = src.replace(/\bfloat\s*\(/g, 'f32(')
  src = src.replace(/\bint\s*\(/g, 'i32(')
  // texture2D(name, expr) / texture(name, expr) -> textureSample(name, samp, expr)
  // with a y-flip: a WGSL texture fetch at v reads the row a GLSL fetch reads
  // at 1 - v (the backend texture row orders are mirrored), and effect bodies
  // sample with raw GLSL semantics (unlike the entry-point templates, whose
  // GLSL coordinates are pre-flipped by the companion's templates).
  src = rewriteCalls(src, 'texture2D', (inner) => {
    const parts = splitTopLevel(inner)
    const coord = parts.slice(1).join(', ')
    return `textureSample(${parts[0]}, samp, vec2<f32>(${coord}.x, 1.0 - ${coord}.y))`
  })
  src = rewriteCalls(src, 'texture', (inner) => {
    const parts = splitTopLevel(inner)
    const coord = parts.slice(1).join(', ')
    return `textureSample(${parts[0]}, samp, vec2<f32>(${coord}.x, 1.0 - ${coord}.y))`
  })

  // --- function signatures ------------------------------------------------
  const wgslType = g => WGSL_SCALARS[g] || g
  src = src.replace(/\b(vec[234]|float)\s+(_?[\w]+)\s*\(([^)]*)\)\s*\{/g, (m0, ret, name, args) => {
    const converted = splitTopLevel(args).map(a => {
      const am = a.match(/^(vec[234]|float)\s+([\w]+)\s*$/)
      if (!am) throw new Error(`hydra-wgsl: unsupported parameter '${a.trim()}'`)
      return `${am[2]}: ${wgslType(am[1])}`
    }).join(', ')
    return `fn ${name}(${converted}) -> ${wgslType(ret)} {`
  })

  // --- for loops with int counters ---------------------------------------
  src = src.replace(/for\s*\(\s*int\s+(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*(\w+)\s*\+\+\s*\)/g,
    'for (var $1 = $2; $3; $1++)')

  // --- declarations -------------------------------------------------------
  // `const vecN NAME = expr;` -> `let NAME = expr;` (immutable in WGSL)
  src = src.replace(/\bconst\s+vec[234]\s+([\w]+)\s*=/g, 'let $1 =')
  // `vecN NAME = expr;` / `float NAME = expr;` -> `var NAME = expr;`
  src = src.replace(/\b(?:vec[234]|float)\s+([\w]+)\s*=\s*/g, 'var $1 = ')
  // `vecN NAME;` -> `var NAME: vecN<f32>;`
  src = src.replace(/\bvec([234])\s+([\w]+)\s*;/g, (m0, n, name) => `var ${name}: vec${n}<f32>;`)

  // --- mod() helpers -------------------------------------------------------
  src = renameModCalls(src, types)
  // --- mixed scalar/vector builtins ----------------------------------------
  src = broadcastScalarArgs(src, types)

  // --- swizzle legality ---------------------------------------------------
  // WGSL swizzles must not repeat components or exceed the base vector size;
  // rewrite such swizzles (e.g. `C.yyy` on a vec2, `sh.xxyy`) as constructor
  // calls using the type map from the original GLSL.
  let changed = true
  let guard = 0
  while (changed && guard++ < 10) {
    changed = false
    src = src.replace(/([A-Za-z_]\w*)\.([xyzwrgba]+)(?![\w])/g, (m0, ident, swz) => {
      if (!types.has(ident)) return m0
      const base = types.get(ident)
      if (base === 'float' || base === 'i32' || base === 'f32') return m0
      const baseDim = Number(base.slice(3))
      const comps = analyzeSwizzle(swz, baseDim)
      if (comps === 'ok' || comps === null) return m0
      changed = true
      return `vec${comps.length}<f32>(${comps.map(c => `${ident}.${c}`).join(', ')})`
    })
  }

  // --- step() scalar broadcast ---------------------------------------------
  // WGSL has no implicit scalar->vector broadcast for step(edge, x): rewrite
  // `step(LITERAL, vecVar)` to `step(vecN<f32>(LITERAL), vecVar)` using the
  // type map. (Corpus case: `step(0.0, c)`.)
  src = src.replace(/\bstep\(\s*([-.\d]+)\s*,\s*([A-Za-z_]\w*)\s*\)/g, (m0, lit, id) => {
    const t = types.get(id)
    if (!t || t === 'float' || t === 'f32' || t === 'i32') return m0
    return `step(${t}<f32>(${lit}), ${id})`
  })

  if (indent) {
    src = src.split('\n').map(l => l.trim() === '' ? '' : indent + l.trim()).join('\n')
  }
  return src.trim()
}

// Split a GLSL chunk containing several top-level function definitions into
// per-function blocks (with any preceding comments attached to the following
// function) so each block gets its own identifier type map — GLSL function
// scopes are independent (e.g. `p` is vec4 in _rgbToHsv but vec3 in
// _hsvToRgb), which a whole-chunk map cannot represent.
export function splitGlslFunctions (chunk) {
  const blocks = []
  let pending = ''
  let i = 0
  while (i < chunk.length) {
    const brace = chunk.indexOf('{', i)
    if (brace < 0) { pending += chunk.slice(i); break }
    let depth = 0
    let j = brace
    for (; j < chunk.length; j++) {
      if (chunk[j] === '{') depth++
      else if (chunk[j] === '}') { depth--; if (depth === 0) { j++; break } }
    }
    blocks.push(pending + chunk.slice(i, j))
    pending = ''
    i = j
  }
  return blocks.map(b => b.trim()).filter(b => b !== '')
}

// Balanced-paren call rewriter: rewrite `name(arg1, arg2)` occurrences whose
// first argument is an identifier, passing all top-level arguments to `fn`.
function rewriteCalls (src, name, fn) {
  let out = ''
  let i = 0
  const token = name + '('
  while (true) {
    const idx = src.indexOf(token, i)
    if (idx < 0) { out += src.slice(i); break }
    if (idx > 0 && /[\w$]/.test(src[idx - 1])) { out += src.slice(i, idx + token.length); i = idx + token.length; continue }
    let depth = 1
    let j = idx + token.length
    while (j < src.length && depth > 0) {
      const c = src[j]
      if (c === '(') depth++
      else if (c === ')') depth--
      j++
    }
    if (depth !== 0) { out += src.slice(i); break }
    const inner = src.slice(idx + token.length, j - 1)
    out += src.slice(i, idx) + fn(inner, inner)
    i = j
  }
  return out
}

// wgpu/naga rejects overloaded user functions, so GLSL mod() calls are
// renamed per call site to a type-specific helper (mod_f / mod_fv2..4 /
// mod_fv2v..4v) based on the promoted types of both arguments.
function typeOfExpr (expr, types) {
  const e = expr.trim()
  // strip wrapping parens
  let cur = e
  while (cur.startsWith('(') && cur.endsWith(')')) {
    // only strip when the parens wrap the whole expression
    let depth = 0
    let wraps = true
    for (let i = 0; i < cur.length; i++) {
      if (cur[i] === '(') depth++
      else if (cur[i] === ')') { depth--; if (depth === 0 && i !== cur.length - 1) { wraps = false; break } }
    }
    if (wraps && depth === 0) cur = cur.slice(1, -1).trim()
    else break
  }
  // single-component swizzle -> scalar
  const swz = cur.match(/^([A-Za-z_]\w*)\.([xyzwrgba])$/)
  if (swz) return 'f32'
  // multi-component swizzle -> vector of that length
  const swzN = cur.match(/^([A-Za-z_]\w*)\.([xyzwrgba]{2,})$/)
  if (swzN) return `vec${swzN[2].length}`
  const id = cur.match(/^([A-Za-z_]\w*)$/)
  if (id) {
    const t = types.get(id[1])
    return t === 'float' || t === 'i32' ? 'f32' : t
  }
  // general expression: promote to the widest vector type of its identifiers
  // and vecN constructors
  let best = 'f32'
  for (const m of cur.matchAll(/vec([234])<f32>\s*\(/g)) {
    best = widest(best, `vec${m[1]}`)
  }
  for (const m of cur.matchAll(/([A-Za-z_]\w*)(?:\.([xyzwrgba]+))?/g)) {
    const t = types.get(m[1])
    if (!t || t === 'i32' || t === 'float') {
      if (m[2] && m[2].length > 1) best = widest(best, `vec${m[2].length}`)
      continue
    }
    const dim = m[2] ? (m[2].length === 1 ? 'f32' : `vec${m[2].length}`) : t
    best = widest(best, dim)
  }
  return best
}

function widest (a, b) {
  const rank = t => t === 'f32' ? 0 : Number(t.slice(3))
  if (a === undefined) return b
  return rank(a) >= rank(b) ? a : b
}

function renameModCalls (src, types) {
  let out = ''
  let i = 0
  while (true) {
    const idx = src.indexOf('mod_f(', i)
    if (idx < 0) { out += src.slice(i); break }
    out += src.slice(i, idx)
    // balanced-paren scan
    let depth = 0
    let j = idx + 'mod_f'.length
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++
      else if (src[j] === ')') { depth--; if (depth === 0) { j++; break } }
    }
    const argsText = src.slice(idx + 'mod_f('.length, j - 1)
    const args = splitTopLevel(argsText)
    const t = typeOfExpr(args[0] || '', types)
    const tY = typeOfExpr(args[1] || '', types)
    // GLSL `mod(genType, genType)` keeps the vector width of the first
    // argument; a vector second argument selects the v-suffixed helper (a
    // scalar-y helper called with a vector y would be ill-typed WGSL).
    const width = /^vec([234])$/.exec(t)
    const name = width && tY === t
      ? `mod_fv${width[1]}v`
      : t === 'vec2' ? 'mod_fv2' : t === 'vec3' ? 'mod_fv3' : t === 'vec4' ? 'mod_fv4' : 'mod_f'
    out += `${name}(${argsText})`
    i = j
  }
  return out
}

// wgpu/naga rejects mixed scalar/vector arguments for clamp/min/max: wrap
// scalar-literal arguments in the promoted vector type of the other arguments.
// (Corpus cases: `clamp(p - K.xxx, 0.0, 1.0)`, `max(vec4(...), 0.0)`.)
function broadcastScalarArgs (src, types, names = ['clamp', 'min', 'max']) {
  let out = src
  for (const name of names) {
    let result = ''
    let i = 0
    const token = name + '('
    while (true) {
      const idx = out.indexOf(token, i)
      if (idx < 0 || (idx > 0 && /[\w]/.test(out[idx - 1]))) {
        // not a bare identifier match (e.g. `sclamp(`) — advance carefully
        if (idx < 0) { result += out.slice(i); break }
        result += out.slice(i, idx + token.length)
        i = idx + token.length
        continue
      }
      result += out.slice(i, idx)
      let depth = 0
      let j = idx + name.length
      for (; j < out.length; j++) {
        if (out[j] === '(') depth++
        else if (out[j] === ')') { depth--; if (depth === 0) { j++; break } }
      }
      const argsText = out.slice(idx + token.length, j - 1)
      const args = splitTopLevel(argsText)
      const argTypes = args.map(a => typeOfExpr(a, types))
      const vecT = argTypes.find(t => t && t.startsWith('vec'))
      const newArgs = args.map((a, k) => {
        const isScalarLit = /^[-.\d]/.test(a.trim()) && /^[-.\d.eE+]+$/.test(a.trim())
        return isScalarLit && vecT ? `${vecT}<f32>(${a.trim()})` : a
      })
      result += `${name}(${newArgs.join(', ')})`
      i = j
    }
    out = result
  }
  return out
}

// Shared WGSL prelude: GLSL mod() semantics (x - y*floor(x/y), sign of y).
const MOD_HELPERS = `fn mod_f(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}
fn mod_fv2(x: vec2<f32>, y: f32) -> vec2<f32> {
  return x - vec2<f32>(y) * floor(x / vec2<f32>(y));
}
fn mod_fv3(x: vec3<f32>, y: f32) -> vec3<f32> {
  return x - vec3<f32>(y) * floor(x / vec3<f32>(y));
}
fn mod_fv4(x: vec4<f32>, y: f32) -> vec4<f32> {
  return x - vec4<f32>(y) * floor(x / vec4<f32>(y));
}
fn mod_fv2v(x: vec2<f32>, y: vec2<f32>) -> vec2<f32> {
  return x - y * floor(x / y);
}
fn mod_fv3v(x: vec3<f32>, y: vec3<f32>) -> vec3<f32> {
  return x - y * floor(x / y);
}
fn mod_fv4v(x: vec4<f32>, y: vec4<f32>) -> vec4<f32> {
  return x - y * floor(x / y);
}`

/**
 * Extract the wrapper function body and the inlined utility-function source
 * from a generated Hydra GLSL program (the format the companion's
 * buildShader emits: header, uniforms, `out vec4 fragColor;`, utilities,
 * wrapper function, template main).
 */
export function extractGlslParts (program, wrapperName) {
  const anchor = program.indexOf('out vec4 fragColor;')
  if (anchor < 0) throw new Error('hydra-wgsl: GLSL program is missing `out vec4 fragColor;`')
  const afterAnchor = program.indexOf('\n', anchor)
  const wrapperMatch = program.slice(afterAnchor).match(new RegExp(`\\n(?:float|vec[234])\\s+_hydra_${wrapperName}\\s*\\(`))
  if (!wrapperMatch) throw new Error(`hydra-wgsl: wrapper _hydra_${wrapperName} not found in GLSL program`)
  const wrapperStart = afterAnchor + wrapperMatch.index
  const utilities = program.slice(afterAnchor + 1, wrapperStart).trim()
  // brace-match the wrapper body
  const bodyStart = program.indexOf('{', wrapperStart)
  let depth = 0
  let i = bodyStart
  for (; i < program.length; i++) {
    if (program[i] === '{') depth++
    else if (program[i] === '}') { depth--; if (depth === 0) break }
  }
  if (depth !== 0) throw new Error(`hydra-wgsl: unbalanced wrapper braces for _hydra_${wrapperName}`)
  const body = program.slice(bodyStart + 1, i)
  return { body, utilities }
}

/**
 * Build the WGSL program for one Hydra effect definition.
 * @param {object} def - registered Hydra effect definition (Effect instance)
 * @returns {string} WGSL source with @fragment entry point `main`
 */
export function buildWgslProgram (def) {
  const type = def.tags && def.tags[0]
  const name = def.func
  if (!HYDRA_TYPES.includes(type)) {
    throw new Error(`hydra-wgsl: effect '${name}' has unknown type '${type}'`)
  }
  const glslProgram = (def.shaders && (def.shaders[name] && def.shaders[name].glsl)) ||
    Object.values(def.shaders || {})[0]?.glsl
  if (!glslProgram) throw new Error(`hydra-wgsl: no GLSL program stored for '${name}'`)
  const { body, utilities } = extractGlslParts(glslProgram, name)

  // Wrapper inputs (non-surface globals) and sampler inputs, in declaration
  // order — derived from the same globals the GLSL builder used.
  const wrapperInputs = []
  const samplerInputs = []
  for (const [gname, spec] of Object.entries(def.globals || {})) {
    if (spec.type === 'surface') {
      samplerInputs.push({ name: gname, samplerName: samplerInputs.length === 0 ? 'tex' : 'tex2' })
    } else {
      wrapperInputs.push({ name: gname, type: spec.type })
    }
  }
  const needsInputTex = type !== 'src'

  // --- bindings ------------------------------------------------------------
  const lines = []
  let binding = 0
  lines.push(`@group(0) @binding(${binding++}) var samp: sampler;`)
  if (needsInputTex) lines.push(`@group(0) @binding(${binding++}) var inputTex: texture_2d<f32>;`)
  for (const s of samplerInputs) lines.push(`@group(0) @binding(${binding++}) var ${s.samplerName}: texture_2d<f32>;`)
  // `prev` samples the feedback surface (`prevBuffer` in the GLSL header);
  // declare its binding only when the wrapper body actually references it,
  // mirroring the template sampler lines of the GLSL program.
  if (/\btexture(?:2D)?\s*\(\s*prevBuffer\b/.test(body)) {
    lines.push(`@group(0) @binding(${binding++}) var prevBuffer: texture_2d<f32>;`)
  }
  lines.push(`@group(0) @binding(${binding++}) var<uniform> resolution: vec2<f32>;`)
  lines.push(`@group(0) @binding(${binding++}) var<uniform> time: f32;`)
  for (const input of wrapperInputs) {
    const t = WGSL_SCALARS[input.type] || 'f32'
    lines.push(`@group(0) @binding(${binding++}) var<uniform> ${input.name}: ${t};`)
  }

  // --- wrapper function ----------------------------------------------------
  const usedUtils = utilities ? splitGlslFunctions(utilities) : []
  const utilitiesWgsl = usedUtils.map(u => glslToWgsl(u)).join('\n\n')
  // The wrapper body is converted without its signature, so its parameters
  // are invisible to the type scan; seed the leading template arguments
  // (_st/_c0/_c1) and the wrapper inputs (uniform-backed GLSL parameters) so
  // mod() helper selection and swizzle legality see their types.
  const leading = LEADING_ARGS[type]
  const bodyWgsl = glslToWgsl(body, {
    indent: '  ',
    seedTypes: leading.concat(wrapperInputs).map(input => [input.name, input.type])
  })

  const retType = (type === 'coord' || type === 'combineCoord') ? 'vec2<f32>' : 'vec4<f32>'
  const allArgs = leading.concat(wrapperInputs)
  const fnName = `_hydra_${name}`
  // WGSL function parameters are immutable (GLSL parameters are mutable
  // copies), so leading template arguments are passed as `in_*` parameters
  // and re-bound to local `var`s the body may mutate (e.g. scroll/repeat
  // mutate `_st`).
  const signature = `fn ${fnName}(${allArgs.map(a => a.name.startsWith('_')
    ? `in_${a.name.slice(1)}: ${WGSL_SCALARS[a.type] || 'f32'}`
    : `${a.name}: ${WGSL_SCALARS[a.type] || 'f32'}`).join(', ')}) -> ${retType} {`
  const paramCopies = leading
    .map(a => `  var ${a.name} = in_${a.name.slice(1)};`)
    .join('\n')
  const callArgs = wrapperInputs.length > 0 ? ', ' + wrapperInputs.map(i => i.name).join(', ') : ''

  // --- entry point ---------------------------------------------------------
  const sample = (tex) => `textureSample(${tex}, samp, _st)`
  const stLine = '  let _st = vec2<f32>(pos.x, pos.y) / resolution;'
  const templateByType = {
    src: () => `${stLine}
  return ${fnName}(_st${callArgs});`,
    coord: () => `${stLine}
  let newUV = ${fnName}(_st${callArgs});
  return textureSample(inputTex, samp, newUV);`,
    color: () => `${stLine}
  let _c0 = ${sample('inputTex')};
  return ${fnName}(_c0${callArgs});`,
    combine: () => `${stLine}
  let _c0 = ${sample('inputTex')};
  let _c1 = ${sample(samplerInputs[0].samplerName)};
  return ${fnName}(_c0, _c1${callArgs});`,
    combineCoord: () => `${stLine}
  let _c0 = ${sample(samplerInputs[0].samplerName)};
  let newUV = ${fnName}(_st, _c0${callArgs});
  return textureSample(inputTex, samp, newUV);`
  }
  const template = templateByType[type]()

  const parts = [lines.join('\n'), '', MOD_HELPERS]
  if (utilitiesWgsl) parts.push('', utilitiesWgsl)
  parts.push('', signature, paramCopies, bodyWgsl, '}')
  parts.push('', '@fragment', 'fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {', template, '}')
  return parts.join('\n')
}

const attached = new WeakSet()
export function attachHydraWgslShaders (engine) {
  if (!engine || typeof engine.getAllEffects !== 'function') return 0
  let count = 0
  for (const [key, def] of engine.getAllEffects()) {
    // Only Hydra-namespace registrations (canonical `hydra/<name>` keys);
    // the same definition is registered under several aliases, so dedupe.
    if (!def || !String(key).startsWith('hydra/')) continue
    if (attached.has(def)) continue
    if (!def.shaders) continue
    const type = def.tags && def.tags[0]
    if (!HYDRA_TYPES.includes(type)) continue
    let program
    try {
      program = buildWgslProgram(def)
    } catch (err) {
      // Skip only the offending definition (the WGSL backend then reports its
      // own ERR_NO_WGSL_SOURCE for it, which parity evidence preserves); the
      // rest of the Hydra corpus must keep working.
      console.warn(`[hydra-wgsl] no WGSL for ${key}: ${err && err.message}`)
      continue
    }
    for (const progName of Object.keys(def.shaders)) {
      def.shaders[progName].wgsl = program
    }
    attached.add(def)
    count++
  }
  return count
}

// Detect whether a function body mutates an identifier (plain, swizzle or
// compound assignment / increment), for the immutable-parameter copies.
function mutatesIdentifier (body, name) {
  const esc = name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')
  return new RegExp(`\\b${esc}(?:\\.[xyzwrgba]+)?\\s*(?:\\+\\+|--|[+\\-*/%]?=[^=])`).test(body)
}

// Re-bind mutated function parameters (WGSL parameters are immutable; GLSL
// parameters are mutable copies) by renaming them to `in_*` and prepending
// local `var` copies inside the converted function.
function applyImmutableParams (out, originalBlock, signatureRe) {
  const copies = []
  for (const am of signatureRe) {
    if (mutatesIdentifier(originalBlock, am[2])) {
      out = out.replace(new RegExp(`\\bfn\\s+[\\w]+\\s*\\(([^)]*)\\)`), m0 =>
        m0.replace(new RegExp(`\\b${am[2]}:`), `in_${am[2]}:`))
      copies.push(`  var ${am[2]} = in_${am[2]};`)
    }
  }
  if (copies.length > 0) {
    const open = out.indexOf('{')
    out = out.slice(0, open + 1) + '\n' + copies.join('\n') + out.slice(open + 1)
  }
  return out
}

/**
 * Convert a generated Hydra GLSL program (per-effect single-node program or
 * the companion's fused whole-chain program — both share the layout: header
 * with `uniform` declarations, utility functions, effect wrappers, chain
 * node functions, and a `void main()` entry that ends in `fragColor = ...;`)
 * to a WGSL program with an `@fragment main` entry point.
 *
 * Bindings follow the engine's individual-binding convention: one shared
 * sampler, one texture per declared sampler2D, then one uniform buffer per
 * declared uniform. Fused programs contain no texture sampling (unfusable
 * sources fall back to the per-definition programs).
 */
export function convertHydraGlslProgramToWgsl (program) {
  const anchor = program.indexOf('out vec4 fragColor;')
  if (anchor < 0) throw new Error('hydra-wgsl: program is missing `out vec4 fragColor;`')
  const header = program.slice(0, anchor)
  const bodyText = program.slice(anchor + 'out vec4 fragColor;'.length)

  const samplers = []
  const uniforms = []
  for (const m of header.matchAll(/\buniform\s+sampler2D\s+([\w]+)\s*;/g)) {
    samplers.push(m[1])
  }
  for (const m of header.matchAll(/\buniform\s+(vec[234]|float)\s+([\w]+)\s*;/g)) {
    uniforms.push({ name: m[2], type: m[1] })
  }

  const blocks = splitGlslFunctions(bodyText)
  const mainIdx = blocks.findIndex(b => /^void\s+main\s*\(/.test(b))
  if (mainIdx < 0) throw new Error('hydra-wgsl: program has no `void main()` entry')
  const fnBlocks = blocks.filter((b, i) => i !== mainIdx)
  const mainBlock = blocks[mainIdx]

  // Uniform declarations from the header are visible to every converted
  // fragment but declared outside it; seed the per-block type maps with them
  // so mod() helper selection and swizzle legality see their vector widths.
  const seedTypes = uniforms.map(u => [u.name, u.type])
  const converted = fnBlocks.map(block => {
    const signatureRe = [...block.matchAll(/(?:^|\n)\s*(?:vec[234]|float)\s+[\w]+\s*\(([^)]*)\)\s*\{/g)]
      .flatMap(pm => splitTopLevel(pm[1]))
      .map(a => a.match(/^(vec[234]|float)\s+([\w]+)\s*$/))
      .filter(Boolean)
    let out = glslToWgsl(block, { indent: '', seedTypes })
    return applyImmutableParams(out, block, signatureRe)
  }).join('\n\n')

  let mainWgsl = mainBlock
    .replace(/\bgl_FragCoord\b/g, 'pos')
    // WebGPU fragment y already grows downward like the GLSL-flipped `_st.y`
    .replace(/resolution\.y\s*-\s*pos\.y/g, 'pos.y')
    .replace(/fragColor\s*=\s*([^;]+);/, 'return $1;')
  mainWgsl = glslToWgsl(mainWgsl, { indent: '', seedTypes })
  mainWgsl = mainWgsl
    .replace(/^void\s+main\s*\(\s*\)\s*\{/,
      '@fragment\nfn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {')

  const bindingLines = []
  let binding = 0
  if (samplers.length > 0) bindingLines.push(`@group(0) @binding(${binding++}) var samp: sampler;`)
  for (const s of samplers) bindingLines.push(`@group(0) @binding(${binding++}) var ${s}: texture_2d<f32>;`)
  for (const u of uniforms) {
    bindingLines.push(`@group(0) @binding(${binding++}) var<uniform> ${u.name}: ${WGSL_SCALARS[u.type] || 'f32'};`)
  }
  return [bindingLines.join('\n'), '', MOD_HELPERS, '', converted, '', mainWgsl].join('\n')
}

const compileWrapped = new WeakSet()

/**
 * Wrap the WebGPU backend's WGSL source resolution so that Hydra GLSL
 * programs that reach the WGSL backend without a `wgsl` key (the companion's
 * fused-chain shader overrides carry `{ glsl }` only) are converted on
 * demand. Programs containing `_hydra_` markers are Hydra-generated; other
 * programs are untouched. Idempotent per engine module.
 * @param {object} engine - loaded Noisemaker engine module
 */
export function attachHydraWgslCompile (engine) {
  const proto = engine?.WebGPUBackend?.prototype
  if (!proto || compileWrapped.has(proto)) return false
  const original = proto.resolveWGSLSource
  if (typeof original !== 'function') return false
  compileWrapped.add(proto)
  proto.resolveWGSLSource = function (spec) {
    if (spec && spec.glsl && !spec.wgsl && /_hydra_/.test(spec.glsl)) {
      try {
        spec.wgsl = convertHydraGlslProgramToWgsl(spec.glsl)
      } catch (err) {
        // Leave the spec untouched: the backend reports ERR_NO_WGSL_SOURCE,
        // which the parity evidence preserves, instead of masking a defect.
        if (typeof console !== 'undefined') {
          console.warn(`[hydra-wgsl] conversion failed: ${err && err.message}`)
        }
      }
    }
    return original.call(this, spec)
  }
  return true
}
