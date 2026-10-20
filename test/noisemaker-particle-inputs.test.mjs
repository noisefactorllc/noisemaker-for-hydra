import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  PARTICLE_INPUT_WIRING,
  RETIRED_WIRING,
  patchParticleInputs
} from '../src/lib/noisemaker-particle-inputs.mjs'

// The loaded instance shape mirrors the 1.0.301 engine bundle's effect
// definitions: globals keyed by parameter name, passes keyed by program
// with an inputs map of uniform name to texture source.
function fakeRenderer () {
  const reregistered = []
  const loaded = new Map()
  for (const [effectId, wiring] of Object.entries(PARTICLE_INPUT_WIRING)) {
    const [namespace, name] = effectId.split('/')
    loaded.set(effectId, {
      namespace,
      name,
      instance: {
        globals: {
          stateSize: { type: 'int', default: 256 },
          stride: { type: 'float', default: 10 }
        },
        passes: [
          {
            name: wiring.passProgram,
            program: wiring.passProgram,
            inputs: { velTex: 'global_vel', inputTex: 'inputTex' },
            uniforms: { stride: 'stride' }
          },
          {
            name: 'passthrough',
            program: 'passthrough',
            inputs: { inputTex: 'inputTex' },
            outputs: { fragColor: 'outputTex' }
          }
        ]
      }
    })
  }
  return { _loadedEffects: loaded, reregistered,
    registerEffectWithRuntime (effect) {
      reregistered.push(effect)
      return {}
    } }
}

// A bundle that already carries upstream 317c43ccb2ea's moved-inputs
// contract: the surface global sets a colorModeUniform and the sim pass
// binds the surface name itself next to the chained input.
function movedInputsRenderer ({ withColorModeUniform = true } = {}) {
  const loaded = new Map()
  const ids = Object.keys(PARTICLE_INPUT_WIRING).filter(id => !RETIRED_WIRING.has(id))
  for (const effectId of ids) {
    const [namespace, name] = effectId.split('/')
    const wiring = PARTICLE_INPUT_WIRING[effectId]
    const spec = { type: 'surface', default: 'none' }
    if (withColorModeUniform) spec.colorModeUniform = 'surfaceActive'
    loaded.set(effectId, {
      namespace,
      name,
      instance: {
        globals: {
          stateSize: { type: 'int', default: 256 },
          [wiring.surface]: spec
        },
        passes: [
          {
            name: wiring.passProgram,
            program: wiring.passProgram,
            inputs: {
              velTex: 'global_vel',
              inputTex: 'inputTex',
              [wiring.surface]: wiring.surface
            },
            uniforms: { stride: 'stride' }
          }
        ]
      }
    })
  }
  // The retired effect keeps the shape the patch used to rewrite.
  loaded.set('render/pointsEmit', {
    namespace: 'render',
    name: 'pointsEmit',
    instance: {
      globals: { stateSize: { type: 'int', default: 256 } },
      passes: [
        {
          name: 'init',
          program: 'init',
          inputs: { velTex: 'global_vel', inputTex: 'inputTex' },
          uniforms: { stateSize: 'stateSize' }
        }
      ]
    }
  })
  return { _loadedEffects: loaded, reregistered: [],
    registerEffectWithRuntime () { return {} } }
}

const ACTIVE_IDS = Object.keys(PARTICLE_INPUT_WIRING).filter(id => !RETIRED_WIRING.has(id))

test('PARTICLE_INPUT_WIRING matches the pinned upstream 06ce0927 contract except the moved categories', () => {
  const fixture = JSON.parse(readFileSync(
    new URL('./fixtures/upstream-06ce0927/particle-input-wiring.json', import.meta.url), 'utf8'))
  assert.equal(
    createHash('sha256').update(readFileSync(
      new URL('./fixtures/upstream-06ce0927/particle-input-wiring.json', import.meta.url)))
      .digest('hex'),
    '360558d022fe338d61835cb2402f85d320b122b455300654a34acb9d20f93a68',
    'upstream wiring fixture sha256 (pinned reference)')
  // Upstream e23524f6b5ea and d3b5238c8bf2 later moved each surface's
  // ui.category out of "source"; the table carries those current values
  // (see the matching category test). Everything else stays 06ce0927.
  const current = JSON.parse(JSON.stringify(fixture.effects))
  const movedCategories = {
    'points/dla': 'chemistry',
    'points/flow': 'agents',
    'points/hydraulic': 'agents',
    'points/life': 'types',
    'points/physarum': 'general'
  }
  for (const [effectId, category] of Object.entries(movedCategories)) {
    current[effectId].global.ui.category = category
  }
  assert.deepEqual(PARTICLE_INPUT_WIRING, current)
  // The fixture itself still pins the historical 06ce0927 categories.
  for (const effectId of Object.keys(movedCategories)) {
    assert.equal(fixture.effects[effectId].global.ui.category, 'source')
  }
})

test('RETIRED_WIRING marks the surface upstream moved into individual behaviors', () => {
  assert.deepEqual([...RETIRED_WIRING], ['render/pointsEmit'])
  // The premise is pinned: the upstream 317c43ccb2ea definition no longer
  // carries the diffuseTex global. The file is committed verbatim under
  // test/fixtures/ so the claim is mechanically checkable without upstream
  // access.
  const upstream = readFileSync(
    new URL('./fixtures/upstream-317c43cc/render-pointsEmit-definition.js', import.meta.url), 'utf8')
  assert.equal(createHash('sha256').update(upstream).digest('hex'),
    'b0453214494848e85261038fec0e4be74428f85ea8f746a9f621d3c8fc5fcac3',
    'upstream pointsEmit definition fixture sha256 (pinned reference)')
  assert.doesNotMatch(upstream, /diffuseTex/,
    'upstream 317c43ccb2ea render/pointsEmit has no diffuseTex global')
})

test('PARTICLE_INPUT_WIRING carries the current upstream ui.category for each surface', () => {
  // Upstream e23524f6b5ea and d3b5238c8bf2 moved each surface's category
  // out of "source" into the owning behavior's category.
  const expected = {
    'points/dla': 'chemistry',
    'points/flow': 'agents',
    'points/hydraulic': 'agents',
    'points/life': 'types',
    'points/physarum': 'general'
  }
  for (const [effectId, category] of Object.entries(expected)) {
    assert.equal(PARTICLE_INPUT_WIRING[effectId].global.ui.category, category,
      `${effectId}: ui.category follows upstream`)
  }
})

test('patchParticleInputs adds each active upstream surface global with the legacy default', () => {
  const renderer = fakeRenderer()
  const patched = patchParticleInputs(renderer)
  assert.equal(patched.length, ACTIVE_IDS.length,
    'every loaded active particle effect is patched')
  for (const effectId of ACTIVE_IDS) {
    const wiring = PARTICLE_INPUT_WIRING[effectId]
    const instance = renderer._loadedEffects.get(effectId).instance
    assert.deepEqual(instance.globals[wiring.surface], wiring.global)
    // Existing globals are preserved.
    assert.ok(instance.globals.stateSize, 'existing globals survive the patch')
  }
})

test('patchParticleInputs rewires only the active sim passes through the named surface', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  for (const effectId of ACTIVE_IDS) {
    const wiring = PARTICLE_INPUT_WIRING[effectId]
    const instance = renderer._loadedEffects.get(effectId).instance
    const simPass = instance.passes.find(pass => pass.program === wiring.passProgram)
    assert.equal(simPass.inputs.inputTex, wiring.surface,
      `${effectId}: sim pass reads through ${wiring.surface}`)
    assert.equal(simPass.inputs.velTex, 'global_vel', 'other sim inputs are preserved')
    const passthrough = instance.passes.find(pass => pass.program === 'passthrough')
    assert.equal(passthrough.inputs.inputTex, 'inputTex',
      `${effectId}: non-sim passes keep the legacy literal wiring`)
  }
})

test('patchParticleInputs leaves the retired pointsEmit surface retired', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  const instance = renderer._loadedEffects.get('render/pointsEmit').instance
  assert.equal(instance.globals.diffuseTex, undefined,
    'upstream 317c43ccb2ea removed the surface; the patch must not add it back')
  const init = instance.passes.find(pass => pass.program === 'init')
  assert.equal(init.inputs.inputTex, 'inputTex',
    'the init pass keeps the chained-input wiring upstream restored')
  assert.equal(renderer.reregistered.some(call => call.name === 'pointsEmit'), false)
})

test('patchParticleInputs leaves definitions that already carry the upstream wiring', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  const patchedAgain = patchParticleInputs(renderer)
  assert.deepEqual(patchedAgain, [],
    'a second pass finds nothing left to patch')
  for (const effectId of ACTIVE_IDS) {
    const wiring = PARTICLE_INPUT_WIRING[effectId]
    const instance = renderer._loadedEffects.get(effectId).instance
    assert.equal(Object.keys(instance.globals).filter(k => k === wiring.surface).length, 1,
      `${effectId}: no duplicate surface global`)
    const simPass = instance.passes.find(pass => pass.program === wiring.passProgram)
    assert.equal(simPass.inputs.inputTex, wiring.surface)
  }
})

test('patchParticleInputs leaves upstream moved-inputs definitions as published', () => {
  // The moved-inputs shape is pinned from the rolling CDN bundle
  // (upstream 317c43ccb2ea's contract as served today).
  const contract = JSON.parse(readFileSync(
    new URL('./fixtures/upstream-317c43cc/moved-inputs-contract.json', import.meta.url), 'utf8'))
  assert.equal(createHash('sha256').update(JSON.stringify(contract, null, 2) + '\n').digest('hex'),
    'f0b1d55fa657cab9e08b36dd73d47111e8df30001b5f8105b0c19d2da69268c1',
    'moved-inputs contract fixture sha256 (pinned reference)')
  assert.equal(contract.fieldTexGlobal.colorModeUniform, 'fieldActive')
  assert.equal(contract.agentPass.inputs.fieldTex, 'fieldTex')

  const renderer = movedInputsRenderer()
  const before = JSON.stringify([...renderer._loadedEffects.values()])
  const patched = patchParticleInputs(renderer)
  assert.deepEqual(patched, [], 'a moved-inputs bundle needs no patch')
  assert.equal(JSON.stringify([...renderer._loadedEffects.values()]), before,
    'the loaded definitions are untouched')

  // The retired effect is skipped on this bundle shape too.
  const emit = renderer._loadedEffects.get('render/pointsEmit').instance
  assert.equal(emit.globals.diffuseTex, undefined)
  assert.equal(emit.passes[0].inputs.inputTex, 'inputTex')
})

test('patchParticleInputs detects the moved-inputs contract without a colorModeUniform', () => {
  const renderer = movedInputsRenderer({ withColorModeUniform: false })
  const before = JSON.stringify([...renderer._loadedEffects.values()])
  assert.deepEqual(patchParticleInputs(renderer), [])
  assert.equal(JSON.stringify([...renderer._loadedEffects.values()]), before,
    'a sim pass that already binds the surface name is published wiring')
})

test('patchParticleInputs reports only the loaded effects it patched', () => {
  const renderer = fakeRenderer()
  renderer._loadedEffects.delete('points/physarum')
  const patched = patchParticleInputs(renderer)
  assert.deepEqual(patched.map(entry => `${entry.namespace}/${entry.name}`),
    ACTIVE_IDS.filter(id => id !== 'points/physarum'))
})

test('patchParticleInputs re-registers each patched effect for the DSL op spec', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  assert.equal(renderer.reregistered.length, ACTIVE_IDS.length,
    'every patched effect is re-registered')
  for (const effectId of ACTIVE_IDS) {
    const [namespace, name] = effectId.split('/')
    const call = renderer.reregistered.find(effect => effect.namespace === namespace && effect.name === name)
    assert.ok(call, `${effectId}: re-registered`)
    assert.equal(call.name, name)
    assert.ok(call.instance.globals[PARTICLE_INPUT_WIRING[effectId].surface],
      `${effectId}: re-registration carries the patched instance`)
  }
})

test('patchParticleInputs skips re-registration when nothing changed', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  const firstCount = renderer.reregistered.length
  assert.ok(firstCount > 0)
  patchParticleInputs(renderer)
  assert.equal(renderer.reregistered.length, firstCount,
    'a second pass re-registers nothing')
})

test('patchParticleInputs tolerates a renderer without the registration hook', () => {
  const renderer = fakeRenderer()
  delete renderer.registerEffectWithRuntime
  const patched = patchParticleInputs(renderer)
  assert.equal(patched.length, ACTIVE_IDS.length,
    'the patch still applies without the hook')
})

test('patchParticleInputs tolerates a renderer without _loadedEffects', () => {
  assert.deepEqual(patchParticleInputs({}), [])
  assert.deepEqual(patchParticleInputs(null), [])
})
