import test from 'node:test'
import assert from 'node:assert/strict'

import {
  attachHydraWgslCompile,
  attachHydraWgslShaders,
  convertHydraGlslProgramToWgsl,
  glslToWgsl
} from '../src/lib/hydra-wgsl.mjs'

const FUSED_PROGRAM = `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform float time;
uniform float _hydra_1_amount;
uniform sampler2D prevBuffer;

out vec4 fragColor;

vec4 _hydra_solid(vec2 _st) {
  return vec4(1.0, 0.0, 0.0, 1.0);
}

vec4 _hydra_node_0(vec2 _st) {
  _st *= 2.0;
  return _hydra_solid(_st);
}

void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  fragColor = _hydra_node_0(_st);
}
`

test('convertHydraGlslProgramToWgsl emits WGSL with per-declared uniform bindings', () => {
  const wgsl = convertHydraGlslProgramToWgsl(FUSED_PROGRAM)
  assert.match(wgsl, /@group\(0\) @binding\(2\) var<uniform> resolution: vec2<f32>;/)
  assert.match(wgsl, /@group\(0\) @binding\(3\) var<uniform> time: f32;/)
  assert.match(wgsl, /@group\(0\) @binding\(4\) var<uniform> _hydra_1_amount: f32;/)
  assert.match(wgsl, /@fragment/)
  assert.match(wgsl, /fn main\(@builtin\(position\) pos: vec4<f32>\) -> @location\(0\) vec4<f32> \{/)
  // The GLSL `_st` flip must not survive: WebGPU fragment y already grows
  // downward, so the converted main keeps `pos.y` unflipped.
  assert.match(wgsl, /var _st = vec2<f32>\(pos\.x, pos\.y\) \/ resolution\.xy;/)
  assert.doesNotMatch(wgsl, /resolution\.y\s*-\s*pos\.y/)
  assert.doesNotMatch(wgsl, /#version|gl_FragCoord|fragColor|void main/)
  // Mutated parameters get WGSL-local immutable copies.
  assert.match(wgsl, /fn _hydra_node_0\(in__st: vec2<f32>\)/)
  assert.match(wgsl, /var _st = in__st;/)
})

test('effect-body texture2D calls gain the WGSL y-flip the entry-point sites drop', () => {
  // GLSL bodies sample with raw GLSL semantics (`texture2D(tex, fract(_st))`,
  // as the `src` and `prev` bodies do). A WGSL fetch at v reads the row a GLSL
  // fetch reads at 1 - v, so body-internal calls must be flipped while the
  // entry-point template sites (whose GLSL coordinates are already
  // pre-flipped by the companion templates) must not be.
  const program = FUSED_PROGRAM.replace(
    'vec4 _hydra_solid(vec2 _st) {\n  return vec4(1.0, 0.0, 0.0, 1.0);\n}',
    'vec4 _hydra_src(vec2 _st) {\n  return texture2D(tex, fract(_st));\n}'
  ).replace('fragColor = _hydra_node_0(_st);', 'fragColor = _hydra_src(_st);')
  const wgsl = convertHydraGlslProgramToWgsl(program)
  assert.match(wgsl, /textureSample\(tex, samp, vec2<f32>\(fract\(_st\)\.x, 1\.0 - fract\(_st\)\.y\)\)/)
})

test('mod(vecN, vecN) selects the vector-y mod helper', () => {
  // GLSL `mod(genType, genType)` is valid; calling the scalar-y helper
  // (mod_fv2(x: vec2<f32>, y: f32)) with a vector second argument is
  // ill-typed WGSL ("type mismatch for argument 2"). The v-suffixed helpers
  // (mod_fv2v..4v) exist for exactly this call shape.
  assert.match(
    glslToWgsl('vec4 f(vec2 v, vec2 w) { vec2 r = mod(v, w); return vec4(r, 0.0, 1.0); }'),
    /var r = mod_fv2v\(v, w\);/
  )
  assert.match(
    glslToWgsl('vec4 f(vec3 v, vec3 w) { vec3 r = mod(v, w); return vec4(r, 0.0, 1.0); }'),
    /var r = mod_fv3v\(v, w\);/
  )
  assert.match(
    glslToWgsl('vec4 f(vec4 v, vec4 w) { vec4 r = mod(v, w); return vec4(r, 0.0, 1.0); }'),
    /var r = mod_fv4v\(v, w\);/
  )
  // Scalar second arguments keep the existing helper selection.
  assert.match(
    glslToWgsl('vec4 f(vec2 v) { vec2 r = mod(v, 2.0); return vec4(r, 0.0, 1.0); }'),
    /var r = mod_fv2\(v, 2\.0\);/
  )
  assert.match(
    glslToWgsl('vec4 f(vec2 v) { vec2 r = mod(v, v.xx); return vec4(r, 0.0, 1.0); }'),
    /var r = mod_fv2v\(v, vec2<f32>\(v\.x, v\.x\)\);/
  )
})

test('fused-program conversion types uniforms into each converted fragment', () => {
  // A vec2 uniform is declared in the header, outside every converted
  // function; without seeding the per-block type maps, mod() on it resolves
  // to the scalar helper (mod_f) and produces ill-typed WGSL.
  const program = FUSED_PROGRAM
    .replace(
      'uniform vec2 resolution;',
      'uniform vec2 resolution;\nuniform vec2 offset;'
    )
    .replace(
      'vec4 _hydra_node_0(vec2 _st) {\n  _st *= 2.0;\n  return _hydra_solid(_st);\n}',
      'vec4 _hydra_node_0(vec2 _st) {\n  _st = mod(_st, offset);\n  return _hydra_solid(_st);\n}'
    )
  const wgsl = convertHydraGlslProgramToWgsl(program)
  assert.match(wgsl, /var<uniform> offset: vec2<f32>;/)
  assert.match(wgsl, /_st = mod_fv2v\(_st, offset\);/)
})

test('per-effect conversion types wrapper inputs into the wrapper body', () => {
  // buildWgslProgram converts the wrapper body without its signature, so a
  // vec2 wrapper input is otherwise unknown and mod() on it resolves to the
  // scalar helper.
  const program = FUSED_PROGRAM
    .replace(
      'vec4 _hydra_solid(vec2 _st) {\n  return vec4(1.0, 0.0, 0.0, 1.0);\n}',
      'vec4 _hydra_grid(vec2 _st, vec2 phase) {\n  _st = mod(_st, phase);\n  return vec4(_st, 0.0, 1.0);\n}'
    )
    .replace(/_hydra_node_0/g, '_hydra_grid')
  const def = {
    name: 'Grid',
    func: 'grid',
    tags: ['src', 'coord'],
    globals: { phase: { type: 'vec2' } },
    shaders: { grid: { glsl: program } }
  }
  // buildWgslProgram is reached through attachHydraWgslShaders; a successful
  // attach plus the emitted call shape proves the body saw the seeded types.
  const engine = { getAllEffects: () => new Map([['hydra/grid', def]]) }
  assert.equal(attachHydraWgslShaders(engine), 1)
  assert.match(def.shaders.grid.wgsl, /fn _hydra_grid\(in_st: vec2<f32>, phase: vec2<f32>\)/)
  assert.match(def.shaders.grid.wgsl, /var _st = in_st;/)
  assert.match(def.shaders.grid.wgsl, /_st = mod_fv2v\(_st, phase\);/)
})

test('attachHydraWgslShaders attaches WGSL to Hydra namespace definitions only', () => {
  const def = {
    name: 'Solid',
    func: 'solid',
    tags: ['src', 'color'],
    globals: {},
    shaders: { solid: { glsl: FUSED_PROGRAM } }
  }
  const upstreamDef = { name: 'Blur', tags: ['filter'], shaders: { blur: { glsl: FUSED_PROGRAM } } }
  const engine = {
    getAllEffects () {
      return new Map([
        ['hydra/solid', def],
        ['hydra/solid:callable', def],
        ['filter/blur', upstreamDef]
      ])
    }
  }
  assert.equal(attachHydraWgslShaders(engine), 1)
  assert.ok(def.shaders.solid.wgsl)
  assert.ok(!upstreamDef.shaders.blur.wgsl)
  // Idempotent: a second pass is a no-op.
  assert.equal(attachHydraWgslShaders(engine), 0)
  assert.equal(attachHydraWgslShaders({}), 0)
})

test('attachHydraWgslCompile wraps WebGPU WGSL source resolution and is idempotent', () => {
  class WebGPUBackend {
    resolveWGSLSource (spec) { return spec.wgsl || 'engine-default' }
  }
  const engine = { WebGPUBackend }
  assert.equal(attachHydraWgslCompile(engine), true)
  assert.equal(attachHydraWgslCompile(engine), false)
  const backend = new WebGPUBackend()
  const resolved = backend.resolveWGSLSource({ glsl: FUSED_PROGRAM })
  assert.match(resolved, /@fragment/)
  // Non-Hydra programs pass through untouched.
  assert.equal(backend.resolveWGSLSource({ glsl: '#version 300 es\nvoid main() {}\n' }), 'engine-default')
  // Malformed Hydra GLSL keeps the spec untouched instead of masking a defect.
  const bad = { glsl: '#version 300 es\n_hydra_marker' }
  assert.equal(backend.resolveWGSLSource(bad), 'engine-default')
})
