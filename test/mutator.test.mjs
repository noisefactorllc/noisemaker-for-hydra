import assert from 'node:assert/strict'
import test from 'node:test'

import Mutator from '../src/views/editor/randomizer/Mutator.js'

test('mutator uses the Noisemaker AST and recompiles mutated and restored source', () => {
  const compiled = []
  const values = []
  const errors = []
  const originalRandom = Math.random
  const originalWindow = globalThis.window
  const random = [0, 0.75]

  globalThis.window = {
    _reportError: error => errors.push(error),
    hydraSynth: {
      hydraEngine: {
        lex(source) {
          assert.equal(source, 'hydraOsc(2).write(o0)')
          return [{ type: 'source', value: source }]
        },
        parse(tokens) {
          assert.deepEqual(tokens, [{ type: 'source', value: 'hydraOsc(2).write(o0)' }])
          return {
            type: 'Program',
            body: [{ type: 'Number', value: 2, loc: { start: 9, end: 10 } }]
          }
        },
        validate(ast) {
          return { plans: [{ value: ast.body[0].value }] }
        },
        getEffect() { return null },
        unparse(compiled, overrides, options) {
          assert.deepEqual(overrides, {})
          assert.equal(typeof options.getEffectDef, 'function')
          return `hydraOsc(${compiled.plans[0].value}).write(o0)`
        }
      },
      compile(source) {
        compiled.push(source)
      }
    }
  }
  Math.random = () => random.shift()

  const editor = {
    cm: {
      getValue: () => values.at(-1) ?? 'hydraOsc(2).write(o0)',
      setValue: value => values.push(value)
    }
  }

  try {
    const mutator = new Mutator(editor)
    assert.equal(mutator.mutate(), 'hydraOsc(3).write(o0)')
    assert.deepEqual(values, ['hydraOsc(3).write(o0)'])
    assert.deepEqual(compiled, ['hydraOsc(3).write(o0)'])

    mutator.doUndo()
    mutator.doRedo()
    assert.deepEqual(values, [
      'hydraOsc(3).write(o0)',
      'hydraOsc(2).write(o0)',
      'hydraOsc(3).write(o0)'
    ])
    assert.deepEqual(compiled, [
      'hydraOsc(3).write(o0)',
      'hydraOsc(2).write(o0)',
      'hydraOsc(3).write(o0)'
    ])
    assert.deepEqual(errors, [])
  } finally {
    Math.random = originalRandom
    globalThis.window = originalWindow
  }
})

test('mutator preserves multi-step pipeline structure containing builtin steps across mutations', () => {
  const compiled = []
  const values = []
  const errors = []
  const originalRandom = Math.random
  const originalWindow = globalThis.window
  const random = [0, 0.7]

  globalThis.window = {
    _reportError: error => errors.push(error),
    hydraSynth: {
      hydraEngine: {
        lex(source) {
          return [{ type: 'source', value: source }]
        },
        parse() {
          return {
            type: 'Program',
            body: [
              { type: 'Number', value: 5, loc: { start: 9, end: 10 } }
            ]
          }
        },
        validate(ast) {
          return {
            plans: [
              {
                chain: [
                  { op: 'synth.noise', args: { scale: ast.body[0].value }, temp: 0 },
                  { op: 'write', args: { target: 'o0' }, builtin: true }
                ]
              }
            ]
          }
        },
        getEffect() { return null },
        unparse(compiledPlan) {
          return `noise(scale: ${compiledPlan.plans[0].chain[0].args.scale}).write(o0)`
        }
      },
      compile(source) {
        compiled.push(source)
      }
    }
  }
  Math.random = () => random.shift()

  const editor = {
    cm: {
      getValue: () => values.at(-1) ?? 'noise(scale: 5).write(o0)',
      setValue: value => values.push(value)
    }
  }

  try {
    const mutator = new Mutator(editor)
    const mutated = mutator.mutate()
    assert.equal(mutated, 'noise(scale: 7).write(o0)')
    assert.deepEqual(values, ['noise(scale: 7).write(o0)'])
    assert.deepEqual(compiled, ['noise(scale: 7).write(o0)'])
    assert.deepEqual(errors, [])
  } finally {
    Math.random = originalRandom
    globalThis.window = originalWindow
  }
})
