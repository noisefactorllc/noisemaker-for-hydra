import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const files = [
  'index.html',
  'src/views/Hydra.js',
  'src/stores/store.js',
  'src/stores/gallery.js',
  'src/stores/gallery-store.js',
  'src/stores/repl-v2.js'
]

test('editor runtime contains no legacy Hydra execution surface', () => {
  const source = files.map(file => readFileSync(file, 'utf8')).join('\n')

  assert.doesNotMatch(source, /\bnew\s+Hydra\s*\(/)
  assert.doesNotMatch(source, /\bhush\s*\(/)
  assert.doesNotMatch(source, /\brender\s*\(\s*o\d/)
  assert.doesNotMatch(source, /\bscreencap\s*\(\s*\)/)
  assert.doesNotMatch(source, /hydra\.hydra/)
  assert.doesNotMatch(source, /window\.Hydra\b/)
  assert.doesNotMatch(source, /window\.eval\s*\(/)
})

test('canvas component stops and disposes its Noisemaker renderer', () => {
  const source = readFileSync('src/views/Hydra.js', 'utf8')

  assert.match(source, /\bunload\s*\(/)
  assert.match(source, /renderer\.stop\s*\(/)
  assert.match(source, /renderer\.dispose\s*\(/)
  assert.match(source, /return Promise\.resolve\(renderer\.dispose\(\)\)\.then\(\(\) => renderer\)/)
})

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:js|mjs)$/.test(entry.name) ? [path] : []
  })
}

test('contains no alternate JavaScript evaluator or its dependencies', () => {
  const source = sourceFiles('src').map(file => readFileSync(file, 'utf8')).join('\n')
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.doesNotMatch(source, /window\.eval\s*\(/)
  assert.equal(existsSync('src/views/editor/repl.js'), false)
  assert.equal(existsSync('src/views/editor/randomizer/glslTransforms.js'), false)
  for (const dependency of ['hydra-synth', 'acorn', 'astring', 'astravel']) {
    assert.equal(pkg.dependencies?.[dependency], undefined)
  }
})

test('active editor formats and clears with native Noisemaker syntax', () => {
  const source = readFileSync('src/views/editor/editor.js', 'utf8')

  assert.doesNotMatch(source, /js-beautify/)
  assert.match(source, /engine\.unparse\(engine\.parse\(this\.cm\.getValue\(\)\)\)/)
  assert.match(source, /search hydra\\n\\nhydraOsc\(\)\.write\(o0\)/)
  assert.doesNotMatch(source, /osc\(\)\.out\(\)/)
})

test('production assets contain no dormant legacy runtime bundle', () => {
  for (const file of [
    'public/bundle.js',
    'public/bundle.min.js',
    'public/bundle.min.js.map'
  ]) {
    assert.equal(existsSync(file), false)
  }
})
