/**
 * Tile-aware media input patch for the Noisemaker engine runtime.
 *
 * Upstream Noisemaker commit fde974e58a0d ("make synth/media tile-aware for
 * tiled print export") adds tileOffset and fullResolution uniforms (slot 5,
 * xy and zw components) to the media effect and rewrites the mediaInput
 * GLSL and WGSL sources so tile-local fragments resolve against the full
 * export canvas. The pinned CDN authority (1.0.301) predates that commit,
 * so the runtime applies this patch to the loaded effect definition after
 * loadEffects() and before the first render, when the engine lazily builds
 * its program registry from the effect definition.
 *
 * The engine already carries the full tile pipeline (setTileRegion stores
 * _tileOffset/_fullResolution and the per-frame render state exposes
 * tileOffset/fullResolution), so this patch only extends the effect
 * definition: the uniform layout gains slot 5 and the mediaInput shader
 * sources are replaced with the tile-aware upstream sources.
 */

// The sources below are byte-identical to upstream
// shaders/effects/synth/media/glsl/mediaInput.glsl and
// shaders/effects/synth/media/wgsl/mediaInput.wgsl at fde974e58a0d. They
// contain no backticks, template substitutions or backslashes, so embedding
// them as template literals preserves them exactly.

export const MEDIA_INPUT_GLSL = `/*
 * Media input shader.
 * Normalizes camera or video textures and exposes crop controls while preserving aspect ratio.
 * Offset sliders are remapped prior to sampling so live adjustments never read outside the source texture.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D imageTex;
uniform vec2 imageSize;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int position;
uniform float rotation;
uniform float scaleAmt;
uniform float offsetX;
uniform float offsetY;
uniform int tiling;
uniform int flip;
uniform vec3 bgColor;
uniform float bgAlpha;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 rotate2D(vec2 st, float rot) {
    rot = map(rot, -180.0, 180.0, 0.5, -0.5);
    float angle = rot * TAU * -1.0;

    // Handle aspect ratio of input media
    vec2 size = imageSize;
    float aspect = size.x / size.y;
    st -= vec2(0.5 * aspect, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 * aspect, 0.5);
    return st;
}

vec2 tile(vec2 st) {
    if (tiling == 0) {
        // no tiling
        return st;
    } else if (tiling == 1) {
        // tile both
        return fract(st);
    } else if (tiling == 2) {
        // horiz only
        return vec2(fract(st.x), st.y);
    } else if (tiling == 3) {
        // vert only
        return vec2(st.x, fract(st.y));
    }
    return st;
}

// External uploads use straight alpha. Interpolate premultiplied texels so
// transparent pixels cannot darken edges or bleed their hidden RGB into them.
vec4 mediaTexel(ivec2 p, ivec2 size) {
    vec4 c = texelFetch(imageTex, clamp(p, ivec2(0), size - 1), 0);
    return vec4(c.rgb * c.a, c.a);
}

vec4 sampleMedia(vec2 uv) {
    ivec2 size = textureSize(imageTex, 0);
    vec2 p = uv * vec2(size) - 0.5;
    ivec2 lo = ivec2(floor(p));
    vec2 f = fract(p);
    return mix(mix(mediaTexel(lo, size), mediaTexel(lo + ivec2(1, 0), size), f.x),
               mix(mediaTexel(lo + ivec2(0, 1), size), mediaTexel(lo + ivec2(1, 1), size), f.x), f.y);
}

vec4 getImage(vec2 st) {
    vec2 size = imageSize;
    // Under tiled print export gl_FragCoord is tile-local. Add the tile's
    // global offset so every tile and the untiled reference sample the same
    // absolute image pixel (tileOffset is 0 when not tiling).
    st = (gl_FragCoord.xy + tileOffset) / size;
    st.y = 1.0 - st.y;

    // Anchoring is relative to the full export canvas, not the tile.
    // fullResolution defaults to resolution when not tiling, so normal-size
    // rendering keeps the exact same values.
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;

    float scale = 100.0 / scaleAmt;

    if (scale == 0.0) {
        scale = 1.0;
    }
    st *= scale;

    // Position adjustments based on anchor point
    if (position == 0) {
        // top left
        st.y += (fullRes.y / size.y * scale) - (scale - (1.0 / size.y * scale));
    } else if (position == 1) {
        // top center
        st.x -= (fullRes.x / size.x * scale * 0.5) - (0.5 - (1.0 / size.x * scale));
        st.y += (fullRes.y / size.y * scale) - (scale - (1.0 / size.y * scale));
    } else if (position == 2) {
        // top right
        st.x -= (fullRes.x / size.x * scale) - (1.0 - (1.0 / size.x * scale));
        st.y += (fullRes.y / size.y * scale) - (scale - (1.0 / size.y * scale));
    } else if (position == 3) {
        // mid left
        st.y += (fullRes.y / size.y * scale * 0.5) + (0.5 - (1.0 / size.y * scale)) - (scale);
    } else if (position == 4) {
        // mid center
        st.x -= (fullRes.x / size.x * scale * 0.5) - (0.5 - (1.0 / size.x * scale));
        st.y += (fullRes.y / size.y * scale * 0.5) + (0.5 - (1.0 / size.y * scale)) - (scale);
    } else if (position == 5) {
        // mid right
        st.x -= (fullRes.x / size.x * scale) - (1.0 - (1.0 / size.x * scale));
        st.y += (fullRes.y / size.y * scale * 0.5) + (0.5 - (1.0 / size.y * scale)) - (scale);
    } else if (position == 6) {
        // bottom left
        st.y += 1.0 - (scale - (1.0 / size.y * scale));
    } else if (position == 7) {
        // bottom center
        st.x -= (fullRes.x / size.x * scale * 0.5) - (0.5 - (1.0 / size.x * scale));
        st.y += 1.0 - (scale - (1.0 / size.y * scale));
    } else if (position == 8) {
        // bottom right
        st.x -= (fullRes.x / size.x * scale) - (1.0 - (1.0 / size.x * scale));
        st.y += 1.0 - (scale - (1.0 / size.y * scale));
    }

    st.x -= map(offsetX, -100.0, 100.0, -fullRes.x / size.x * scale, fullRes.x / size.x * scale) * 1.5;
    st.y -= map(offsetY, -100.0, 100.0, -fullRes.y / size.y * scale, fullRes.y / size.y * scale) * 1.5;

    // Correct for aspect ratio before rotation
    st.x *= size.x / size.y;
    // Zero rotation is an exact identity. Avoid backend-dependent rounding
    // in the remap/trigonometry path before bilinear texture filtering.
    if (rotation != 0.0) st = rotate2D(st, rotation);
    st.x /= size.x / size.y;

    st = tile(st);

    // Nudge 1px up and left to center properly
    st += 1.0 / size;

    // Flip and mirror operations
    if (flip == 1) {
       // flip both
       st.x = 1.0 - st.x;
       st.y = 1.0 - st.y;
    } else if (flip == 2) {
       // flip h
       st.x = 1.0 - st.x;
    } else if (flip == 3) {
       // flip v
       st.y = 1.0 - st.y;
    } else if (flip == 11) {
       // mirror lr
       if (st.x > 0.5) {
           st.x = 1.0 - st.x;
       }
    } else if (flip == 12) {
       // mirror rl
       if (st.x < 0.5) {
           st.x = 1.0 - st.x;
       }
    } else if (flip == 13) {
       // mirror ud
       if (st.y > 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 14) {
       // mirror du
       if (st.y < 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 15) {
       // mirror lr ud
       if (st.x > 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y > 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 16) {
       // mirror lr du
       if (st.x > 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y < 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 17) {
       // mirror rl ud
       if (st.x < 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y > 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 18) {
       // mirror rl du
       if (st.x < 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y < 0.5) {
           st.y = 1.0 - st.y;
       }
    }

    vec4 text = sampleMedia(st);

    if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
        // Don't draw texture if out of coordinate bounds
        return vec4(bgColor * bgAlpha, bgAlpha);
    }

    return text;
}


void main() {
    vec2 st = gl_FragCoord.xy / resolution;
    st.y = 1.0 - st.y;

    fragColor = getImage(st);
}
`

export const MEDIA_INPUT_WGSL = `/*
 * WGSL media input shader.
 * Mirrors the GLSL normalization and crop logic for camera feeds.
 */

struct Uniforms {
    data : array<vec4<f32>, 6>,
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var imageTex : texture_2d<f32>;

var<private> resolution : vec2<f32>;
var<private> time : f32;
var<private> posIndex : i32;
var<private> rotation : f32;
var<private> scaleAmt : f32;
var<private> offsetX : f32;
var<private> offsetY : f32;
var<private> tiling : i32;
var<private> flip : i32;
var<private> bgColor : vec3<f32>;
var<private> bgAlpha : f32;
var<private> imageSize : vec2<f32>;
var<private> tileOffset : vec2<f32>;
var<private> fullResolution : vec2<f32>;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn rotate2D(st: vec2<f32>) -> vec2<f32> {
    var st2 = st;
    let rot = map(rotation, -180.0, 180.0, 0.5, -0.5);
    let angle = rot * TAU * -1.0;

    let aspect = imageSize.x / imageSize.y;
    st2 = st2 - vec2<f32>(0.5 * aspect, 0.5);
    let c = cos(angle);
    let s = sin(angle);
    st2 = mat2x2<f32>(c, -s, s, c) * st2;
    st2 = st2 + vec2<f32>(0.5 * aspect, 0.5);
    return st2;
}

fn tile(st: vec2<f32>) -> vec2<f32> {
    if (tiling == 0) {
        return st;
    } else if (tiling == 1) {
        return fract(st);
    } else if (tiling == 2) {
        return vec2<f32>(fract(st.x), st.y);
    } else if (tiling == 3) {
        return vec2<f32>(st.x, fract(st.y));
    }
    return st;
}

// External uploads use straight alpha; filter premultiplied texels.
fn mediaTexel(p: vec2<i32>, size: vec2<i32>) -> vec4<f32> {
    let c = textureLoad(imageTex, clamp(p, vec2<i32>(0), size - vec2<i32>(1)), 0);
    return vec4<f32>(c.rgb * c.a, c.a);
}

fn sampleMedia(uv: vec2<f32>) -> vec4<f32> {
    let size = vec2<i32>(textureDimensions(imageTex));
    let p = uv * vec2<f32>(size) - vec2<f32>(0.5);
    let lo = vec2<i32>(floor(p));
    let f = fract(p);
    return mix(mix(mediaTexel(lo, size), mediaTexel(lo + vec2<i32>(1, 0), size), f.x),
               mix(mediaTexel(lo + vec2<i32>(0, 1), size), mediaTexel(lo + vec2<i32>(1, 1), size), f.x), f.y);
}

fn getImage(pos: vec2<f32>) -> vec4<f32> {
    // Under tiled print export the fragment position is tile-local. Add the
    // tile's global offset so every tile and the untiled reference sample
    // the same absolute image pixel (tileOffset is 0 when not tiling).
    var st = (pos + tileOffset) / imageSize;
    st.y = 1.0 - st.y;

    // Anchoring is relative to the full export canvas, not the tile.
    // fullResolution defaults to resolution when not tiling, so normal-size
    // rendering keeps the exact same values.
    let fullRes = select(resolution, fullResolution, fullResolution.x > 0.0);

    var scale = 100.0 / scaleAmt;
    if (scale == 0.0) { scale = 1.0; }
    st = st * scale;

    if (posIndex == 0) {
        st.y = st.y + (fullRes.y / imageSize.y * scale) - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 1) {
        st.x = st.x - (fullRes.x / imageSize.x * scale * 0.5) + (0.5 - (1.0 / imageSize.x * scale));
        st.y = st.y + (fullRes.y / imageSize.y * scale) - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 2) {
        st.x = st.x - (fullRes.x / imageSize.x * scale) + (1.0 - (1.0 / imageSize.x * scale));
        st.y = st.y + (fullRes.y / imageSize.y * scale) - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 3) {
        st.y = st.y + (fullRes.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale;
    } else if (posIndex == 4) {
        st.x = st.x - (fullRes.x / imageSize.x * scale * 0.5) + (0.5 - (1.0 / imageSize.x * scale));
        st.y = st.y + (fullRes.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale;
    } else if (posIndex == 5) {
        st.x = st.x - (fullRes.x / imageSize.x * scale) + (1.0 - (1.0 / imageSize.x * scale));
        st.y = st.y + (fullRes.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale;
    } else if (posIndex == 6) {
        st.y = st.y + 1.0 - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 7) {
        st.x = st.x - (fullRes.x / imageSize.x * scale * 0.5) + (0.5 - (1.0 / imageSize.x * scale));
        st.y = st.y + 1.0 - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 8) {
        st.x = st.x - (fullRes.x / imageSize.x * scale) + (1.0 - (1.0 / imageSize.x * scale));
        st.y = st.y + 1.0 - (scale - (1.0 / imageSize.y * scale));
    }

    st.x = st.x - map(offsetX, -100.0, 100.0, -fullRes.x / imageSize.x * scale, fullRes.x / imageSize.x * scale) * 1.5;
    st.y = st.y - map(offsetY, -100.0, 100.0, -fullRes.y / imageSize.y * scale, fullRes.y / imageSize.y * scale) * 1.5;

    st.x = st.x * (imageSize.x / imageSize.y);
    // Preserve exact texture coordinates for the identity transform.
    if (rotation != 0.0) { st = rotate2D(st); }
    st.x = st.x / (imageSize.x / imageSize.y);

    st = tile(st);

    st = st + 1.0 / imageSize;

    if (flip == 1) {
        st.x = 1.0 - st.x;
        st.y = 1.0 - st.y;
    } else if (flip == 2) {
        st.x = 1.0 - st.x;
    } else if (flip == 3) {
        st.y = 1.0 - st.y;
    } else if (flip == 11) {
        if (st.x > 0.5) { st.x = 1.0 - st.x; }
    } else if (flip == 12) {
        if (st.x < 0.5) { st.x = 1.0 - st.x; }
    } else if (flip == 13) {
        if (st.y > 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 14) {
        if (st.y < 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 15) {
        if (st.x > 0.5) { st.x = 1.0 - st.x; }
        if (st.y > 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 16) {
        if (st.x > 0.5) { st.x = 1.0 - st.x; }
        if (st.y < 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 17) {
        if (st.x < 0.5) { st.x = 1.0 - st.x; }
        if (st.y > 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 18) {
        if (st.x < 0.5) { st.x = 1.0 - st.x; }
        if (st.y < 0.5) { st.y = 1.0 - st.y; }
    }

    let text = sampleMedia(st);

    if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
        return vec4<f32>(bgColor * bgAlpha, bgAlpha);
    }

    return text;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;
    posIndex = i32(uniforms.data[1].x);
    rotation = uniforms.data[1].y;
    scaleAmt = uniforms.data[1].z;
    offsetX = uniforms.data[1].w;

    offsetY = uniforms.data[2].x;
    tiling = i32(uniforms.data[2].y);
    flip = i32(uniforms.data[2].z);
    bgAlpha = uniforms.data[2].w;

    bgColor = uniforms.data[3].xyz;

    imageSize = uniforms.data[4].xy;

    tileOffset = uniforms.data[5].xy;
    fullResolution = uniforms.data[5].zw;

    // Internal rows match GLSL texture rows; presentation applies the final
    // Y conversion. Keep anchor, offset and rotation in that same space.
    return getImage(pos.xy);
}
`

export const TILE_UNIFORM_LAYOUT = {
  tileOffset: { slot: 5, components: 'xy' },
  fullResolution: { slot: 5, components: 'zw' }
}

/**
 * Applies the tile-aware media patch to the runtime's loaded effect
 * definitions.
 *
 * @param {object} renderer - Noisemaker CanvasRenderer exposing
 *   _loadedEffects (a Map of "namespace/name" to
 *   {namespace, name, instance} entries).
 * @returns {object|null} the patched loaded effect entry, or null when the
 *   effect has not been loaded.
 */
export function patchMediaTile (renderer) {
  if (!renderer || !renderer._loadedEffects || typeof renderer._loadedEffects.get !== 'function') return null
  const entry = renderer._loadedEffects.get('synth/media')
  if (!entry || !entry.instance) return null

  const instance = entry.instance

  // Extend the effect-level uniform layout with the tile uniforms. The
  // engine's program registry reads uniformLayout at plan-compile time and
  // packs tileOffset.xy / fullResolution.zw into uniform slot 5.
  instance.uniformLayout = {
    ...(instance.uniformLayout || {}),
    ...TILE_UNIFORM_LAYOUT
  }

  // Replace the mediaInput shader sources with the tile-aware versions.
  if (instance.shaders && instance.shaders.mediaInput) {
    instance.shaders.mediaInput = {
      ...instance.shaders.mediaInput,
      glsl: MEDIA_INPUT_GLSL,
      wgsl: MEDIA_INPUT_WGSL
    }
  }

  return entry
}
