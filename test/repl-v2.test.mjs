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

test('repl.eval formats error when step replacement or compilation fails', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const err = new Error('Step at index 0 is a builtin step and cannot be replaced')
  global.window = {
    hydraSynth: {
      async compile() { throw err }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('render(o0)', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, 'Step at index 0 is a builtin step and cannot be replaced')
  } finally {
    global.window = originalWindow
  }
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

test('formatDiagnostic preserves column precedence over col fallback and formats unlocated diagnostics', async () => {
  const { formatError } = await loadRepl()
  const err = new Error('Compilation failed')
  err.diagnostics = [
    { message: 'Primary column location', location: { line: 2, column: 15, col: 1 } },
    { message: 'Fallback col location', location: { line: 4, col: 7 } },
    { message: 'Unlocated diagnostic' }
  ]
  assert.equal(
    formatError(err),
    'Primary column location (line 2, col 15); Fallback col location (line 4, col 7); Unlocated diagnostic'
  )
})

test('formatError handles singular diagnostic property with structured lexer payload', async () => {
  const { formatError } = await loadRepl()
  const syntaxErr = new SyntaxError("Unexpected character '@' at line 1 col 1")
  syntaxErr.diagnostic = {
    code: 'L001',
    stage: 'lexer',
    severity: 'error',
    message: "Unexpected character '@' at line 1 col 1",
    location: { line: 1, column: 1 },
    span: { start: 0, end: 1 }
  }
  assert.equal(
    formatError(syntaxErr),
    "Unexpected character '@' at line 1 col 1"
  )

  const plainObjectErr = {
    diagnostic: {
      code: 'L004',
      stage: 'lexer',
      severity: 'error',
      message: "Output surface reference 'o99' is out of range",
      location: { line: 2, column: 8 }
    }
  }
  assert.equal(
    formatError(plainObjectErr),
    "Output surface reference 'o99' is out of range (line 2, col 8)"
  )
})

test('repl.eval formats compiler syntax errors carrying structured lexer diagnostic', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Unexpected character '@' at line 1 col 1")
  syntaxErr.diagnostic = {
    code: 'L001',
    stage: 'lexer',
    severity: 'error',
    message: "Unexpected character '@' at line 1 col 1",
    location: { line: 1, column: 1 },
    span: { start: 0, end: 1 }
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('@noise()', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Unexpected character '@' at line 1 col 1")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser payload (P001/P002)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP001 = new SyntaxError("Expect '(' at line 2 col 8")
  syntaxErrP001.diagnostic = {
    code: 'P001',
    stage: 'parser',
    severity: 'error',
    message: "Expect '(' at line 2 col 8",
    location: { line: 2, column: 8 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP001),
    "Expect '(' at line 2 col 8"
  )

  const syntaxErrP002 = new SyntaxError("Expect ')' at line 2 col 10")
  syntaxErrP002.diagnostic = {
    code: 'P002',
    stage: 'parser',
    severity: 'error',
    message: "Expect ')' at line 2 col 10",
    location: { line: 2, column: 10 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP002),
    "Expect ')' at line 2 col 10"
  )

  const plainObjectP001 = {
    diagnostic: {
      code: 'P001',
      stage: 'parser',
      severity: 'error',
      message: 'Expected identifier',
      location: { line: 2, column: 5 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP001),
    'Expected identifier (line 2, col 5)'
  )
})

test('formatError handles parser expectation diagnostics with explicit null location and span', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocated = new SyntaxError("Expect '(' at line undefined col undefined")
  syntaxErrUnlocated.diagnostic = {
    code: 'P001',
    stage: 'parser',
    severity: 'error',
    message: "Expect '(' at line undefined col undefined",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocated),
    "Expect '(' at line undefined col undefined"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser diagnostic', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Expect ')' at line 2 col 10")
  syntaxErr.diagnostic = {
    code: 'P002',
    stage: 'parser',
    severity: 'error',
    message: "Expect ')' at line 2 col 10",
    location: { line: 2, column: 10 },
    span: null
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('render(o0', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Expect ')' at line 2 col 10")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser automation payload (P003)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP003 = new SyntaxError("midi() requires 'channel' or 'zone' argument at line 2 col 24")
  syntaxErrP003.diagnostic = {
    code: 'P003',
    stage: 'parser',
    severity: 'error',
    message: "midi() requires 'channel' or 'zone' argument at line 2 col 24",
    location: { line: 2, column: 24 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP003),
    "midi() requires 'channel' or 'zone' argument at line 2 col 24"
  )

  const plainObjectP003 = {
    diagnostic: {
      code: 'P003',
      stage: 'parser',
      severity: 'error',
      message: "audio() 'id' requires readable 'name'",
      location: { line: 2, column: 9 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP003),
    "audio() 'id' requires readable 'name' (line 2, col 9)"
  )
})

test('formatError handles singular diagnostic property with structured parser search directive payload (P004)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP004 = new SyntaxError("Expected namespace identifier after search at line 1 col 7")
  syntaxErrP004.diagnostic = {
    code: 'P004',
    stage: 'parser',
    severity: 'error',
    message: "Expected namespace identifier after search at line 1 col 7",
    location: { line: 1, column: 7 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP004),
    "Expected namespace identifier after search at line 1 col 7"
  )

  const plainObjectP004 = {
    diagnostic: {
      code: 'P004',
      stage: 'parser',
      severity: 'error',
      message: "Invalid namespace 'bogus'",
      location: { line: 1, column: 8 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP004),
    "Invalid namespace 'bogus' (line 1, col 8)"
  )
})

test('formatError handles parser automation and search diagnostics with explicit null location and span', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedAutomation = new SyntaxError("midi() requires 'channel' or 'zone' argument at line undefined col undefined")
  syntaxErrUnlocatedAutomation.diagnostic = {
    code: 'P003',
    stage: 'parser',
    severity: 'error',
    message: "midi() requires 'channel' or 'zone' argument at line undefined col undefined",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedAutomation),
    "midi() requires 'channel' or 'zone' argument at line undefined col undefined"
  )

  const syntaxErrUnlocatedSearch = new SyntaxError("Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order.")
  syntaxErrUnlocatedSearch.diagnostic = {
    code: 'P004',
    stage: 'parser',
    severity: 'error',
    message: "Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order.",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedSearch),
    "Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order."
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser automation diagnostic (P003)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("midi() requires 'channel' or 'zone' argument at line 2 col 24")
  syntaxErr.diagnostic = {
    code: 'P003',
    stage: 'parser',
    severity: 'error',
    message: "midi() requires 'channel' or 'zone' argument at line 2 col 24",
    location: { line: 2, column: 24 },
    span: null
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nlet x = midi()', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "midi() requires 'channel' or 'zone' argument at line 2 col 24")
  } finally {
    global.window = originalWindow
  }
})

test('repl.eval formats compiler syntax errors carrying structured parser search diagnostic (P004)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Expected namespace identifier after search at line 1 col 7")
  syntaxErr.diagnostic = {
    code: 'P004',
    stage: 'parser',
    severity: 'error',
    message: "Expected namespace identifier after search at line 1 col 7",
    location: { line: 1, column: 7 },
    span: null
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Expected namespace identifier after search at line 1 col 7")
  } finally {
    global.window = originalWindow
  }
})

test('forwards classicNoisedeck noise expressions with refract parameter through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, classicNoisedeck\nnoise(refract: 0).write(o0)\nrender(o0)'

  try {
    const info = await new Promise(resolve => repl.default.eval(source, resolve))

    assert.deepEqual(compiled, [source])
    assert.deepEqual(info, {
      isError: false,
      codeString: source,
      errorMessage: ''
    })
  } finally {
    global.window = originalWindow
  }
})

test('forwards classicNoisedeck glitch expressions with zero-work parameters through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, classicNoisedeck\ngradient().glitch(glitchiness: 0, scanlines: 0, snow: 0).write(o0)\nrender(o0)'

  try {
    const info = await new Promise(resolve => repl.default.eval(source, resolve))

    assert.deepEqual(compiled, [source])
    assert.deepEqual(info, {
      isError: false,
      codeString: source,
      errorMessage: ''
    })
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser output validation payload (P005)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP005 = new SyntaxError("write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line 2 col 21")
  syntaxErrP005.diagnostic = {
    code: 'P005',
    stage: 'parser',
    severity: 'error',
    message: "write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line 2 col 21",
    location: { line: 2, column: 21 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP005),
    "write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line 2 col 21"
  )

  const plainObjectP005 = {
    diagnostic: {
      code: 'P005',
      stage: 'parser',
      severity: 'error',
      message: "Expected output reference in render()",
      location: { line: 2, column: 8 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP005),
    "Expected output reference in render() (line 2, col 8)"
  )
})

test('formatError handles parser output validation diagnostics with explicit null location and span', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedOutput = new SyntaxError("Expected output reference in render()")
  syntaxErrUnlocatedOutput.diagnostic = {
    code: 'P005',
    stage: 'parser',
    severity: 'error',
    message: "Expected output reference in render()",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedOutput),
    "Expected output reference in render()"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser output validation diagnostic (P005)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("'.write()' is only allowed in statement context at line 2 col 23")
  syntaxErr.diagnostic = {
    code: 'P005',
    stage: 'parser',
    severity: 'error',
    message: "'.write()' is only allowed in statement context at line 2 col 23",
    location: { line: 2, column: 23 },
    span: null
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nlet x = noise().write(o0)', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "'.write()' is only allowed in statement context at line 2 col 23")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser subchain validation payload (P006)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP006 = new SyntaxError("Expected '.' before chain element in subchain body at line 2 col 28")
  syntaxErrP006.diagnostic = {
    code: 'P006',
    stage: 'parser',
    severity: 'error',
    message: "Expected '.' before chain element in subchain body at line 2 col 28",
    location: { line: 2, column: 28 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP006),
    "Expected '.' before chain element in subchain body at line 2 col 28"
  )

  const plainObjectP006 = {
    diagnostic: {
      code: 'P006',
      stage: 'parser',
      severity: 'error',
      message: "Subchain body cannot be empty",
      location: { line: 2, column: 9 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP006),
    "Subchain body cannot be empty (line 2, col 9)"
  )
})

test('formatError handles parser subchain validation diagnostics with explicit null location and span', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedSubchain = new SyntaxError("Subchain body cannot be empty at line undefined col undefined")
  syntaxErrUnlocatedSubchain.diagnostic = {
    code: 'P006',
    stage: 'parser',
    severity: 'error',
    message: "Subchain body cannot be empty at line undefined col undefined",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedSubchain),
    "Subchain body cannot be empty at line undefined col undefined"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser subchain validation diagnostic (P006)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Expected string value for subchain name at line 2 col 24")
  syntaxErr.diagnostic = {
    code: 'P006',
    stage: 'parser',
    severity: 'error',
    message: "Expected string value for subchain name at line 2 col 24",
    location: { line: 2, column: 24 },
    span: null
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nnoise().subchain(name: 123) { .invert() }', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Expected string value for subchain name at line 2 col 24")
  } finally {
    global.window = originalWindow
  }
})

test('forwards subchain expressions through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  const originalWindow = global.window
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth\nnoise().subchain("loop") { .invert() }.write(o0)\nrender(o0)'

  try {
    const info = await new Promise(resolve => repl.default.eval(source, resolve))

    assert.deepEqual(compiled, [source])
    assert.deepEqual(info, {
      isError: false,
      codeString: source,
      errorMessage: ''
    })
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser call-form validation payload (P007)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP007 = new SyntaxError("Cannot mix positional and keyword arguments at line 2 col 14")
  syntaxErrP007.diagnostic = {
    code: 'P007',
    stage: 'parser',
    severity: 'error',
    message: "Cannot mix positional and keyword arguments at line 2 col 14",
    location: { line: 2, column: 14 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrP007),
    "Cannot mix positional and keyword arguments at line 2 col 14"
  )

  const syntaxErrFromP007 = new SyntaxError("'from' requires exactly two arguments (namespace, call) at line 2 col 9")
  syntaxErrFromP007.diagnostic = {
    code: 'P007',
    stage: 'parser',
    severity: 'error',
    message: "'from' requires exactly two arguments (namespace, call) at line 2 col 9",
    location: { line: 2, column: 9 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrFromP007),
    "'from' requires exactly two arguments (namespace, call) at line 2 col 9"
  )

  const syntaxErrInlineNsP007 = new SyntaxError("Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead, at line 2 col 1")
  syntaxErrInlineNsP007.diagnostic = {
    code: 'P007',
    stage: 'parser',
    severity: 'error',
    message: "Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead, at line 2 col 1",
    location: { line: 2, column: 1 },
    span: null
  }
  assert.equal(
    formatError(syntaxErrInlineNsP007),
    "Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead, at line 2 col 1"
  )

  const plainObjectP007 = {
    diagnostic: {
      code: 'P007',
      stage: 'parser',
      severity: 'error',
      message: "Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead",
      location: { line: 2, column: 1 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP007),
    "Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead (line 2, col 1)"
  )
})

test('formatError handles parser call-form validation diagnostics with explicit null location and span', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedCallForm = new SyntaxError("Cannot mix positional and keyword arguments")
  syntaxErrUnlocatedCallForm.diagnostic = {
    code: 'P007',
    stage: 'parser',
    severity: 'error',
    message: "Cannot mix positional and keyword arguments",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedCallForm),
    "Cannot mix positional and keyword arguments"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser call-form validation diagnostic (P007)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Cannot mix positional and keyword arguments at line 2 col 14")
  syntaxErr.diagnostic = {
    code: 'P007',
    stage: 'parser',
    severity: 'error',
    message: "Cannot mix positional and keyword arguments at line 2 col 14",
    location: { line: 2, column: 14 },
    span: null
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\ndiagProbe(1, x: 2)', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Cannot mix positional and keyword arguments at line 2 col 14")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles parser expectation diagnostics with explicit null location and span for number coercion', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrNumber = new SyntaxError("Expected number")
  syntaxErrNumber.diagnostic = {
    code: 'P001',
    stage: 'parser',
    severity: 'error',
    message: "Expected number",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrNumber),
    "Expected number"
  )
})

test('forwards from() and call expressions through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  const originalWindow = global.window
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth\nlet x = from(synth, probe())\nrender(o0)'

  try {
    const info = await new Promise(resolve => repl.default.eval(source, resolve))

    assert.deepEqual(compiled, [source])
    assert.deepEqual(info, {
      isError: false,
      codeString: source,
      errorMessage: ''
    })
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles parser expectation diagnostics with structured source location for number coercion (P001)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrNumber = new SyntaxError("Expected number")
  syntaxErrNumber.diagnostic = {
    code: 'P001',
    stage: 'parser',
    severity: 'error',
    message: "Expected number",
    location: { line: 2, column: 9 },
    span: { start: 21, end: 24 }
  }
  assert.equal(
    formatError(syntaxErrNumber),
    "Expected number (line 2, col 9)"
  )
})

test('repl.eval formats compiler syntax errors carrying structured number coercion diagnostic with source location (P001)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Expected number")
  syntaxErr.diagnostic = {
    code: 'P001',
    stage: 'parser',
    severity: 'error',
    message: "Expected number",
    location: { line: 2, column: 9 },
    span: { start: 21, end: 24 }
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nlet y = [1] + 1', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Expected number (line 2, col 9)")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser subchain validation payload (P008)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP008 = new SyntaxError("Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id")
  syntaxErrP008.diagnostic = {
    code: 'P008',
    stage: 'parser',
    severity: 'warning',
    message: "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id",
    location: { line: 2, column: 19 },
    span: { start: 30, end: 33 }
  }
  assert.equal(
    formatError(syntaxErrP008),
    "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id"
  )

  const plainObjectP008 = {
    diagnostic: {
      code: 'P008',
      stage: 'parser',
      severity: 'warning',
      message: "Unknown subchain argument 'nme'. Supported arguments are: name, id",
      location: { line: 2, column: 19 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP008),
    "Unknown subchain argument 'nme'. Supported arguments are: name, id (line 2, col 19)"
  )
})

test('formatError handles parser subchain validation diagnostics with explicit null location and span (P008)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedP008 = new SyntaxError("Unknown subchain argument 'nme'")
  syntaxErrUnlocatedP008.diagnostic = {
    code: 'P008',
    stage: 'parser',
    severity: 'warning',
    message: "Unknown subchain argument 'nme'",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedP008),
    "Unknown subchain argument 'nme'"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser subchain validation diagnostic (P008)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id")
  syntaxErr.diagnostic = {
    code: 'P008',
    stage: 'parser',
    severity: 'error',
    message: "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id",
    location: { line: 2, column: 19 },
    span: { start: 30, end: 33 }
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nnoise().subchain(nme: "x") { .invert() }', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser subchain validation payload (P009)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP009 = new SyntaxError("Duplicate subchain argument 'name' at line 2 col 31")
  syntaxErrP009.diagnostic = {
    code: 'P009',
    stage: 'parser',
    severity: 'warning',
    message: "Duplicate subchain argument 'name' at line 2 col 31",
    location: { line: 2, column: 31 },
    span: { start: 42, end: 46 }
  }
  assert.equal(
    formatError(syntaxErrP009),
    "Duplicate subchain argument 'name' at line 2 col 31"
  )

  const plainObjectP009 = {
    diagnostic: {
      code: 'P009',
      stage: 'parser',
      severity: 'warning',
      message: "Duplicate subchain argument 'name'",
      location: { line: 2, column: 31 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP009),
    "Duplicate subchain argument 'name' (line 2, col 31)"
  )
})

test('formatError handles parser subchain validation diagnostics with explicit null location and span (P009)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedP009 = new SyntaxError("Duplicate subchain argument 'name'")
  syntaxErrUnlocatedP009.diagnostic = {
    code: 'P009',
    stage: 'parser',
    severity: 'warning',
    message: "Duplicate subchain argument 'name'",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedP009),
    "Duplicate subchain argument 'name'"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser subchain validation diagnostic (P009)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Duplicate subchain argument 'name' at line 2 col 31")
  syntaxErr.diagnostic = {
    code: 'P009',
    stage: 'parser',
    severity: 'error',
    message: "Duplicate subchain argument 'name' at line 2 col 31",
    location: { line: 2, column: 31 },
    span: { start: 42, end: 46 }
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nnoise().subchain(name: "a", name: "b") { .invert() }', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Duplicate subchain argument 'name' at line 2 col 31")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles singular diagnostic property with structured parser subchain validation payload (P010)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrP010 = new SyntaxError("Missing ',' between subchain arguments at line 2 col 28")
  syntaxErrP010.diagnostic = {
    code: 'P010',
    stage: 'parser',
    severity: 'warning',
    message: "Missing ',' between subchain arguments at line 2 col 28",
    location: { line: 2, column: 28 },
    span: { start: 39, end: 41 }
  }
  assert.equal(
    formatError(syntaxErrP010),
    "Missing ',' between subchain arguments at line 2 col 28"
  )

  const plainObjectP010 = {
    diagnostic: {
      code: 'P010',
      stage: 'parser',
      severity: 'warning',
      message: "Missing ',' between subchain arguments",
      location: { line: 2, column: 28 },
      span: null
    }
  }
  assert.equal(
    formatError(plainObjectP010),
    "Missing ',' between subchain arguments (line 2, col 28)"
  )
})

test('formatError handles parser subchain validation diagnostics with explicit null location and span (P010)', async () => {
  const { formatError } = await loadRepl()
  const syntaxErrUnlocatedP010 = new SyntaxError("Missing ',' between subchain arguments")
  syntaxErrUnlocatedP010.diagnostic = {
    code: 'P010',
    stage: 'parser',
    severity: 'warning',
    message: "Missing ',' between subchain arguments",
    location: null,
    span: null
  }
  assert.equal(
    formatError(syntaxErrUnlocatedP010),
    "Missing ',' between subchain arguments"
  )
})

test('repl.eval formats compiler syntax errors carrying structured parser subchain validation diagnostic (P010)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const syntaxErr = new SyntaxError("Missing ',' between subchain arguments at line 2 col 28")
  syntaxErr.diagnostic = {
    code: 'P010',
    stage: 'parser',
    severity: 'error',
    message: "Missing ',' between subchain arguments at line 2 col 28",
    location: { line: 2, column: 28 },
    span: { start: 39, end: 41 }
  }
  global.window = {
    hydraSynth: {
      async compile() { throw syntaxErr }
    }
  }

  try {
    const info = await new Promise(resolve => repl.default.eval('search synth\nnoise().subchain(name: "a" id: "b") { .invert() }', resolve))
    assert.equal(info.isError, true)
    assert.equal(info.errorMessage, "Missing ',' between subchain arguments at line 2 col 28")
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles multiple subchain validation diagnostics in diagnostics list (P008/P009/P010)', async () => {
  const { formatError } = await loadRepl()
  const multiDiag = {
    diagnostics: [
      {
        code: 'P008',
        stage: 'parser',
        severity: 'warning',
        message: "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id",
        location: { line: 2, column: 19 }
      },
      {
        code: 'P010',
        stage: 'parser',
        severity: 'warning',
        message: "Missing ',' between subchain arguments at line 2 col 28",
        location: { line: 2, column: 28 }
      },
      {
        code: 'P009',
        stage: 'parser',
        severity: 'warning',
        message: "Duplicate subchain argument 'name' at line 2 col 35",
        location: { line: 2, column: 35 }
      }
    ]
  }
  assert.equal(
    formatError(multiDiag),
    "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id; Missing ',' between subchain arguments at line 2 col 28; Duplicate subchain argument 'name' at line 2 col 35"
  )
})

test('forwards subchain expressions with multiple keyword arguments through repl.eval to compiler', async () => {
  const repl = await loadRepl()
  const compiled = []
  const originalWindow = global.window
  global.window = {
    hydraSynth: {
      async compile(source) { compiled.push(source) }
    }
  }
  const source = 'search hydra, synth\nnoise().subchain(name: "loop", id: "sub1") { .invert() }.write(o0)\nrender(o0)'

  try {
    const info = await new Promise(resolve => repl.default.eval(source, resolve))

    assert.deepEqual(compiled, [source])
    assert.deepEqual(info, {
      isError: false,
      codeString: source,
      errorMessage: ''
    })
  } finally {
    global.window = originalWindow
  }
})

test('formatError prioritizes diagnostics array attached to Error instances for subchain validation', async () => {
  const { formatError } = await loadRepl()
  const errorInstance = new Error("Generic compilation error")
  errorInstance.diagnostics = [
    {
      code: 'P008',
      stage: 'parser',
      severity: 'warning',
      message: "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id",
      location: { line: 2, column: 19 }
    },
    {
      code: 'P010',
      stage: 'parser',
      severity: 'warning',
      message: "Missing ',' between subchain arguments at line 2 col 28",
      location: { line: 2, column: 28 }
    }
  ]
  assert.equal(
    formatError(errorInstance),
    "Unknown subchain argument 'nme' at line 2 col 19. Supported arguments are: name, id; Missing ',' between subchain arguments at line 2 col 28"
  )
})

test('formatError handles effect definition validation errors in errors array (GAP-003)', async () => {
  const { formatError } = await loadRepl()
  const singleErr = {
    errors: [
      "Effect definition requires non-empty string name"
    ]
  }
  assert.equal(
    formatError(singleErr),
    "Effect definition requires non-empty string name"
  )

  const validationErr = {
    errors: [
      "Effect definition requires non-empty string name",
      "Global 'speed' default is out of range [0, 1]"
    ]
  }
  assert.equal(
    formatError(validationErr),
    "Effect definition requires non-empty string name; Global 'speed' default is out of range [0, 1]"
  )
})

test('formatError handles Error instance with validation errors array (GAP-003)', async () => {
  const { formatError } = await loadRepl()
  const err = new Error("Effect definition validation failed")
  err.errors = [
    "Pass 0 requires non-empty string program",
    "Unknown tag 'invalidTag' in tags array"
  ]
  assert.equal(
    formatError(err),
    "Pass 0 requires non-empty string program; Unknown tag 'invalidTag' in tags array"
  )
})

test('repl.eval formats compiler errors carrying effect definition validation failures (GAP-003)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const validationErr = new Error("Invalid effect definition")
  validationErr.errors = [
    "Effect definition must declare passes array",
    "Global 'color' has invalid type 'unknown'"
  ]
  global.window = {
    hydraSynth: {
      async compile() { throw validationErr }
    }
  }
  try {
    const info = await new Promise(resolve => repl.default.eval('search hydra\nnoise().write(o0)\nrender(o0)', resolve))
    assert.equal(info.isError, true)
    assert.equal(
      info.errorMessage,
      "Effect definition must declare passes array; Global 'color' has invalid type 'unknown'"
    )
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles texture policy validation errors in errors array (noisemaker@2f47612c texture policy)', async () => {
  const { formatError } = await loadRepl()
  const singleErr = {
    errors: [
      "Texture 'noiseTex': \"filter\" is only supported on 3D texture specs (\"textures3d\")"
    ]
  }
  assert.equal(
    formatError(singleErr),
    "Texture 'noiseTex': \"filter\" is only supported on 3D texture specs (\"textures3d\")"
  )

  const validationErr = {
    errors: [
      "Texture 'mipTex': \"mipmaps\" is only supported on 2D texture specs (\"textures\")",
      "Texture 'mipTex': unknown filter 'trilinear' (expected 'nearest' or 'linear')"
    ]
  }
  assert.equal(
    formatError(validationErr),
    "Texture 'mipTex': \"mipmaps\" is only supported on 2D texture specs (\"textures\"); Texture 'mipTex': unknown filter 'trilinear' (expected 'nearest' or 'linear')"
  )
})

test('formatError handles Error instance with texture policy errors array (noisemaker@2f47612c texture policy)', async () => {
  const { formatError } = await loadRepl()
  const err = new Error("Effect definition validation failed")
  err.errors = [
    "Texture 'persistTex': \"persistent\" must be a boolean",
    "Texture 'mipTex': \"mipmaps\" must be a boolean"
  ]
  assert.equal(
    formatError(err),
    "Texture 'persistTex': \"persistent\" must be a boolean; Texture 'mipTex': \"mipmaps\" must be a boolean"
  )
})

test('repl.eval formats compiler errors carrying texture policy validation failures (noisemaker@2f47612c texture policy)', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const validationErr = new Error("Invalid effect definition")
  validationErr.errors = [
    "Texture 'noiseTex': \"filter\" is only supported on 3D texture specs (\"textures3d\")",
    "Texture 'mipTex': \"mipmaps\" must be a boolean"
  ]
  global.window = {
    hydraSynth: {
      async compile() { throw validationErr }
    }
  }
  try {
    const info = await new Promise(resolve => repl.default.eval('search hydra\nnoise().write(o0)\nrender(o0)', resolve))
    assert.equal(info.isError, true)
    assert.equal(
      info.errorMessage,
      "Texture 'noiseTex': \"filter\" is only supported on 3D texture specs (\"textures3d\"); Texture 'mipTex': \"mipmaps\" must be a boolean"
    )
  } finally {
    global.window = originalWindow
  }
})

test('formatError handles pass property validation errors in errors array (GAP-005)', async () => {
  const { formatError } = await loadRepl()
  const passPolicyErr = {
    errors: [
      "Pass 0 property 'viewport' must be an object with numeric x, y, width, height",
      "Pass 0 property 'samplerTypes' must be an object mapping sampler names to sampler type strings"
    ]
  }
  assert.equal(
    formatError(passPolicyErr),
    "Pass 0 property 'viewport' must be an object with numeric x, y, width, height; Pass 0 property 'samplerTypes' must be an object mapping sampler names to sampler type strings"
  )
})

test('repl.eval formats compiler errors carrying GAP-005 pass property validation failures', async () => {
  const repl = await loadRepl()
  const originalWindow = global.window
  const validationErr = new Error("Invalid effect definition contract")
  validationErr.errors = [
    "Pass 0 property 'name' must be a non-empty string",
    "Pass 0 property 'clear' must be a boolean"
  ]
  global.window = {
    hydraSynth: {
      async compile() { throw validationErr }
    }
  }
  try {
    const info = await new Promise(resolve => repl.default.eval('search hydra\nnoise().write(o0)\nrender(o0)', resolve))
    assert.equal(info.isError, true)
    assert.equal(
      info.errorMessage,
      "Pass 0 property 'name' must be a non-empty string; Pass 0 property 'clear' must be a boolean"
    )
  } finally {
    global.window = originalWindow
  }
})

