import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  MEDIA_INPUT_GLSL,
  MEDIA_INPUT_WGSL,
  TILE_UNIFORM_LAYOUT,
  patchMediaTile
} from '../src/lib/noisemaker-media-tile.mjs'

function fakeRenderer (withMedia = true) {
  const mediaInstance = {
    uniformLayout: {
      resolution: { slot: 0, components: 'xy' },
      time: { slot: 0, components: 'z' },
      position: { slot: 1, components: 'x' },
      rotation: { slot: 1, components: 'y' },
      scaleAmt: { slot: 1, components: 'z' },
      offsetX: { slot: 1, components: 'w' },
      offsetY: { slot: 2, components: 'x' },
      tiling: { slot: 2, components: 'y' },
      flip: { slot: 2, components: 'z' },
      bgAlpha: { slot: 2, components: 'w' },
      bgColor: { slot: 3, components: 'xyz' },
      imageSize: { slot: 4, components: 'xy' }
    },
    shaders: {
      mediaInput: { glsl: 'OLD GLSL', wgsl: 'OLD WGSL' }
    }
  }
  const loaded = new Map()
  if (withMedia) {
    loaded.set('synth/media', { namespace: 'synth', name: 'media', instance: mediaInstance })
  }
  return { _loadedEffects: loaded }
}

test('TILE_UNIFORM_LAYOUT matches upstream fde974e5 slot 5 packing', () => {
  assert.deepEqual(TILE_UNIFORM_LAYOUT, {
    tileOffset: { slot: 5, components: 'xy' },
    fullResolution: { slot: 5, components: 'zw' }
  })
})

test('patched WGSL declares a 6-slot uniform array and reads slot 5', () => {
  assert.match(MEDIA_INPUT_WGSL, /data : array<vec4<f32>, 6>/)
  assert.match(MEDIA_INPUT_WGSL, /tileOffset = uniforms\.data\[5\]\.xy;/)
  assert.match(MEDIA_INPUT_WGSL, /fullResolution = uniforms\.data\[5\]\.zw;/)
})

test('patched GLSL declares the tile uniforms and offsets by tileOffset', () => {
  assert.match(MEDIA_INPUT_GLSL, /uniform vec2 tileOffset;/)
  assert.match(MEDIA_INPUT_GLSL, /uniform vec2 fullResolution;/)
  assert.match(MEDIA_INPUT_GLSL, /if \(tileOffset\.x == 0\.0 && tileOffset\.y == 0\.0\) \{\n        st = gl_FragCoord\.xy \/ size;\n    \} else \{\n        st = \(gl_FragCoord\.xy \+ tileOffset\) \/ size;\n    \}/)
  assert.match(MEDIA_INPUT_GLSL, /fullResolution\.x > 0\.0 \? fullResolution : resolution/)
})

test('patchMediaTile extends the loaded media uniform layout with slot 5', () => {
  const renderer = fakeRenderer(true)
  const entry = patchMediaTile(renderer)
  assert.ok(entry, 'patchMediaTile returns the loaded effect entry')
  const layout = entry.instance.uniformLayout
  assert.equal(layout.tileOffset.slot, 5)
  assert.equal(layout.tileOffset.components, 'xy')
  assert.equal(layout.fullResolution.slot, 5)
  assert.equal(layout.fullResolution.components, 'zw')
  // Existing entries are preserved.
  assert.equal(layout.imageSize.slot, 4)
  assert.equal(layout.bgColor.slot, 3)
})

test('patchMediaTile swaps in the tile-aware mediaInput shader sources', () => {
  const renderer = fakeRenderer(true)
  patchMediaTile(renderer)
  const shaders = renderer._loadedEffects.get('synth/media').instance.shaders
  assert.equal(shaders.mediaInput.glsl, MEDIA_INPUT_GLSL)
  assert.equal(shaders.mediaInput.wgsl, MEDIA_INPUT_WGSL)
  assert.notEqual(shaders.mediaInput.glsl, 'OLD GLSL')
})

test('patchMediaTile returns null when synth/media is not loaded', () => {
  const renderer = fakeRenderer(false)
  assert.equal(patchMediaTile(renderer), null)
})

test('patchMediaTile tolerates a renderer without _loadedEffects', () => {
  assert.equal(patchMediaTile({}), null)
  assert.equal(patchMediaTile(null), null)
})

// Upstream reference: noisefactorllc/noisemaker commits fde974e58a0d
// ("LEDGER: make synth/media tile-aware for tiled print export") and
// 668b82ea1f7b ("LEDGER: keep synth/media's untiled sampling path
// bit-identical"). File copies are committed under test/fixtures/ so the
// byte identity of the port is mechanically checkable without upstream
// access: definition.js pins the slot 5 contract at fde974e5, and the
// mediaInput shader sources pin the current tile-aware sources at 668b82ea
// (fde974e5 and 668b82ea agree on the definition.js contract).

test('embedded GLSL mediaInput is byte-identical to upstream 668b82ea', () => {
  const upstream = readFileSync(new URL('./fixtures/upstream-668b82ea/glsl-mediaInput.glsl', import.meta.url))
  assert.equal(createHash('sha256').update(upstream).digest('hex'),
    '39286ea42ba84515178be96bb070aad7bcd383ad5ae91c3332c5f5bc09eb24bf',
    'upstream GLSL fixture sha256 (pinned reference)')
  assert.equal(Buffer.from(MEDIA_INPUT_GLSL, 'utf8').toString('hex'), upstream.toString('hex'),
    'MEDIA_INPUT_GLSL is byte-identical to upstream 668b82ea glsl/mediaInput.glsl')
})

test('embedded WGSL mediaInput is byte-identical to upstream 668b82ea', () => {
  const upstream = readFileSync(new URL('./fixtures/upstream-668b82ea/wgsl-mediaInput.wgsl', import.meta.url))
  assert.equal(createHash('sha256').update(upstream).digest('hex'),
    'd6bb52fc65bc2c10cdf5073b3b9e6469028fd52a25db9e3abf848478735a7dcd',
    'upstream WGSL fixture sha256 (pinned reference)')
  assert.equal(Buffer.from(MEDIA_INPUT_WGSL, 'utf8').toString('hex'), upstream.toString('hex'),
    'MEDIA_INPUT_WGSL is byte-identical to upstream 668b82ea wgsl/mediaInput.wgsl')
})

test('TILE_UNIFORM_LAYOUT matches the upstream definition.js slot 5 contract', () => {
  const upstream = readFileSync(new URL('./fixtures/upstream-fde974e5/definition.js', import.meta.url), 'utf8')
  assert.match(upstream, /uniformLayout = \{/, 'upstream definition.js declares uniformLayout')
  const tileOffset = upstream.match(/tileOffset: \{ slot: (\d+), components: '(\w+)' \}/)
  const fullResolution = upstream.match(/fullResolution: \{ slot: (\d+), components: '(\w+)' \}/)
  assert.ok(tileOffset, 'upstream declares tileOffset layout')
  assert.ok(fullResolution, 'upstream declares fullResolution layout')
  assert.deepEqual(TILE_UNIFORM_LAYOUT.tileOffset, {
    slot: Number(tileOffset[1]), components: tileOffset[2]
  })
  assert.deepEqual(TILE_UNIFORM_LAYOUT.fullResolution, {
    slot: Number(fullResolution[1]), components: fullResolution[2]
  })
})
