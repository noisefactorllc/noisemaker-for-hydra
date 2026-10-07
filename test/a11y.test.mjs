import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

// Regression guard: toolbar and extension controls must be real
// buttons carrying accessible names, and the editor surfaces must be
// labeled. The behavioral checks (Tab traversal, Enter/Space activation)
// run in the browser through scripts/a11y-keyboard.mjs and the DOM checks
// in scripts/test.mjs; this test keeps the source-level contract honest
// without a browser.

const toolbar = readFileSync(new URL('../src/views/toolbar.js', import.meta.url), 'utf8')
const extensionInfo = readFileSync(new URL('../src/views/extension-info.js', import.meta.url), 'utf8')
const editorComponent = readFileSync(new URL('../src/views/EditorComponent.js', import.meta.url), 'utf8')

test('toolbar controls are named buttons without negative tabindex', () => {
  // The shared helper renders a real button whose accessible name is the
  // translated title, with the decorative fontawesome icon aria-hidden.
  assert.match(toolbar, /<button type="button" id="\$\{id\}-button" class="icon-button" title="\$\{title\}" aria-label="\$\{title\}"/)
  assert.match(toolbar, /<i id="\$\{id\}-icon" class="fas icon \$\{className\}" aria-hidden="true"/)
  assert.doesNotMatch(toolbar, /tabindex/)
  // All six audited controls keep their ids and events.
  for (const id of ['"run"', '"clear"', '"add"', '"shuffle"', '"mutator"', '"close"']) {
    assert.match(toolbar, new RegExp(`icon\\(${id},`))
  }
  // Existing evaluation shortcut is preserved.
  assert.match(toolbar, /'editor: eval all'/)
})

test('extension controls are named buttons', () => {
  assert.match(extensionInfo, /<button type="button" id="\$\{id\}-button" class="icon-button extension-icon" title="\$\{title\}" aria-label="\$\{title\}"/)
  assert.doesNotMatch(extensionInfo, /extension-icon" title="\$\{title\}" onclick=\$\{event\} aria-hidden="true"/)
  // The example-number controls are buttons with accessible names too.
  assert.match(extensionInfo, /<button type="button" class="extension-icon example-icon" title="\$\{t\('extensions\.show-example'/)
  assert.match(extensionInfo, /aria-label="\$\{t\('extensions\.show-example'/)
})

test('editor surfaces carry accessible names', () => {
  assert.match(editorComponent, /<textarea aria-label="Hydra program editor">/)
  assert.match(editorComponent, /setAttribute\('role', 'textbox'\)/)
  assert.match(editorComponent, /setAttribute\('aria-label', 'Hydra program editor'\)/)
  assert.match(editorComponent, /getInputField\(\)/)
  assert.match(editorComponent, /role="log" aria-label="Editor diagnostics" aria-live="polite"/)
})
