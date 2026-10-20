import { patchMediaTile } from './noisemaker-media-tile.mjs'

export const DEFAULT_NOISEMAKER_CDN = 'https://shaders.noisedeck.app/1'

export async function createNoisemakerRuntime({
  canvas,
  extension = window.HydraEffects,
  cdn = DEFAULT_NOISEMAKER_CDN,
  preferWebGPU = false
} = {}) {
  if (!canvas) throw new Error('Noisemaker runtime requires a canvas')
  if (!extension || typeof extension.loadHydraEffects !== 'function') {
    throw new Error('HydraEffects.loadHydraEffects() is required')
  }

  const engine = await extension.loadHydraEffects({ cdn })
  if (!engine || typeof engine.CanvasRenderer !== 'function') {
    throw new Error('Noisemaker engine does not export CanvasRenderer')
  }

  // Give every registered Hydra effect definition and the
  // companion's fused-chain shader overrides WGSL sources so the engine's
  // WGSL (WebGPU) backend can compile Hydra programs. Both are no-ops under
  // the WebGL2 backend. A conversion failure must not break editor startup:
  // record it and continue (the WGSL backend then reports its own
  // ERR_NO_WGSL_SOURCE for the affected program, which parity evidence
  // preserves, instead of masking the defect).
  try {
    const { attachHydraWgslShaders, attachHydraWgslCompile } = await import('./hydra-wgsl.mjs')
    attachHydraWgslShaders(engine)
    attachHydraWgslCompile(engine)
  } catch (err) {
    console.warn(`[noisemaker-runtime] Hydra WGSL attach failed: ${err && err.message}`)
  }

  const renderer = new engine.CanvasRenderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
    basePath: cdn,
    bundlePath: `${cdn}/effects`,
    useBundles: true,
    preferWebGPU
  })
  Object.defineProperty(renderer, 'hydraEngine', { value: engine })

  await renderer.loadManifest()
  const effectIds = Object.keys(renderer.manifest || {})
  if (effectIds.length > 0) await renderer.loadEffects(effectIds)

  // Apply the tile-aware media patch to the loaded synth/media definition.
  // The engine already carries the full tile pipeline (setTileRegion and
  // per-frame tileOffset/fullResolution render state); this patch extends
  // the effect's uniform layout with slot 5 and swaps in the tile-aware
  // mediaInput shader sources. It must run before the first render, when
  // the engine lazily builds its program registry from the effect
  // definition, so the compiled programs pick up the patched layout and
  // sources.
  try {
    patchMediaTile(renderer)
  } catch (err) {
    console.warn(`[noisemaker-runtime] media tile patch failed: ${err && err.message}`)
  }

  renderer.start()
  return renderer
}
