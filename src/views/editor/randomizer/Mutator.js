import UndoStack from './UndoStack.js'

function collectNumbers(value, result = []) {
  if (!value || typeof value !== 'object') return result
  if (value.type === 'Number' && typeof value.value === 'number') {
    result.push(value)
    return result
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'loc') collectNumbers(child, result)
  }
  return result
}

function runtime() {
  const renderer = window.hydraSynth
  const engine = renderer?.hydraEngine
  if (!renderer || !engine?.parse || !engine?.unparse) {
    throw new Error('Noisemaker parser is not ready')
  }
  return { renderer, engine }
}

function reportError(error) {
  if (typeof window._reportError === 'function') window._reportError(error)
}

function compile(renderer, source) {
  try {
    Promise.resolve(renderer.compile(source)).catch(reportError)
  } catch (error) {
    reportError(error)
  }
}

export default class Mutator {
  constructor(editor) {
    this.editor = editor
    this.undoStack = new UndoStack()
    this.initialVector = []
    this.lastLitX = undefined
  }

  mutate({ reroll = false } = {}) {
    const source = this.editor.cm.getValue()
    this.undoStack.push({ text: source, lastLitX: this.lastLitX })

    try {
      const { renderer, engine } = runtime()
      const ast = engine.parse(source)
      const numbers = collectNumbers(ast)
      if (numbers.length === 0) return source

      if (numbers.length !== this.initialVector.length) {
        this.initialVector = numbers.map(node => node.value)
      }
      const index = reroll && this.lastLitX != null
        ? this.lastLitX
        : Math.floor(Math.random() * numbers.length)
      this.lastLitX = index
      numbers[index].value = this.glitchRelToInit(
        numbers[index].value,
        this.initialVector[index]
      )

      const updated = engine.unparse(ast)
      this.editor.cm.setValue(updated)
      compile(renderer, updated)
      return updated
    } catch (error) {
      reportError(error)
      return source
    }
  }

  doUndo() {
    if (this.undoStack.atTop()) {
      this.undoStack.push({
        text: this.editor.cm.getValue(),
        lastLitX: this.lastLitX
      })
    }
    if (this.undoStack.canUndo()) {
      const { text, lastLitX } = this.undoStack.undo()
      this.lastLitX = lastLitX
      this.setText(text)
    }
  }

  doRedo() {
    if (this.undoStack.canRedo()) {
      const { text, lastLitX } = this.undoStack.redo()
      this.lastLitX = lastLitX
      this.setText(text)
    }
  }

  setText(text) {
    this.editor.cm.setValue(text)
    const renderer = window.hydraSynth
    if (renderer) compile(renderer, text)
  }

  glitchRelToInit(value, initialValue) {
    const basis = initialValue === 0 ? 0.5 : initialValue
    return Math.round(Math.random() * basis * 2 * 1000) / 1000
  }
}
