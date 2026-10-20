import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  PARTICLE_INPUT_WIRING,
  patchParticleInputs
} from '../src/lib/noisemaker-particle-inputs.mjs'

// The loaded instance shape mirrors the 1.0.301 engine bundle's effect
// definitions: globals keyed by parameter name, passes keyed by program
// with an inputs map of uniform name to texture source.
function fakeRenderer () {
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
  return { _loadedEffects: loaded }
}

test('PARTICLE_INPUT_WIRING matches the pinned upstream 06ce0927 contract', () => {
  const fixture = JSON.parse(readFileSync(
    new URL('./fixtures/upstream-06ce0927/particle-input-wiring.json', import.meta.url), 'utf8'))
  assert.equal(
    createHash('sha256').update(readFileSync(
      new URL('./fixtures/upstream-06ce0927/particle-input-wiring.json', import.meta.url)))
      .digest('hex'),
    '360558d022fe338d61835cb2402f85d320b122b455300654a34acb9d20f93a68',
    'upstream wiring fixture sha256 (pinned reference)')
  assert.deepEqual(PARTICLE_INPUT_WIRING, fixture.effects)
})

test('patchParticleInputs adds each upstream surface global with the legacy default', () => {
  const renderer = fakeRenderer()
  const patched = patchParticleInputs(renderer)
  assert.equal(patched.length, Object.keys(PARTICLE_INPUT_WIRING).length,
    'every loaded particle effect is patched')
  for (const [effectId, wiring] of Object.entries(PARTICLE_INPUT_WIRING)) {
    const instance = renderer._loadedEffects.get(effectId).instance
    assert.deepEqual(instance.globals[wiring.surface], wiring.global)
    // Existing globals are preserved.
    assert.ok(instance.globals.stateSize, 'existing globals survive the patch')
  }
})

test('patchParticleInputs rewires only the sim pass through the named surface', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  for (const [effectId, wiring] of Object.entries(PARTICLE_INPUT_WIRING)) {
    const instance = renderer._loadedEffects.get(effectId).instance
    const simPass = instance.passes.find(pass => pass.program === wiring.passProgram)
    assert.equal(simPass.inputs.inputTex, wiring.surface,
      `${effectId}: sim pass reads through ${wiring.surface}`)
    assert.equal(simPass.inputs.velTex, 'global_vel', 'other sim inputs are preserved')
    const passthrough = instance.passes.find(pass => pass.program === 'passthrough')
    assert.equal(passthrough.inputs.inputTex, 'inputTex',
      `${effectId}: non-sim passes keep the legacy literal wiring`)
  }
  // pointsEmit's surface carries upstream's resetOnChange; the others do not.
  assert.equal(renderer._loadedEffects.get('render/pointsEmit')
    .instance.globals.diffuseTex.ui.resetOnChange, true)
  assert.equal(renderer._loadedEffects.get('points/dla')
    .instance.globals.fieldTex.ui.resetOnChange, undefined)
})

test('patchParticleInputs leaves definitions that already carry the upstream wiring', () => {
  const renderer = fakeRenderer()
  patchParticleInputs(renderer)
  const patchedAgain = patchParticleInputs(renderer)
  assert.deepEqual(patchedAgain, [],
    'a second pass finds nothing left to patch')
  for (const [effectId, wiring] of Object.entries(PARTICLE_INPUT_WIRING)) {
    const instance = renderer._loadedEffects.get(effectId).instance
    assert.equal(Object.keys(instance.globals).filter(k => k === wiring.surface).length, 1,
      `${effectId}: no duplicate surface global`)
    const simPass = instance.passes.find(pass => pass.program === wiring.passProgram)
    assert.equal(simPass.inputs.inputTex, wiring.surface)
  }
})

test('patchParticleInputs reports only the loaded effects it patched', () => {
  const renderer = fakeRenderer()
  renderer._loadedEffects.delete('points/physarum')
  const patched = patchParticleInputs(renderer)
  assert.deepEqual(patched.map(entry => `${entry.namespace}/${entry.name}`),
    Object.keys(PARTICLE_INPUT_WIRING).filter(id => id !== 'points/physarum'))
})

test('patchParticleInputs tolerates a renderer without _loadedEffects', () => {
  assert.deepEqual(patchParticleInputs({}), [])
  assert.deepEqual(patchParticleInputs(null), [])
})
