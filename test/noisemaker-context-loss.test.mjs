/**
 * Focused tests for the disposed-renderer context-loss guards the runtime
 * patches onto the engine CanvasRenderer (upstream 67d6e44c750e). The
 * semantics mirror upstream shaders/tests/test_canvas_sink_api.js's
 * restoration fixture: a late webglcontextlost/webglcontextrestored event
 * must not revive a disposed renderer, a disposal must invalidate a queued
 * recovery, an explicit compile after disposal must re-enable recovery, and
 * a rejected compile after disposal must stay disposed.
 */
import assert from 'node:assert/strict'
import test, { mock } from 'node:test'

import { patchContextLossGuards } from '../src/lib/noisemaker-context-loss.mjs'

function fakeCanvas (listeners) {
  const canvas = {
    addEventListener: (name, fn) => { listeners.set(name, fn) },
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name)
    }
  }
  return canvas
}

// Mirrors upstream bareRenderer + restorableCanvas: the engine surface the
// guard patch reaches into, without the engine bundle.
function fakeRenderer ({ listeners, events }) {
  const renderer = {
    _canvas: fakeCanvas(listeners),
    _lifecycleGeneration: 0,
    _contextRecoveryTimer: null,
    _isContextLost: false,
    _pipeline: null,
    _currentDsl: 'search synth\nrender(o0)',
    _boundContextLost: (e) => {
      e.preventDefault()
      renderer._isContextLost = true
      renderer.stop()
      renderer._scheduleContextRecovery()
      events.push(['lost'])
    },
    _boundContextRestored: () => {
      renderer._clearContextRecovery()
      events.push(['restored'])
    },
    _clearContextRecovery: () => {
      if (renderer._contextRecoveryTimer !== null) {
        clearTimeout(renderer._contextRecoveryTimer)
        renderer._contextRecoveryTimer = null
      }
    },
    _isLifecycleCurrent: (generation) => renderer._lifecycleGeneration === generation,
    _rebuildsAfterContextLoss: () => true,
    _scheduleContextRecovery: () => {
      renderer._contextRecoveryTimer = setTimeout(() => {}, 3000)
    },
    _setupContextLossHandlers: () => {
      renderer._canvas.addEventListener('webglcontextlost', renderer._boundContextLost)
      renderer._canvas.addEventListener('webglcontextrestored', renderer._boundContextRestored)
    },
    _queueCompile: (run) => run(),
    _compile: async () => {
      events.push(['compile'])
      return { name: 'built' }
    },
    dispose: async (options = {}) => {
      renderer._clearContextRecovery()
      renderer._lifecycleGeneration += 1
      events.push(['dispose', options])
    },
    compile: async (dsl) => renderer._compile(dsl),
    stop: () => {
      events.push(['stop'])
    }
  }
  return renderer
}

function patchedRenderer ({ listeners = new Map(), events = [] } = {}) {
  const renderer = fakeRenderer({ listeners, events })
  assert.equal(patchContextLossGuards(renderer), true)
  renderer._setupContextLossHandlers()
  return { renderer, listeners, events }
}

test('a late loss and restore event cannot revive an intentionally disposed renderer', async () => {
  const { renderer, listeners, events } = patchedRenderer()

  await renderer.dispose()
  assert.equal(renderer._isDisposed, true)

  listeners.get('webglcontextlost')({ preventDefault () {} })
  assert.equal(renderer._isContextLost, true, 'the wrapper still records the loss')
  assert.equal(renderer._contextRecoveryTimer, null, 'disposal must not schedule another build')
  assert.equal(events.filter(([kind]) => kind === 'lost').length, 0, 'the guarded handler must not run')
  assert.equal(events.filter(([kind]) => kind === 'stop').length, 0)
  listeners.get('webglcontextrestored')()
  assert.equal(events.filter(([kind]) => kind === 'restored').length, 0, 'restore must not rebuild')
  assert.equal(renderer._pipeline, null)
})

test('disposal invalidates a recovery queued behind another compile', async () => {
  const { renderer, events } = patchedRenderer()
  const queued = []
  renderer._queueCompile = (run) => {
    queued.push(run)
    return Promise.resolve(null)
  }

  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    renderer._scheduleContextRecovery()
    assert.notEqual(renderer._contextRecoveryTimer, null)
    assert.equal(queued.length, 0, 'the timer has not fired yet')

    mock.timers.tick(3000)
    assert.equal(queued.length, 1, 'the fired recovery queued its rebuild')
    assert.equal(renderer._contextRecoveryTimer, null)

    await renderer.dispose()
    assert.equal(renderer._isDisposed, true)
    assert.notEqual(renderer._lifecycleGeneration, 0, 'dispose invalidates the lifecycle')

    // The queued rebuild would run _compile without the guards.
    let built = false
    renderer._compile = async () => { built = true }
    const result = await queued[0]()
    assert.equal(result, null, 'the stale recovery must build nothing')
    assert.equal(built, false, 'a stale recovery must not compile')
    assert.equal(events.filter(([kind]) => kind === 'compile').length, 0)
  } finally {
    mock.timers.reset()
  }
})

test('an explicit compile after disposal re-enables context-loss recovery', async () => {
  const { renderer, listeners, events } = patchedRenderer()

  await renderer.dispose()
  assert.equal(renderer._isDisposed, true)

  await renderer.compile('search synth\nrender(o0)')
  assert.equal(renderer._isDisposed, false, 'compile clears the disposed flag for its own build')
  assert.deepEqual(events, [['dispose', {}], ['compile']])

  listeners.get('webglcontextlost')({ preventDefault () {} })
  assert.equal(events.filter(([kind]) => kind === 'lost').length, 1, 'recovery is armed again')
  assert.notEqual(renderer._contextRecoveryTimer, null)
  renderer._clearContextRecovery()
})

test('a rejected explicit compile after disposal stays disposed', async () => {
  const { renderer, listeners, events } = patchedRenderer()

  await renderer.dispose()
  renderer._compile = async () => {
    throw Object.assign(new Error('rejected'), { code: 'ERR_COMPILATION_FAILED' })
  }

  await assert.rejects(renderer.compile('search synth\nrender(o0)'),
    (err) => err.code === 'ERR_COMPILATION_FAILED')
  assert.equal(renderer._isDisposed, true, 'the failed build re-disposes')
  assert.equal(renderer._contextRecoveryTimer, null, 'no automatic recovery stays scheduled')

  listeners.get('webglcontextlost')({ preventDefault () {} })
  assert.equal(events.filter(([kind]) => kind === 'lost').length, 0, 'a rejected compile must not re-arm loss handling')
})

test('a compiled build after disposal keeps the guard off while running', async () => {
  const { renderer, listeners } = patchedRenderer()

  await renderer.dispose()
  await renderer.compile('search synth\nrender(o0)')
  assert.equal(renderer._isDisposed, false)
  listeners.get('webglcontextlost')({ preventDefault () {} })
  assert.notEqual(renderer._contextRecoveryTimer, null, 'loss while running schedules recovery')
  renderer._clearContextRecovery()
})

test('the patch is forward-safe and leaves guarded surfaces as published', () => {
  const { renderer } = patchedRenderer()

  // A bundle carrying upstream 67d6e44c's constructor initializes
  // _isDisposed; the patch must leave every method as published.
  assert.equal(patchContextLossGuards(renderer), false, 'already-guarded surface stays published')

  // A contract mock without the guarded surface stays untouched too.
  const bare = {
    compile: async () => {},
    dispose: async () => {}
  }
  assert.equal(patchContextLossGuards(bare), false)
  assert.equal(typeof bare.compile, 'function')
})

test('a replaced canvas keeps the guard on the fresh handler pair', async () => {
  const listeners = new Map()
  const events = []
  const renderer = fakeRenderer({ listeners, events })
  assert.equal(patchContextLossGuards(renderer), true)
  renderer._setupContextLossHandlers()
  const firstLost = listeners.get('webglcontextlost')

  // _replaceCanvas removes the handlers and re-attaches a fresh pair; the
  // wrapped setup must re-apply the guard.
  renderer._boundContextLost = () => { renderer.stop(); renderer._scheduleContextRecovery() }
  renderer._boundContextRestored = () => { renderer._clearContextRecovery() }
  listeners.clear()
  renderer._setupContextLossHandlers()
  assert.notEqual(listeners.get('webglcontextlost'), undefined)
  assert.notEqual(listeners.get('webglcontextlost'), firstLost)

  await renderer.dispose()
  listeners.get('webglcontextlost')({ preventDefault () {} })
  assert.equal(renderer._contextRecoveryTimer, null, 'the fresh pair is guarded too')
  listeners.get('webglcontextrestored')()
  assert.equal(events.filter(([kind]) => kind === 'restored').length, 0)
})

test('a recovery run stale for a replaced canvas rebuilds nothing', async () => {
  const { renderer } = patchedRenderer()
  const queued = []
  renderer._queueCompile = (run) => {
    queued.push(run)
    return Promise.resolve(null)
  }

  const originalCanvas = renderer._canvas
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    renderer._scheduleContextRecovery()
    assert.equal(queued.length, 0, 'the timer has not fired yet')

    mock.timers.tick(3000)
    assert.equal(queued.length, 1, 'the fired recovery queued its rebuild')

    // The canvas was replaced between the schedule and the recovery firing.
    const replacement = {}
    renderer._canvas = replacement

    let built = false
    renderer._compile = async () => { built = true }
    const result = await queued[0]()
    assert.equal(result, null, 'recovery for a replaced canvas must build nothing')
    assert.equal(built, false)
    assert.equal(renderer._canvas, replacement)
    assert.notEqual(originalCanvas, replacement)
  } finally {
    mock.timers.reset()
  }
})
