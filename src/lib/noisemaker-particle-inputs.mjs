/**
 * Explicit particle texture input patch for the Noisemaker engine runtime.
 *
 * Upstream Noisemaker commit 06ce0927d3ee ("Add explicit particle texture
 * inputs with legacy fallbacks") promotes each particle effect's chained
 * input read to a named surface global: points/{dla,flow,physarum} gain
 * fieldTex, points/hydraulic gains heightTex, points/life and
 * render/pointsEmit gain diffuseTex. Each surface global defaults to
 * "inputTex", so rendered behavior with existing presets is unchanged;
 * the surface can then be pointed at an independent texture
 * (for example `dla(fieldTex: read(o1))`). The sim passes (program
 * "agent", or "init" for render/pointsEmit) now read through the named
 * surface, while every other pass keeps the legacy literal wiring.
 *
 * The pinned CDN authority (1.0.301) predates the commit, so the runtime
 * applies this patch to the loaded effect definitions after loadEffects()
 * and before the first render, when the engine lazily builds its program
 * registry from the effect definition. The engine already supports this
 * exact surface-global contract (points/heightGrid carries heightTex with
 * the same shape in the pinned bundle), so the patch changes the parameter
 * contract only, never the rendered pixels.
 *
 * The patch is forward-safe: when a future engine bundle already carries
 * upstream 06ce0927, the global is present and the sim pass no longer
 * carries the legacy literal, so the patch leaves the definition as
 * published.
 */

// Byte-faithful mirror of the upstream 06ce0927 wiring. The companion
// fixture test/fixtures/upstream-06ce0927/particle-input-wiring.json pins
// the same contract and is mechanically compared against this table.
export const PARTICLE_INPUT_WIRING = {
  'points/dla': {
    surface: 'fieldTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'field map', category: 'source' } },
    passProgram: 'agent'
  },
  'points/flow': {
    surface: 'fieldTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'field map', category: 'source' } },
    passProgram: 'agent'
  },
  'points/hydraulic': {
    surface: 'heightTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'height map', category: 'source' } },
    passProgram: 'agent'
  },
  'points/life': {
    surface: 'diffuseTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'diffuse map', category: 'source' } },
    passProgram: 'agent'
  },
  'points/physarum': {
    surface: 'fieldTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'field map', category: 'source' } },
    passProgram: 'agent'
  },
  'render/pointsEmit': {
    surface: 'diffuseTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'diffuse map', category: 'source', resetOnChange: true } },
    passProgram: 'init'
  }
}

/**
 * Applies the explicit particle texture input patch to the runtime's
 * loaded effect definitions.
 *
 * @param {object} renderer - Noisemaker CanvasRenderer exposing
 *   _loadedEffects (a Map of "namespace/name" to
 *   {namespace, name, instance} entries).
 * @returns {Array} the patched loaded effect entries, in the table's
 *   order; effects that are not loaded or already carry the upstream
 *   wiring contribute no entry.
 */
export function patchParticleInputs (renderer) {
  if (!renderer || !renderer._loadedEffects || typeof renderer._loadedEffects.get !== 'function') return []
  const patched = []
  for (const [effectId, wiring] of Object.entries(PARTICLE_INPUT_WIRING)) {
    const entry = renderer._loadedEffects.get(effectId)
    if (!entry || !entry.instance) continue

    const instance = entry.instance
    let changed = false

    // Add the named surface global when the loaded definition still uses
    // the legacy implicit wiring.
    if (instance.globals && !instance.globals[wiring.surface]) {
      instance.globals = { ...instance.globals, [wiring.surface]: wiring.global }
      changed = true
    }

    // Rewire the sim pass's chained input through the named surface. Only
    // the legacy literal ("inputTex") is replaced: every other pass keeps
    // its published wiring, and a definition that already reads the
    // surface is left untouched.
    if (Array.isArray(instance.passes)) {
      for (const pass of instance.passes) {
        if (!pass || pass.program !== wiring.passProgram) continue
        if (pass.inputs && pass.inputs.inputTex === 'inputTex') {
          pass.inputs = { ...pass.inputs, inputTex: wiring.surface }
          changed = true
        }
      }
    }

    if (changed) patched.push(entry)
  }
  return patched
}
