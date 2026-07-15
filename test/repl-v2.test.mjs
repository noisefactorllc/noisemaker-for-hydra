import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'

async function loadRepl() {
  const result = await build({
    entryPoints: ['src/stores/repl-v2.js'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false
  })
  const source = result.outputFiles[0].text
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  return import(url)
}

test('forwards the complete editor document unchanged to one compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth\ngradient(speed: 0).write(o0)\nrender(o0)'

  const info = await new Promise(resolve => repl.default.eval(source, resolve))

  assert.deepEqual(compiled, [source])
  assert.deepEqual(info, {
    isError: false,
    codeString: source,
    errorMessage: ''
  })
})
