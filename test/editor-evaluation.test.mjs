import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateDocument } from '../src/views/editor/evaluate-document.js'

for (const selection of ['line', 'block']) {
  test(`${selection} shortcut flashes its range and evaluates the complete document`, () => {
    const events = []
    let flashes = 0
    const source = 'search hydra\ngradient(speed: 0)\n  .rotate(angle: 0.2).write(o0)'
    const editor = {
      cm: { getValue: () => source },
      emit: (...args) => events.push(args)
    }

    evaluateDocument(editor, () => { flashes++ })

    assert.equal(flashes, 1)
    assert.deepEqual(events, [['repl: eval', source]])
  })
}
