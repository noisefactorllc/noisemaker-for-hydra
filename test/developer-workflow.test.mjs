import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'

async function loadGallery() {
  const result = await build({
    entryPoints: ['src/stores/gallery.js'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false
  })
  const url = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  return import(url)
}

function installWindow(historyCalls) {
  globalThis.window = {
    location: { protocol: 'http:', host: 'localhost:5173', pathname: '/', search: '' },
    history: {
      pushState(state, title, url) { historyCalls.push(['pushState', url]) },
      replaceState(state, title, url) { historyCalls.push(['replaceState', url]) }
    },
    addEventListener() {}
  }
}

test('gallery clear removes the saved program from the URL (GAP-002 input removal)', async () => {
  const Gallery = (await loadGallery()).default
  const historyCalls = []
  const loaded = []
  installWindow(historyCalls)
  const gallery = new Gallery((code, sketchFromURL) => {
    loaded.push([code, sketchFromURL])
  }, { serverURL: null }, {})

  const source = 'search hydra\nnoise(scale: 5).write(o0)\n\nrender(o0)'
  gallery.saveLocally(source)
  const savedUrl = historyCalls[historyCalls.length - 1][1]
  assert.match(savedUrl, /code=/)

  gallery.clear()
  const clearedUrl = historyCalls[historyCalls.length - 1][1]
  assert.doesNotMatch(clearedUrl, /code=/)
  assert.equal(gallery.code, null)
  assert.equal(gallery.current, null)
})

test('gallery restores the saved program from a URL code parameter (GAP-002 URL restoration)', async () => {
  const Gallery = (await loadGallery()).default
  const historyCalls = []
  const loaded = []
  installWindow(historyCalls)
  const gallery = new Gallery((code, sketchFromURL) => {
    loaded.push([code, sketchFromURL])
  }, { serverURL: null }, {})

  const source = 'search hydra\nnoise(scale: 5).write(o0)\n\nrender(o0)'
  const encoded = Buffer.from(encodeURIComponent(source)).toString('base64')
  gallery.setSketchFromURL(`?code=${encoded}`, (code, found) => {
    loaded.push([code, found])
  })

  const last = loaded[loaded.length - 1]
  assert.equal(last[0], source)
  assert.equal(last[1], true)
  assert.equal(gallery.code, source)
})

test('gallery restores a code parameter recorded from the scheme at revision 626f37c (GAP-003 saved-sketch upgrade)', async () => {
  const Gallery = (await loadGallery()).default
  const historyCalls = []
  const loaded = []
  const emitted = []
  installWindow(historyCalls)
  const gallery = new Gallery((code, sketchFromURL) => {
    loaded.push([code, sketchFromURL])
  }, { serverURL: null }, { emit: (name) => emitted.push(name) })

  // Revision 626f37c (the source recorded by the previously served demo)
  // encodes saved programs as btoa(encodeURIComponent(source)), verified by
  // `git show 626f37c21170927e7c24429ca2c8f31cf38905ec:src/stores/gallery.js`
  // (lines 159-164 there; identical lines in the current tree).
  // The parameter below is that encoding of savedProgram, fixed as a literal
  // so this test restores recorded bytes rather than re-running the encoder.
  const savedProgram = 'search hydra, render\n\nnoise(scale: 5)\n  .write(o0)\n\nrender(o0)'
  const codeParamRecordedFromRevision626f37cScheme =
    'c2VhcmNoJTIwaHlkcmElMkMlMjByZW5kZXIlMEElMEFub2lzZShzY2FsZSUzQSUyMDUpJTBBJTIwJTIwLndyaXRlKG8wKSUwQSUwQXJlbmRlcihvMCk='

  gallery.setSketchFromURL(
    `?code=${codeParamRecordedFromRevision626f37cScheme}&show-code=false`,
    (code, found) => { loaded.push([code, found]) }
  )

  const last = loaded[loaded.length - 1]
  assert.equal(last[1], true)
  assert.equal(gallery.code, savedProgram)
  assert.ok(emitted.includes('ui: hide all'))
})
