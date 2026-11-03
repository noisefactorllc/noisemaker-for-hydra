/**
 * WebGPU device-loss rebuild watch for the Noisemaker engine runtime.
 *
 * Upstream Noisemaker commit 7153bec43607 ("Rebuild on a fresh canvas when
 * the WebGPU device is lost") makes the renderer watch the WebGPU device of
 * every pipeline it makes current. A GPU process exit or a driver reset
 * resolves that device's lost promise and no event reaches the canvas, so
 * without the watch the renderer kept its loop running on the dead device,
 * the canvas froze on its last frame, and every read of it (toBlob,
 * readPixels) came back empty. With the watch, a loss of the current
 * pipeline's device goes through the same handling as a lost WebGL context:
 * stop the loop, call onContextLost, and rebuild the program on a fresh
 * canvas in the old one's place, resume the loop and call onContextRestored
 * so hosts read `canvas` again. A device lost after the renderer moved to
 * another pipeline changes nothing.
 *
 * The port vendors no engine code: it instantiates engine.CanvasRenderer
 * from the pinned CDN bundle, whose class predates the watch. This patch
 * carries the committed behavior through the renderer's existing interfaces
 * by wrapping _compile — the single choke point every build passes through
 * (the public compile(), the recovery rebuild and the restore rebuild) — and
 * attaching the watch to the pipeline that is current when the build
 * resolves, exactly where the upstream class watches the pipelines it makes
 * current. The watch fires only while the pipeline it captured is still
 * current, so a retired device lost after a backend switch is ignored like
 * upstream's. One watch attaches per pipeline, matching upstream's
 * per-assignment attachment on the initial and replacement pipelines.
 *
 * The patch is forward-safe: on an engine bundle that already carries the
 * watch (_watchDeviceLoss), the patch leaves every surface as published.
 */

/**
 * Mirrors upstream 7153bec43607's _onBackendLost: one loss-handling body for
 * a lost WebGL context or WebGPU device.
 * @private
 */
function onBackendLost (renderer, message) {
  renderer._isContextLost = true
  if (renderer._isDisposed) return
  renderer._wasRunningBeforeContextLoss = renderer._isRunning
  // A program whose build stalls the GPU process past the browser's
  // watchdog loses the context while drawing its first frame. Rebuilding it
  // stalls the new GPU process too, and after a second exit Chrome blocks
  // the page from WebGL and never restores it.
  renderer._contextLostBeforeSecondFrame = renderer._isRunning && renderer._frameCount < 2

  if (renderer._pipeline?.backend) {
    renderer._pipeline.backend.isContextLost = true
  }

  renderer.stop()
  renderer._scheduleContextRecovery()

  console.warn(message)
  if (renderer._onContextLost) {
    renderer._onContextLost()
  }
}

/**
 * Mirrors upstream 7153bec43607's _watchDeviceLoss: watch one pipeline's
 * WebGPU device and route its loss through the backend-lost handling, but
 * only while that pipeline is still the renderer's current one.
 * @private
 */
function watchDeviceLoss (renderer, pipeline) {
  pipeline?.backend?.device?.lost?.then((info) => {
    if (renderer._isDisposed || renderer._pipeline !== pipeline) return
    onBackendLost(renderer, `[Canvas] WebGPU device lost: ${info?.message || info?.reason || 'unknown reason'}`)
  })
}

/**
 * Applies the upstream 7153bec43607 device-loss watch to a renderer.
 *
 * @param {object} renderer - engine CanvasRenderer instance.
 * @returns {boolean} whether the patch was applied. It stays false for
 *   renderers that do not expose the watched surface (contract mocks) and
 *   for bundles that already carry the watch natively.
 */
export function patchDeviceLossWatch (renderer) {
  if (!renderer ||
      typeof renderer._compile !== 'function' ||
      typeof renderer._queueCompile !== 'function' ||
      typeof renderer._scheduleContextRecovery !== 'function' ||
      typeof renderer._clearContextRecovery !== 'function' ||
      typeof renderer._isLifecycleCurrent !== 'function' ||
      typeof renderer._rebuildsAfterContextLoss !== 'function' ||
      typeof renderer.stop !== 'function') return false

  // Forward safety: a bundle carrying upstream 7153bec43607's watch
  // exposes _watchDeviceLoss. Leave that surface as published.
  if (renderer._watchDeviceLoss !== undefined) return false

  const watched = new WeakSet()
  const originalCompile = renderer._compile.bind(renderer)
  renderer._compile = async function (dsl, options) {
    try {
      return await originalCompile(dsl, options)
    } finally {
      // The build made a pipeline current exactly where upstream attaches
      // its watch: after the initial or replacement pipeline is assigned.
      // Attach in finally so a rejected build cannot leave the current
      // pipeline unwatched either.
      const pipeline = this._pipeline
      if (pipeline && !watched.has(pipeline)) {
        watched.add(pipeline)
        watchDeviceLoss(renderer, pipeline)
      }
    }
  }

  return true
}
