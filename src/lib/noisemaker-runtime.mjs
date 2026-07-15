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
  renderer.start()
  return renderer
}
