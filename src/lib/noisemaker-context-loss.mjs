/**
 * Disposed-renderer context-loss guards for the Noisemaker engine runtime.
 *
 * Upstream Noisemaker commit 67d6e44c750e ("Prevent disposed renderers from
 * restarting after context loss") guards the renderer's context-loss surface
 * so a late webglcontextlost / webglcontextrestored event cannot revive a
 * renderer the editor intentionally disposed, and so compile() after a
 * disposal re-enables recovery while a rejected post-disposal compile stays
 * disposed:
 *   - the constructor initializes _isDisposed = false;
 *   - _boundContextLost preventDefaults and sets _isContextLost, then
 *     returns without stopping or scheduling a rebuild when _isDisposed;
 *   - _boundContextRestored returns without touching the recovery timer,
 *     pipeline or lifecycle when _isDisposed;
 *   - _scheduleContextRecovery's queued rebuild checks _isDisposed and the
 *     captured lifecycle generation first;
 *   - dispose() sets _isDisposed before clearing recovery and invalidating;
 *   - compile() clears _isDisposed for its own build and, when that build
 *     fails after a disposal with no pipeline, re-disposes (flag plus
 *     _clearContextRecovery) and rethrows.
 *
 * The port vendors no engine code: it instantiates engine.CanvasRenderer
 * from the pinned CDN bundle, whose class carries no such guards. This patch
 * carries the committed behavior through the renderer's existing interfaces
 * by wrapping the instance's public dispose()/compile() and the canvas
 * handler setup, exactly as the engine would install them. The wrapper for
 * _setupContextLossHandlers re-applies the guard to every handler pair the
 * engine attaches, including the fresh pair created after a canvas
 * replacement, so the guards survive _replaceCanvas like the upstream
 * class's own handlers do.
 *
 * The patch is forward-safe: on an engine bundle that already carries the
 * guards, the constructor initializes _isDisposed and the patch leaves every
 * method as published. The pinned 1.0.320 bundle predates the guards.
 */

// Upstream CanvasRenderer's CONTEXT_RESTORE_WAIT_MS constant (canvas.js).
const CONTEXT_RESTORE_WAIT_MS = 3000

/**
 * Applies the upstream 67d6e44c disposed-renderer guards to a renderer.
 *
 * @param {object} renderer - engine CanvasRenderer instance.
 * @returns {boolean} whether the patch was applied. It stays false for
 *   renderers that do not expose the guarded surface (contract mocks) and
 *   for bundles that already carry the guards natively.
 */
export function patchContextLossGuards (renderer) {
  if (!renderer ||
      typeof renderer.compile !== 'function' ||
      typeof renderer.dispose !== 'function' ||
      typeof renderer._queueCompile !== 'function' ||
      typeof renderer._compile !== 'function' ||
      typeof renderer._setupContextLossHandlers !== 'function' ||
      typeof renderer._scheduleContextRecovery !== 'function' ||
      typeof renderer._clearContextRecovery !== 'function' ||
      typeof renderer._isLifecycleCurrent !== 'function' ||
      typeof renderer._rebuildsAfterContextLoss !== 'function') return false

  // Forward safety: a bundle carrying upstream 67d6e44c's guards initializes
  // _isDisposed in its constructor. Leave that surface as published.
  if (renderer._isDisposed !== undefined) return false

  renderer._isDisposed = false

  guardCanvasHandlers(renderer)
  wrapHandlerSetup(renderer)
  wrapDispose(renderer)
  wrapCompile(renderer)
  wrapScheduleContextRecovery(renderer)

  return true
}

/**
 * Wraps the context-loss handler pair currently attached to the canvas:
 * the lost wrapper preventDefaults, records _isContextLost and returns
 * early when disposed, exactly like the upstream guard inside the handler;
 * the restored wrapper returns early when disposed.
 * @private
 */
function guardCanvasHandlers (renderer) {
  const canvas = renderer._canvas
  const boundLost = renderer._boundContextLost
  const boundRestored = renderer._boundContextRestored
  if (!canvas || typeof boundLost !== 'function' || typeof boundRestored !== 'function') return

  const lostWrapper = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    renderer._isContextLost = true
    if (renderer._isDisposed) return
    boundLost(e)
  }
  const restoredWrapper = () => {
    if (renderer._isDisposed) return
    boundRestored()
  }

  canvas.removeEventListener('webglcontextlost', boundLost)
  canvas.removeEventListener('webglcontextrestored', boundRestored)
  canvas.addEventListener('webglcontextlost', lostWrapper)
  canvas.addEventListener('webglcontextrestored', restoredWrapper)
  renderer._boundContextLost = lostWrapper
  renderer._boundContextRestored = restoredWrapper
}

/**
 * Re-applies the handler guard every time the engine attaches a fresh
 * handler pair (initial construction, canvas replacement). Without this,
 * _replaceCanvas would re-attach upstream-unguarded handlers.
 * @private
 */
function wrapHandlerSetup (renderer) {
  const originalSetup = renderer._setupContextLossHandlers.bind(renderer)
  renderer._setupContextLossHandlers = function () {
    originalSetup()
    guardCanvasHandlers(this)
  }
}

/**
 * Mirrors upstream dispose(): _isDisposed must be set before the recovery
 * timer is cleared, so a disposal while a rebuild is pending cannot leave a
 * runnable recovery behind.
 * @private
 */
function wrapDispose (renderer) {
  const originalDispose = renderer.dispose.bind(renderer)
  renderer.dispose = function (options) {
    this._isDisposed = true
    return originalDispose(options)
  }
}

/**
 * Mirrors upstream compile(): the queued build clears _isDisposed for its
 * own run, and a failed build after a disposal re-disposes (flag plus
 * _clearContextRecovery) while no pipeline exists, then rethrows.
 * @private
 */
function wrapCompile (renderer) {
  renderer.compile = function (dsl, options) {
    const generation = this._lifecycleGeneration ?? 0
    return this._queueCompile(async () => {
      if (!this._isLifecycleCurrent(generation)) return null
      const wasDisposed = this._isDisposed
      this._isDisposed = false
      try {
        return await this._compile(dsl, options)
      } catch (error) {
        if (wasDisposed && this._isLifecycleCurrent(generation) && !this._pipeline) {
          this._isDisposed = true
          this._clearContextRecovery()
        }
        throw error
      }
    })
  }
}

/**
 * Mirrors upstream _scheduleContextRecovery(): the recovery rebuild runs
 * only while the renderer is neither disposed nor stale for the captured
 * lifecycle generation.
 * @private
 */
function wrapScheduleContextRecovery (renderer) {
  renderer._scheduleContextRecovery = function () {
    this._clearContextRecovery()
    const canvas = this._canvas
    const generation = this._lifecycleGeneration ?? 0
    this._contextRecoveryTimer = setTimeout(() => {
      this._contextRecoveryTimer = null
      this._queueCompile(async () => {
        if (this._isDisposed || !this._isLifecycleCurrent(generation) ||
            !this._isContextLost || canvas !== this._canvas || !this._rebuildsAfterContextLoss()) return null
        try {
          return await this._compile(this._currentDsl)
        } catch (err) {
          console.error(`[Canvas] Failed to rebuild pipeline after context loss: ${err.detail || err.message || JSON.stringify(err)}`)
          if (this._onError) {
            this._onError(err)
          }
          return null
        }
      })
    }, CONTEXT_RESTORE_WAIT_MS)
  }
}
