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
 * The pinned CDN authority (1.0.312) already carries upstream's
 * moved-inputs contract, so on the pinned bundle the patch detects the
 * published wiring and leaves every definition as published. The patch
 * still applies to older bundles: after loadEffects() and before the
 * first render, when the engine lazily builds its program registry from
 * the effect definition. The engine already supports this exact
 * surface-global contract (points/heightGrid carries heightTex with the
 * same shape), so the patch changes the parameter contract only, never
 * the rendered pixels.
 *
 * The patch is forward-safe: when a future engine bundle already carries
 * upstream's moved-inputs contract (commit 317c43ccb2ea, "Move particle
 * texture inputs into individual behaviors" — the surface global carries a
 * colorModeUniform and the sim pass binds the surface name itself), the
 * patch leaves the definition as published. The rolling CDN serves bundles
 * with that contract today.
 *
 * Upstream 317c43ccb2ea also removed render/pointsEmit's explicit
 * diffuseTex surface and restored the init pass's chained-input wiring,
 * moving texture selection into each consuming behavior. The port mirrors
 * that removal: the surface stays retired on every bundle shape, because
 * adding it would reintroduce a parameter upstream no longer publishes.
 *
 * Upstream 27a2b58f4a17 renamed dla/flow/physarum's field input to
 * heightTex ("height map", as in heightGrid and hydraulic) and kept
 * fieldTex accepted through a paramAliases registry on the built-in
 * definitions. On a bundle that carries that renamed contract the
 * loaded definition declares the rename itself, so the patch leaves it
 * as published; adding the legacy fieldTex surface there would
 * reintroduce a parameter upstream no longer publishes.
 *
 * Upstream e23524f6b5ea and d3b5238c8bf2 also moved each surface's
 * ui.category out of "source" and into the owning behavior's category; the
 * table below carries those current values (the moved-inputs contract uses
 * the same categories, so the fallback metadata stays consistent with
 * upstream across bundle shapes).
 */

// The wiring mirror carries upstream 06ce0927's contract with the current
// ui.category values from e23524f6b5ea and d3b5238c8bf2 (see the header
// note). The companion fixture test/fixtures/upstream-06ce0927/
// particle-input-wiring.json pins the historical 06ce0927 contract and is
// mechanically compared against this table with those categories applied.
export const PARTICLE_INPUT_WIRING = {
  'points/dla': {
    surface: 'fieldTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'field map', category: 'chemistry' } },
    passProgram: 'agent'
  },
  'points/flow': {
    surface: 'fieldTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'field map', category: 'agents' } },
    passProgram: 'agent'
  },
  'points/hydraulic': {
    surface: 'heightTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'height map', category: 'agents' } },
    passProgram: 'agent'
  },
  'points/life': {
    surface: 'diffuseTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'diffuse map', category: 'types' } },
    passProgram: 'agent'
  },
  'points/physarum': {
    surface: 'fieldTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'field map', category: 'general' } },
    passProgram: 'agent'
  },
  'render/pointsEmit': {
    surface: 'diffuseTex',
    global: { type: 'surface', default: 'inputTex', ui: { label: 'diffuse map', category: 'source', resetOnChange: true } },
    passProgram: 'init'
  }
}

// Upstream 317c43ccb2ea removed render/pointsEmit's explicit diffuseTex
// surface (see the header note). The port mirrors the removal: never patch
// this effect, on any bundle shape. The other entries keep their 06ce0927
// mirror for bundles that predate upstream's moved-inputs contract; the
// moved-inputs detection below leaves newer bundles as published.
export const RETIRED_WIRING = new Set(['render/pointsEmit'])

/**
 * Applies the explicit particle texture input patch to the runtime's
 * loaded effect definitions.
 *
 * @param {object} renderer - Noisemaker CanvasRenderer exposing
 *   _loadedEffects (a Map of "namespace/name" to
 *   {namespace, name, instance} entries).
 * @returns {Array} the patched loaded effect entries, in the table's
 *   order; effects that are not loaded, retired (RETIRED_WIRING), or
 *   already carrying upstream's moved-inputs wiring contribute no entry.
 */
export function patchParticleInputs (renderer) {
  if (!renderer || !renderer._loadedEffects || typeof renderer._loadedEffects.get !== 'function') return []
  const patched = []
  for (const [effectId, wiring] of Object.entries(PARTICLE_INPUT_WIRING)) {
    // A definition upstream no longer publishes must not come back.
    if (RETIRED_WIRING.has(effectId)) continue
    const entry = renderer._loadedEffects.get(effectId)
    if (!entry || !entry.instance) continue

    const instance = entry.instance

    // Forward safety: a definition that already carries upstream's
    // moved-inputs contract (the surface global sets a colorModeUniform,
    // or the sim pass binds the surface name itself) is published wiring,
    // not the legacy fallback the patch rewrites. Leave it untouched;
    // rewiring it would break the separate chained-input read.
    const spec = instance.globals && instance.globals[wiring.surface]
    const simPass = Array.isArray(instance.passes)
      ? instance.passes.find(pass => pass && pass.program === wiring.passProgram)
      : null

    // Upstream 27a2b58f4a17's renamed contract (fieldTex -> heightTex for
    // dla/flow/physarum) is declared on the definition itself: the effect
    // carries a paramAliases entry for the legacy name and publishes the
    // renamed surface instead. The patch must never re-add the legacy
    // surface there — leave the definition as published.
    const renamed = !!(instance.paramAliases && instance.paramAliases[wiring.surface])
    const movedInputs = renamed ||
      (spec && spec.colorModeUniform) ||
      (simPass && simPass.inputs && simPass.inputs[wiring.surface] === wiring.surface)
    if (movedInputs) continue

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

    if (changed) {
      // Refresh the engine's DSL op spec for the patched definition. The
      // engine builds op args from instance.globals at loadEffects time and
      // registers them as a snapshot; the DSL validator (S001) rejects any
      // keyword argument that is not in that snapshot, so the new named
      // surface must be registered too. registerEffectWithRuntime rebuilds
      // the op args from the patched instance and registerOp overwrites the
      // previous spec. The refreshed globals introduce no enum choices, so
      // the returned choices map stays empty and no enum merge follows.
      if (typeof renderer.registerEffectWithRuntime === 'function') {
        renderer.registerEffectWithRuntime({ namespace: entry.namespace, name: entry.name, instance })
      }
      patched.push(entry)
    }
  }
  return patched
}
