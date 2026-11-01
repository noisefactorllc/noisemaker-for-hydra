import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
const local = createRequire(new URL('../package.json', import.meta.url))

test('all actual legacy consumers resolve the patched matcher and enforce its expansion bound', () => {
  const beautyGlob = createRequire(local.resolve('js-beautify')).resolve('glob')
  for (const [name, location] of [['glob', local.resolve('glob')], ['beautify glob', beautyGlob], ['filelist', local.resolve('filelist')], ['jake', local.resolve('jake')]]) {
    const load = createRequire(location)
    const matcher = load('minimatch')
    assert.equal(load('minimatch/package.json').name, 'minimatch-compat', name)
    assert.equal(typeof matcher, 'function')
    const compiled = new matcher.Minimatch('a/**/../b/**/../c/**/../d/**/../e/**/../f', { optimizationLevel: 2, braceExpandMax: 4 })
    assert.ok(compiled.globParts.length <= 4, name)
  }
})

test('both installed glob generations preserve real dot, nonull, brace and nested matches', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hydra-matcher-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  await fs.mkdir(path.join(dir, 'nested'))
  for (const p of ['main.js', '.hidden.js', 'nested/other.js', 'nested/plain.txt']) await fs.writeFile(path.join(dir, p), '')
  for (const load of [local, createRequire(local.resolve('js-beautify'))]) {
    const glob = load('glob')
    assert.deepEqual(glob.sync('**/*.js', { cwd: dir, dot: true }).sort(), ['.hidden.js', 'main.js', 'nested/other.js'])
    assert.deepEqual(glob.sync('**/.hidden.js', { cwd: dir }), ['.hidden.js'])
    assert.deepEqual(glob.sync('nested/*.{js,txt}', { cwd: dir }).sort(), ['nested/other.js', 'nested/plain.txt'])
    assert.deepEqual(glob.sync('missing-*.js', { cwd: dir, nonull: true }), ['missing-*.js'])
  }
  const { FileList } = local('filelist')
  assert.deepEqual(new FileList(path.join(dir, '**/*.js')).toArray().map(x => path.relative(dir, x)).sort(), ['main.js', 'nested/other.js'])
})
