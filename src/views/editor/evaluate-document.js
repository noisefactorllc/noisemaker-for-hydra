export function evaluateDocument(editor, flashSelection) {
  flashSelection()
  editor.emit('repl: eval', editor.cm.getValue())
}
