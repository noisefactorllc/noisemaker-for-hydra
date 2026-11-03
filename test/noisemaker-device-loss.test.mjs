/**
 * Focused tests for the WebGPU device-loss watch the runtime patches onto
 * the engine CanvasRenderer (upstream 7153bec43607). The semantics mirror
 * upstream shaders/tests/test_webgpu_device_loss_recovery.mjs: a loss of the
 * current pipeline's device goes through the same handling as a lost WebGL
 * context (stop, onContextLost, rebuild on a fresh canvas), a device lost
 * after the renderer moved to another pipeline changes nothing, and a
 * disposed renderer records the loss but rebuilds nothing.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import { patchDeviceLossWatch } from '../src/lib/noisemaker-device-loss.mjs'

// Mirrors upstream bareRenderer: the engine surface the watch patch reaches
// into, without the engine bundle.
function fakeRenderer ({ events = [], fail = { active: false } } = {}) {
  const renderer = {
    _lifecycleGeneration: 0,
    _isDisposed: false,
    _isContextLost: false,
    _wasRunningBeforeContextLoss: false,
    _contextLostBeforeSecondFrame: false,
    _isRunning: false,
    _frameCount: 0,
    _pipeline: null,
    _currentDsl: 'search synth\nrender(o0)',
    _onContextLost: () => {
      events.push(['contextLost'])
    },
    stop: () => {
      renderer._isRunning = false
      events.push(['stop'])
    },
    _scheduleContextRecovery: () => {
      events.push(['scheduleRecovery'])
      renderer._contextRecoveryTimer = setTimeout(() => {}, 3000)
    },
    _clearContextRecovery: () => {
      if (renderer._contextRecoveryTimer !== null) {
        clearTimeout(renderer._contextRecoveryTimer)
        renderer._contextRecoveryTimer = null
      }
    },
    _contextRecoveryTimer: null,
    _isLifecycleCurrent: (generation) => renderer._lifecycleGeneration === generation,
    _rebuildsAfterContextLoss: () => true,
    _queueCompile: (run) => run(),
    _compile: async () => {
      if (fail.active) throw new Error('compile failed')
      events.push(['compile'])
      return renderer._pipeline
    },
    compile: async (dsl, options) => renderer._compile(dsl, options)
  }
  return renderer
}

// A pipeline whose WebGPU device is healthy: its lost promise stays pending
// until loseDevice(info) resolves it, like a real GPUDevice.destroy().
function devicePipeline () {
  let loseDevice
  const lost = new Promise(resolve => { loseDevice = resolve })
  return {
    backend: {
      isContextLost: false,
      device: { lost }
    },
    loseDevice: (info) => loseDevice(info)
  }
}

async function flushDevicePromises () {
  await new Promise(resolve => setTimeout(resolve, 0))
}

function patchedRenderer (options) {
  const renderer = fakeRenderer(options)
  assert.equal(patchDeviceLossWatch(renderer), true)
  return renderer
}

test('a lost WebGPU device on the current pipeline routes through the backend-lost handling', async () => {
  const events = []
  const renderer = patchedRenderer({ events })
  const pipeline = devicePipeline()
  renderer._pipeline = pipeline
  renderer._isRunning = true

  await renderer.compile('search synth\nnoise().write(o0)\nrender(o0)')
  pipeline.loseDevice({ reason: 'destroyed', message: 'The device was destroyed' })
  await flushDevicePromises()

  assert.equal(renderer._isContextLost, true, 'the loss is recorded')
  assert.equal(renderer._wasRunningBeforeContextLoss, true, 'the running state is captured')
  assert.equal(renderer._isRunning, false, 'the loop is stopped')
  assert.equal(pipeline.backend.isContextLost, true, 'the pipeline backend is marked lost')
  assert.notEqual(renderer._contextRecoveryTimer, null, 'a recovery rebuild is scheduled')
  assert.deepEqual(events.filter(([kind]) => kind === 'stop').length, 1, 'stop runs once')
  assert.equal(events.some(([kind]) => kind === 'contextLost'), true, 'the host onContextLost hook runs')
  renderer._clearContextRecovery()
})

test('the loss message prefers the device info message and falls back through reason', async () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (message) => warnings.push(message)
  try {
    for (const [info, expected] of [
      [{ reason: 'destroyed', message: 'device destroyed by host' }, '[Canvas] WebGPU device lost: device destroyed by host'],
      [{ reason: 'unknown' }, '[Canvas] WebGPU device lost: unknown'],
      [null, '[Canvas] WebGPU device lost: unknown reason']
    ]) {
      const renderer = patchedRenderer()
      const pipeline = devicePipeline()
      renderer._pipeline = pipeline
      renderer._isRunning = true
      await renderer._compile('search synth\nrender(o0)')
      pipeline.loseDevice(info)
      await flushDevicePromises()
      assert.equal(warnings.at(-1), expected)
    }
  } finally {
    console.warn = originalWarn
  }
})

test('a device lost after the renderer moved to another pipeline changes nothing', async () => {
  const events = []
  const renderer = patchedRenderer({ events })
  const retired = devicePipeline()
  renderer._pipeline = retired
  await renderer.compile('search synth\nnoise().write(o0)\nrender(o0)')

  // The next compile replaces the pipeline; the retired device is then lost.
  const replacement = devicePipeline()
  renderer._pipeline = replacement
  await renderer.compile('search synth\nnoise(speed: 2).write(o0)\nrender(o0)')
  retired.loseDevice({ reason: 'destroyed' })
  await flushDevicePromises()

  assert.equal(renderer._isContextLost, false, 'a retired device loss is ignored')
  assert.deepEqual(events.filter(([kind]) => kind === 'stop').length, 0)
  assert.equal(renderer._contextRecoveryTimer, null, 'no recovery is scheduled')
})

test('a device loss on a disposed renderer changes nothing at all', async () => {
  const events = []
  const renderer = patchedRenderer({ events })
  const pipeline = devicePipeline()
  renderer._pipeline = pipeline
  await renderer.compile('search synth\nnoise().write(o0)\nrender(o0)')
  renderer._isDisposed = true

  pipeline.loseDevice({ reason: 'destroyed' })
  await flushDevicePromises()

  // Upstream _watchDeviceLoss returns before _onBackendLost for a disposed
  // renderer: the loss is neither recorded nor handled.
  assert.equal(renderer._isContextLost, false, 'a disposed renderer does not record the loss')
  assert.deepEqual(events.filter(([kind]) => kind === 'stop').length, 0, 'a disposed renderer does not stop anything')
  assert.equal(renderer._contextRecoveryTimer, null, 'a disposed renderer schedules no recovery')
  assert.equal(events.some(([kind]) => kind === 'contextLost'), false, 'the host hook does not run')
})

test('one watch attaches per pipeline, so a recompile in place handles a loss once', async () => {
  const events = []
  const renderer = patchedRenderer({ events })
  const pipeline = devicePipeline()
  renderer._pipeline = pipeline
  await renderer.compile('search synth\nnoise().write(o0)\nrender(o0)')
  await renderer.compile('search synth\nnoise(speed: 3).write(o0)\nrender(o0)')

  pipeline.loseDevice({ reason: 'destroyed' })
  await flushDevicePromises()

  assert.deepEqual(events.filter(([kind]) => kind === 'stop').length, 1, 'the loss handling ran once')
  renderer._clearContextRecovery()
})

test('every new pipeline gets a watch, including one built after a disposal re-enables recovery', async () => {
  const events = []
  const renderer = patchedRenderer({ events })
  const first = devicePipeline()
  renderer._pipeline = first
  await renderer.compile('search synth\nnoise().write(o0)\nrender(o0)')

  const second = devicePipeline()
  renderer._pipeline = second
  await renderer.compile('search synth\nnoise(speed: 1).write(o0)\nrender(o0)')
  second.loseDevice({ reason: 'destroyed' })
  await flushDevicePromises()

  assert.equal(renderer._isContextLost, true, 'the replacement pipeline is watched')
  assert.deepEqual(events.filter(([kind]) => kind === 'stop').length, 1)
  renderer._clearContextRecovery()
})

test('a rejected build still leaves the current pipeline watched', async () => {
  const events = []
  const fail = { active: true }
  const renderer = patchedRenderer({ events, fail })
  const pipeline = devicePipeline()
  renderer._pipeline = pipeline

  await assert.rejects(renderer.compile('search synth\nrender(o0)'), /compile failed/)
  pipeline.loseDevice({ reason: 'destroyed' })
  await flushDevicePromises()

  assert.equal(renderer._isContextLost, true, 'the loss routes through the backend-lost handling')
  assert.equal(events.some(([kind]) => kind === 'stop'), true)
  renderer._clearContextRecovery()
})

test('forward safety: a bundle carrying the watch natively is left as published', () => {
  const renderer = fakeRenderer()
  renderer._watchDeviceLoss = () => {}
  const before = renderer._compile
  assert.equal(patchDeviceLossWatch(renderer), false)
  assert.equal(renderer._compile, before, 'the native surface stays as published')
})

test('a renderer without the watched surface is not patched', () => {
  assert.equal(patchDeviceLossWatch(null), false)
  assert.equal(patchDeviceLossWatch({ _compile: () => {} }), false)
})
