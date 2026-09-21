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

const originalWindow = global.window

test.afterEach(() => {
  global.window = originalWindow
})

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

test('forwards chained variable alias syntax through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth, filter\nlet eff = rotate(1, 0.1)\nnoise().eff().write(o0)\nrender(o0)'

  const info = await new Promise(resolve => repl.default.eval(source, resolve))

  assert.deepEqual(compiled, [source])
  assert.deepEqual(info, {
    isError: false,
    codeString: source,
    errorMessage: ''
  })
})

test('forwards midi expressions through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth\nlet m = midi(mode: midiMode.noteChange, channel: 1)\nnoise(scaleX: m).write(o0)\nrender(o0)'

  const info = await new Promise(resolve => repl.default.eval(source, resolve))

  assert.deepEqual(compiled, [source])
  assert.deepEqual(info, {
    isError: false,
    codeString: source,
    errorMessage: ''
  })
})

test('forwards adjust filter expressions through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth, filter\ngradient().adjust(contrast: 1.2, brightness: 0.1).write(o0)\nrender(o0)'

  const info = await new Promise(resolve => repl.default.eval(source, resolve))

  assert.deepEqual(compiled, [source])
  assert.deepEqual(info, {
    isError: false,
    codeString: source,
    errorMessage: ''
  })
})

test('forwards output surface boundary expressions through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth\nread(o0).write(o7)\nrender(o7)'

  const info = await new Promise(resolve => repl.default.eval(source, resolve))

  assert.deepEqual(compiled, [source])
  assert.deepEqual(info, {
    isError: false,
    codeString: source,
    errorMessage: ''
  })
})

test('repl.eval returns error when engine is not ready', async () => {
  const repl = await loadRepl()
  global.window = {}
  const info = await new Promise(resolve => repl.default.eval('search hydra', resolve))
  assert.equal(info.isError, true)
  assert.equal(info.errorMessage, 'engine not ready — try again in a moment')
})

test('repl.eval formats compiler errors containing diagnostics', async () => {
  const repl = await loadRepl()
  const err = new Error('Compilation failed with 1 error(s)')
  err.diagnostics = [{ message: "Unknown effect: 'solid'", location: { line: 2, column: 5 } }]
  global.window = {
    hydraSynth: {
      async compile() { throw err }
    }
  }

  const info = await new Promise(resolve => repl.default.eval('solid()', resolve))
  assert.equal(info.isError, true)
  assert.equal(info.errorMessage, "Unknown effect: 'solid' (line 2, col 5)")
})

test('repl.eval formats compiler syntax errors for out-of-range output surfaces', async () => {
  const repl = await loadRepl()
  const err = new SyntaxError("Output surface reference 'o8' is out of range; expected o0-o7 at line 1 col 15")
  global.window = {
    hydraSynth: {
      async compile() { throw err }
    }
  }

  const info = await new Promise(resolve => repl.default.eval('noise().write(o8)', resolve))
  assert.equal(info.isError, true)
  assert.equal(info.errorMessage, "Output surface reference 'o8' is out of range; expected o0-o7 at line 1 col 15")
})

test('formatError formats strings, nulls, and standard Error instances', async () => {
  const { formatError } = await loadRepl()
  assert.equal(formatError(null), 'unknown error')
  assert.equal(formatError(undefined), 'unknown error')
  assert.equal(formatError('plain message'), 'plain message')
  assert.equal(formatError(new Error('runtime failure')), 'runtime failure')
})

test('formatError prioritizes diagnostics and errors on Error instances', async () => {
  const { formatError } = await loadRepl()
  const errWithDiags = new Error('Compilation failed with 2 error(s)')
  errWithDiags.diagnostics = [
    { message: "Unknown effect: 'foo'", location: { line: 1, col: 3 } },
    { message: "Unterminated string", location: { start: { line: 4, column: 10 } } }
  ]
  assert.equal(
    formatError(errWithDiags),
    "Unknown effect: 'foo' (line 1, col 3); Unterminated string (line 4, col 10)"
  )

  const errWithErrors = new Error('Failed to expand')
  errWithErrors.errors = [{ message: 'Pass cycle detected' }]
  assert.equal(formatError(errWithErrors), 'Pass cycle detected')
})

test('formatError handles plain objects with diagnostics or error properties', async () => {
  const { formatError } = await loadRepl()
  assert.equal(
    formatError({ diagnostics: [{ message: 'Syntax error', location: { row: 3, col: 8 } }] }),
    'Syntax error (line 3, col 8)'
  )
  assert.equal(
    formatError({ diagnostics: [{ message: 'Unexpected token', loc: { line: 5, column: 12 } }] }),
    'Unexpected token (line 5, col 12)'
  )
  assert.equal(formatError({ error: 'custom error message' }), 'custom error message')
  assert.equal(formatError({ code: 'ERR_ABORTED' }), '{"code":"ERR_ABORTED"}')
})
