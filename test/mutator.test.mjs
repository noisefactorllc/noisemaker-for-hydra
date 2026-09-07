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
