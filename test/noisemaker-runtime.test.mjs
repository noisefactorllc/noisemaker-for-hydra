import assert from 'node:assert/strict'
import test from 'node:test'

let runtimeModule = null
try {
  runtimeModule = await import('../src/lib/noisemaker-runtime.mjs')
} catch (_) {}

test('creates one initialized Noisemaker CanvasRenderer', async () => {
  assert.equal(typeof runtimeModule?.createNoisemakerRuntime, 'function')

  const calls = []
  class CanvasRenderer {
    constructor(options) {
      this.options = options
      this.manifest = {
        'synth/perlin': {},
        'filter/blur': {}
      }
      calls.push(['construct', options])
    }
    async loadManifest() { calls.push(['manifest']) }
    async loadEffects(ids) { calls.push(['effects', ids]) }
    start() { calls.push(['start']) }
    async compile(source) { calls.push(['compile', source]) }
  }
  const engine = { CanvasRenderer }
  const extension = {
    async loadHydraEffects(options) {
      calls.push(['hydra', options])
      return engine
    }
  }
  const canvas = { width: 640, height: 360 }

  const renderer = await runtimeModule.createNoisemakerRuntime({
    canvas,
    extension,
    cdn: 'https://example.invalid/noisemaker/1.2.3'
  })
  const source = 'search hydra\ngradient(speed: 0).write(o0)'
  await renderer.compile(source)

  assert.equal(renderer.hydraEngine, engine)

  assert.deepEqual(calls.map(([kind]) => kind), [
    'hydra', 'construct', 'manifest', 'effects', 'start', 'compile'
  ])
  assert.deepEqual(calls[0][1], {
    cdn: 'https://example.invalid/noisemaker/1.2.3'
  })
  assert.deepEqual(calls[1][1], {
    canvas,
    width: 640,
    height: 360,
    basePath: 'https://example.invalid/noisemaker/1.2.3',
    bundlePath: 'https://example.invalid/noisemaker/1.2.3/effects',
    useBundles: true,
    preferWebGPU: false
  })
  assert.deepEqual(calls[3][1], ['synth/perlin', 'filter/blur'])
  assert.deepEqual(calls[5], ['compile', source])
})

test('runtime preserves CanvasRenderer pipeline sink deferral and deferredFrameCount contract', async () => {
  assert.equal(typeof runtimeModule?.createNoisemakerRuntime, 'function')

  let deferredChecks = 0
  class MockPipeline {
    shouldDeferRender() {
      deferredChecks++
      return true
    }
  }

  class CanvasRenderer {
    constructor(options) {
      this.options = options
      this.manifest = {}
      this.pipeline = new MockPipeline()
      this._deferredFrameCount = 3
    }
    async loadManifest() {}
    async loadEffects() {}
    start() {}
    get deferredFrameCount() {
      return this._deferredFrameCount
    }
  }

  const engine = { CanvasRenderer }
  const extension = {
    async loadHydraEffects() { return engine }
  }
  const canvas = { width: 320, height: 240 }

  const renderer = await runtimeModule.createNoisemakerRuntime({
    canvas,
    extension,
    cdn: 'https://example.invalid/noisemaker/1.2.3'
  })

  assert.equal(typeof renderer.pipeline?.shouldDeferRender, 'function')
  assert.equal(renderer.pipeline.shouldDeferRender(), true)
  assert.equal(deferredChecks, 1)
  assert.equal(renderer.deferredFrameCount, 3)
})
