var HydraEffects = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_CDN: () => DEFAULT_CDN,
    HYDRA_NAMESPACE: () => HYDRA_NAMESPACE,
    getEngine: () => getEngine,
    loadEngine: () => loadEngine,
    loadHydraEffects: () => loadHydraEffects,
    registerHydraEffects: () => registerHydraEffects
  });

  // src/glsl/glsl-functions.js
  var glsl_functions_default = () => [
    {
      name: "noise",
      type: "src",
      inputs: [
        {
          type: "float",
          name: "scale",
          default: 10
        },
        {
          type: "float",
          name: "offset",
          default: 0.1
        }
      ],
      glsl: `   return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 1.0);`
    },
    {
      name: "voronoi",
      type: "src",
      inputs: [
        {
          type: "float",
          name: "scale",
          default: 5
        },
        {
          type: "float",
          name: "speed",
          default: 0.3
        },
        {
          type: "float",
          name: "blending",
          default: 0.3
        }
      ],
      glsl: `   vec3 color = vec3(.0);
   // Scale
   _st *= scale;
   // Tile the space
   vec2 i_st = floor(_st);
   vec2 f_st = fract(_st);
   float m_dist = 10.;  // minimun distance
   vec2 m_point;        // minimum point
   for (int j=-1; j<=1; j++ ) {
   for (int i=-1; i<=1; i++ ) {
   vec2 neighbor = vec2(float(i),float(j));
   vec2 p = i_st + neighbor;
   vec2 point = fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
   point = 0.5 + 0.5*sin(time*speed + 6.2831*point);
   vec2 diff = neighbor + point - f_st;
   float dist = length(diff);
   if( dist < m_dist ) {
   m_dist = dist;
   m_point = point;
   }
   }
   }
   // Assign a color using the closest point position
   color += dot(m_point,vec2(.3,.6));
   color *= 1.0 - blending*m_dist;
   return vec4(color, 1.0);`
    },
    {
      name: "osc",
      type: "src",
      inputs: [
        {
          type: "float",
          name: "frequency",
          default: 60
        },
        {
          type: "float",
          name: "sync",
          default: 0.1
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   vec2 st = _st;
   float r = sin((st.x-offset/frequency+time*sync)*frequency)*0.5  + 0.5;
   float g = sin((st.x+time*sync)*frequency)*0.5 + 0.5;
   float b = sin((st.x+offset/frequency+time*sync)*frequency)*0.5  + 0.5;
   return vec4(r, g, b, 1.0);`
    },
    {
      name: "shape",
      type: "src",
      inputs: [
        {
          type: "float",
          name: "sides",
          default: 3
        },
        {
          type: "float",
          name: "radius",
          default: 0.3
        },
        {
          type: "float",
          name: "smoothing",
          default: 0.01
        }
      ],
      glsl: `   vec2 st = _st * 2. - 1.;
   // Angle and radius from the current pixel
   float a = atan(st.x,st.y)+3.1416;
   float r = (2.*3.1416)/sides;
   float d = cos(floor(.5+a/r)*r-a)*length(st);
   return vec4(vec3(1.0-smoothstep(radius,radius + smoothing + 0.0000001,d)), 1.0);`
    },
    {
      name: "gradient",
      type: "src",
      inputs: [
        {
          type: "float",
          name: "speed",
          default: 0
        }
      ],
      glsl: `   return vec4(_st, sin(time*speed), 1.0);`
    },
    {
      name: "src",
      type: "src",
      inputs: [
        {
          type: "sampler2D",
          name: "tex",
          default: NaN
        }
      ],
      glsl: `   //  vec2 uv = gl_FragCoord.xy/vec2(1280., 720.);
   return texture2D(tex, fract(_st));`
    },
    {
      name: "solid",
      type: "src",
      inputs: [
        {
          type: "float",
          name: "r",
          default: 0
        },
        {
          type: "float",
          name: "g",
          default: 0
        },
        {
          type: "float",
          name: "b",
          default: 0
        },
        {
          type: "float",
          name: "a",
          default: 1
        }
      ],
      glsl: `   return vec4(r, g, b, a);`
    },
    {
      name: "rotate",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "angle",
          default: 10
        },
        {
          type: "float",
          name: "speed",
          default: 0
        }
      ],
      glsl: `   vec2 xy = _st - vec2(0.5);
   float ang = angle + speed *time;
   xy = mat2(cos(ang),-sin(ang), sin(ang),cos(ang))*xy;
   xy += 0.5;
   return xy;`
    },
    {
      name: "scale",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1.5
        },
        {
          type: "float",
          name: "xMult",
          default: 1
        },
        {
          type: "float",
          name: "yMult",
          default: 1
        },
        {
          type: "float",
          name: "offsetX",
          default: 0.5
        },
        {
          type: "float",
          name: "offsetY",
          default: 0.5
        }
      ],
      glsl: `   vec2 xy = _st - vec2(offsetX, offsetY);
   xy*=(1.0/vec2(amount*xMult, amount*yMult));
   xy+=vec2(offsetX, offsetY);
   return xy;
   `
    },
    {
      name: "pixelate",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "pixelX",
          default: 20
        },
        {
          type: "float",
          name: "pixelY",
          default: 20
        }
      ],
      glsl: `   vec2 xy = vec2(pixelX, pixelY);
   return (floor(_st * xy) + 0.5)/xy;`
    },
    {
      name: "posterize",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "bins",
          default: 3
        },
        {
          type: "float",
          name: "gamma",
          default: 0.6
        }
      ],
      glsl: `   vec4 c2 = pow(_c0, vec4(gamma));
   c2 *= vec4(bins);
   c2 = floor(c2);
   c2/= vec4(bins);
   c2 = pow(c2, vec4(1.0/gamma));
   return vec4(c2.xyz, _c0.a);`
    },
    {
      name: "shift",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "r",
          default: 0.5
        },
        {
          type: "float",
          name: "g",
          default: 0
        },
        {
          type: "float",
          name: "b",
          default: 0
        },
        {
          type: "float",
          name: "a",
          default: 0
        }
      ],
      glsl: `   vec4 c2 = vec4(_c0);
   c2.r += fract(r);
   c2.g += fract(g);
   c2.b += fract(b);
   c2.a += fract(a);
   return vec4(c2.rgba);`
    },
    {
      name: "repeat",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "repeatX",
          default: 3
        },
        {
          type: "float",
          name: "repeatY",
          default: 3
        },
        {
          type: "float",
          name: "offsetX",
          default: 0
        },
        {
          type: "float",
          name: "offsetY",
          default: 0
        }
      ],
      glsl: `   vec2 st = _st * vec2(repeatX, repeatY);
   st.x += step(1., mod(st.y,2.0)) * offsetX;
   st.y += step(1., mod(st.x,2.0)) * offsetY;
   return fract(st);`
    },
    {
      name: "modulateRepeat",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "repeatX",
          default: 3
        },
        {
          type: "float",
          name: "repeatY",
          default: 3
        },
        {
          type: "float",
          name: "offsetX",
          default: 0.5
        },
        {
          type: "float",
          name: "offsetY",
          default: 0.5
        }
      ],
      glsl: `   vec2 st = _st * vec2(repeatX, repeatY);
   st.x += step(1., mod(st.y,2.0)) + _c0.r * offsetX;
   st.y += step(1., mod(st.x,2.0)) + _c0.g * offsetY;
   return fract(st);`
    },
    {
      name: "repeatX",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "reps",
          default: 3
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   vec2 st = _st * vec2(reps, 1.0);
   //  float f =  mod(_st.y,2.0);
   st.y += step(1., mod(st.x,2.0))* offset;
   return fract(st);`
    },
    {
      name: "modulateRepeatX",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "reps",
          default: 3
        },
        {
          type: "float",
          name: "offset",
          default: 0.5
        }
      ],
      glsl: `   vec2 st = _st * vec2(reps, 1.0);
   //  float f =  mod(_st.y,2.0);
   st.y += step(1., mod(st.x,2.0)) + _c0.r * offset;
   return fract(st);`
    },
    {
      name: "repeatY",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "reps",
          default: 3
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   vec2 st = _st * vec2(1.0, reps);
   //  float f =  mod(_st.y,2.0);
   st.x += step(1., mod(st.y,2.0))* offset;
   return fract(st);`
    },
    {
      name: "modulateRepeatY",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "reps",
          default: 3
        },
        {
          type: "float",
          name: "offset",
          default: 0.5
        }
      ],
      glsl: `   vec2 st = _st * vec2(reps, 1.0);
   //  float f =  mod(_st.y,2.0);
   st.x += step(1., mod(st.y,2.0)) + _c0.r * offset;
   return fract(st);`
    },
    {
      name: "kaleid",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "nSides",
          default: 4
        }
      ],
      glsl: `   vec2 st = _st;
   st -= 0.5;
   float r = length(st);
   float a = atan(st.y, st.x);
   float pi = 2.*3.1416;
   a = mod(a,pi/nSides);
   a = abs(a-pi/nSides/2.);
   return r*vec2(cos(a), sin(a));`
    },
    {
      name: "modulateKaleid",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "nSides",
          default: 4
        }
      ],
      glsl: `   vec2 st = _st - 0.5;
   float r = length(st);
   float a = atan(st.y, st.x);
   float pi = 2.*3.1416;
   a = mod(a,pi/nSides);
   a = abs(a-pi/nSides/2.);
   return (_c0.r+r)*vec2(cos(a), sin(a));`
    },
    {
      name: "scroll",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "scrollX",
          default: 0.5
        },
        {
          type: "float",
          name: "scrollY",
          default: 0.5
        },
        {
          type: "float",
          name: "speedX",
          default: 0
        },
        {
          type: "float",
          name: "speedY",
          default: 0
        }
      ],
      glsl: `
   _st.x += scrollX + time*speedX;
   _st.y += scrollY + time*speedY;
   return fract(_st);`
    },
    {
      name: "scrollX",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "scrollX",
          default: 0.5
        },
        {
          type: "float",
          name: "speed",
          default: 0
        }
      ],
      glsl: `   _st.x += scrollX + time*speed;
   return fract(_st);`
    },
    {
      name: "modulateScrollX",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "scrollX",
          default: 0.5
        },
        {
          type: "float",
          name: "speed",
          default: 0
        }
      ],
      glsl: `   _st.x += _c0.r*scrollX + time*speed;
   return fract(_st);`
    },
    {
      name: "scrollY",
      type: "coord",
      inputs: [
        {
          type: "float",
          name: "scrollY",
          default: 0.5
        },
        {
          type: "float",
          name: "speed",
          default: 0
        }
      ],
      glsl: `   _st.y += scrollY + time*speed;
   return fract(_st);`
    },
    {
      name: "modulateScrollY",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "scrollY",
          default: 0.5
        },
        {
          type: "float",
          name: "speed",
          default: 0
        }
      ],
      glsl: `   _st.y += _c0.r*scrollY + time*speed;
   return fract(_st);`
    },
    {
      name: "add",
      type: "combine",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1
        }
      ],
      glsl: `   return (_c0+_c1)*amount + _c0*(1.0-amount);`
    },
    {
      name: "sub",
      type: "combine",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1
        }
      ],
      glsl: `   return (_c0-_c1)*amount + _c0*(1.0-amount);`
    },
    {
      name: "layer",
      type: "combine",
      inputs: [],
      glsl: `   return vec4(mix(_c0.rgb, _c1.rgb, _c1.a), clamp(_c0.a + _c1.a, 0.0, 1.0));`
    },
    {
      name: "blend",
      type: "combine",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 0.5
        }
      ],
      glsl: `   return _c0*(1.0-amount)+_c1*amount;`
    },
    {
      name: "mult",
      type: "combine",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1
        }
      ],
      glsl: `   return _c0*(1.0-amount)+(_c0*_c1)*amount;`
    },
    {
      name: "diff",
      type: "combine",
      inputs: [],
      glsl: `   return vec4(abs(_c0.rgb-_c1.rgb), max(_c0.a, _c1.a));`
    },
    {
      name: "modulate",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 0.1
        }
      ],
      glsl: `   //  return fract(st+(_c0.xy-0.5)*amount);
   return _st + _c0.xy*amount;`
    },
    {
      name: "modulateScale",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "multiple",
          default: 1
        },
        {
          type: "float",
          name: "offset",
          default: 1
        }
      ],
      glsl: `   vec2 xy = _st - vec2(0.5);
   xy*=(1.0/vec2(offset + multiple*_c0.r, offset + multiple*_c0.g));
   xy+=vec2(0.5);
   return xy;`
    },
    {
      name: "modulatePixelate",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "multiple",
          default: 10
        },
        {
          type: "float",
          name: "offset",
          default: 3
        }
      ],
      glsl: `   vec2 xy = vec2(offset + _c0.x*multiple, offset + _c0.y*multiple);
   return (floor(_st * xy) + 0.5)/xy;`
    },
    {
      name: "modulateRotate",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "multiple",
          default: 1
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   vec2 xy = _st - vec2(0.5);
   float angle = offset + _c0.x * multiple;
   xy = mat2(cos(angle),-sin(angle), sin(angle),cos(angle))*xy;
   xy += 0.5;
   return xy;`
    },
    {
      name: "modulateHue",
      type: "combineCoord",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1
        }
      ],
      glsl: `   return _st + (vec2(_c0.g - _c0.r, _c0.b - _c0.g) * amount * 1.0/resolution);`
    },
    {
      name: "invert",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1
        }
      ],
      glsl: `   return vec4((1.0-_c0.rgb)*amount + _c0.rgb*(1.0-amount), _c0.a);`
    },
    {
      name: "contrast",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 1.6
        }
      ],
      glsl: `   vec4 c = (_c0-vec4(0.5))*vec4(amount) + vec4(0.5);
   return vec4(c.rgb, _c0.a);`
    },
    {
      name: "brightness",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 0.4
        }
      ],
      glsl: `   return vec4(_c0.rgb + vec3(amount), _c0.a);`
    },
    {
      name: "mask",
      type: "combine",
      inputs: [],
      glsl: `   float a = _luminance(_c1.rgb);
  return vec4(_c0.rgb*a, a*_c0.a);`
    },
    {
      name: "luma",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "threshold",
          default: 0.5
        },
        {
          type: "float",
          name: "tolerance",
          default: 0.1
        }
      ],
      glsl: `   float a = smoothstep(threshold-(tolerance+0.0000001), threshold+(tolerance+0.0000001), _luminance(_c0.rgb));
   return vec4(_c0.rgb*a, a);`
    },
    {
      name: "thresh",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "threshold",
          default: 0.5
        },
        {
          type: "float",
          name: "tolerance",
          default: 0.04
        }
      ],
      glsl: `   return vec4(vec3(smoothstep(threshold-(tolerance+0.0000001), threshold+(tolerance+0.0000001), _luminance(_c0.rgb))), _c0.a);`
    },
    {
      name: "color",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "r",
          default: 1
        },
        {
          type: "float",
          name: "g",
          default: 1
        },
        {
          type: "float",
          name: "b",
          default: 1
        },
        {
          type: "float",
          name: "a",
          default: 1
        }
      ],
      glsl: `   vec4 c = vec4(r, g, b, a);
   vec4 pos = step(0.0, c); // detect whether negative
   // if > 0, return r * _c0
   // if < 0 return (1.0-r) * _c0
   return vec4(mix((1.0-_c0)*abs(c), c*_c0, pos));`
    },
    {
      name: "saturate",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 2
        }
      ],
      glsl: `   const vec3 W = vec3(0.2125, 0.7154, 0.0721);
   vec3 intensity = vec3(dot(_c0.rgb, W));
   return vec4(mix(intensity, _c0.rgb, amount), _c0.a);`
    },
    {
      name: "hue",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "hue",
          default: 0.4
        }
      ],
      glsl: `   vec3 c = _rgbToHsv(_c0.rgb);
   c.r += hue;
   //  c.r = fract(c.r);
   return vec4(_hsvToRgb(c), _c0.a);`
    },
    {
      name: "colorama",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "amount",
          default: 5e-3
        }
      ],
      glsl: `   vec3 c = _rgbToHsv(_c0.rgb);
   c += vec3(amount);
   c = _hsvToRgb(c);
   c = fract(c);
   return vec4(c, _c0.a);`
    },
    {
      name: "prev",
      type: "src",
      inputs: [],
      glsl: `   return texture2D(prevBuffer, fract(_st));`
    },
    {
      name: "sum",
      type: "color",
      inputs: [
        {
          type: "vec4",
          name: "scale",
          default: 1
        }
      ],
      glsl: `   vec4 v = _c0 * s;
   return v.r + v.g + v.b + v.a;
   }
   float sum(vec2 _st, vec4 s) { // vec4 is not a typo, because argument type is not overloaded
   vec2 v = _st.xy * s.xy;
   return v.x + v.y;`
    },
    {
      name: "r",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "scale",
          default: 1
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   return vec4(_c0.r * scale + offset);`
    },
    {
      name: "g",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "scale",
          default: 1
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   return vec4(_c0.g * scale + offset);`
    },
    {
      name: "b",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "scale",
          default: 1
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   return vec4(_c0.b * scale + offset);`
    },
    {
      name: "a",
      type: "color",
      inputs: [
        {
          type: "float",
          name: "scale",
          default: 1
        },
        {
          type: "float",
          name: "offset",
          default: 0
        }
      ],
      glsl: `   return vec4(_c0.a * scale + offset);`
    }
  ];

  // src/glsl/utility-functions.js
  var utility_functions_default = {
    _luminance: {
      type: "util",
      glsl: `float _luminance(vec3 rgb){
      const vec3 W = vec3(0.2125, 0.7154, 0.0721);
      return dot(rgb, W);
    }`
    },
    _noise: {
      type: "util",
      glsl: `
    //	Simplex 3D Noise
    //	by Ian McEwan, Ashima Arts
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float _noise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //  x0 = x0 - 0. + 0.0 * C
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  // Permutations
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

  // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
    `
    },
    _rgbToHsv: {
      type: "util",
      glsl: `vec3 _rgbToHsv(vec3 c){
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }`
    },
    _hsvToRgb: {
      type: "util",
      glsl: `vec3 _hsvToRgb(vec3 c){
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }`
    }
  };

  // src/engine/index.js
  var DEFAULT_CDN = "https://shaders.noisedeck.app/1";
  var _engineModule = null;
  var _engineCDN = null;
  var _enginePromise = null;
  async function loadEngine(cdn = DEFAULT_CDN) {
    if (_engineModule) {
      if (_engineCDN !== cdn) {
        throw new Error(
          `loadEngine: already loaded from ${_engineCDN}; cannot reload from ${cdn}. The engine is a singleton; use a fresh page to switch.`
        );
      }
      return _engineModule;
    }
    if (_enginePromise) return _enginePromise;
    const url = `${cdn}/noisemaker-shaders-core.esm.min.js`;
    _engineCDN = cdn;
    _enginePromise = import(url).then((mod) => {
      _engineModule = mod;
      return mod;
    }).catch((err) => {
      _enginePromise = null;
      _engineCDN = null;
      throw new Error(`Failed to load Noisemaker engine from ${url}: ${err.message}`);
    });
    return _enginePromise;
  }
  function getEngine() {
    if (!_engineModule) {
      throw new Error("Engine not loaded \u2014 await loadEngine() first.");
    }
    return _engineModule;
  }

  // src/engine/hydraGlsl.js
  function isExecutableHydraEffect(effect) {
    return effect.name !== "sum";
  }
  function hydraGlslBody(effect) {
    let body = effect.glsl.replace(/\btexture2D\s*\(/g, "texture(").replace(/\btextureCube\s*\(/g, "texture(");
    if (effect.name === "src" || effect.name === "prev") {
      body = body.replace(
        /fract\(\s*_st\s*\)/g,
        "fract(vec2(_st.x, 1.0 - _st.y))"
      );
    }
    return body;
  }

  // src/engine/portHydraEffects.js
  var HYDRA_NAMESPACE = "hydra";
  var CALLABLE_ALIASES = { osc: "hydraOsc" };
  var TYPE_LEADING = {
    src: [{ type: "vec2", name: "_st" }],
    coord: [{ type: "vec2", name: "_st" }],
    color: [{ type: "vec4", name: "_c0" }],
    combine: [{ type: "vec4", name: "_c0" }, { type: "vec4", name: "_c1" }],
    combineCoord: [{ type: "vec2", name: "_st" }, { type: "vec4", name: "_c0" }]
  };
  function processInputs(effect) {
    const leading = TYPE_LEADING[effect.type] || [];
    const all = leading.concat(effect.inputs || []);
    return all.slice(1);
  }
  function isSurfaceInput(input) {
    return input.type === "sampler2D" || input.name === "_c0" || input.name === "_c1";
  }
  function classifyInputs(inputs) {
    const wrapperInputs = [];
    const samplerInputs = [];
    for (const def of inputs) {
      if (isSurfaceInput(def)) {
        const samplerName = samplerInputs.length === 0 ? "tex" : "tex2";
        samplerInputs.push({ inputName: def.name, samplerName, def });
      } else {
        wrapperInputs.push(def);
      }
    }
    return { wrapperInputs, samplerInputs };
  }
  var TEMPLATES = {
    src: {
      needsInputTex: false,
      body: (sig, args, _s1, _s2) => `
void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  fragColor = ${sig}(_st${args});
}`
    },
    coord: {
      needsInputTex: true,
      body: (sig, args) => `
void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  vec2 newUV = ${sig}(_st${args});
  fragColor = texture(inputTex, vec2(newUV.x, 1.0 - newUV.y));
}`
    },
    color: {
      needsInputTex: true,
      body: (sig, args) => `
void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  vec4 _c0 = texture(inputTex, vec2(_st.x, 1.0 - _st.y));
  fragColor = ${sig}(_c0${args});
}`
    },
    combine: {
      needsInputTex: true,
      body: (sig, args, sampler1) => `
void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  vec4 _c0 = texture(inputTex, vec2(_st.x, 1.0 - _st.y));
  vec4 _c1 = texture(${sampler1}, vec2(_st.x, 1.0 - _st.y));
  fragColor = ${sig}(_c0, _c1${args});
}`
    },
    combineCoord: {
      needsInputTex: true,
      body: (sig, args, sampler1) => `
void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  vec4 _c0 = texture(${sampler1}, vec2(_st.x, 1.0 - _st.y));
  vec2 newUV = ${sig}(_st, _c0${args});
  fragColor = texture(inputTex, vec2(newUV.x, 1.0 - newUV.y));
}`
    }
  };
  function inputToGlobalSpec(input) {
    if (isSurfaceInput(input)) {
      return {
        type: "surface",
        default: "none",
        ui: { label: input.name }
      };
    }
    return {
      type: input.type,
      default: input.default,
      uniform: input.name,
      ui: { label: input.name, control: input.type === "float" ? "slider" : false }
    };
  }
  function inlineUtilities(body) {
    const used = [];
    for (const [name, util] of Object.entries(utility_functions_default)) {
      const re = new RegExp(`\\b${name}\\b\\s*\\(`);
      if (re.test(body)) used.push(util.glsl);
    }
    return used.join("\n");
  }
  function wrapperName(funcName) {
    return `_hydra_${funcName}`;
  }
  function buildSignature(funcName, type, wrapperInputs) {
    const leading = {
      src: [{ type: "vec2", name: "_st" }],
      coord: [{ type: "vec2", name: "_st" }],
      color: [{ type: "vec4", name: "_c0" }],
      combine: [{ type: "vec4", name: "_c0" }, { type: "vec4", name: "_c1" }],
      combineCoord: [{ type: "vec2", name: "_st" }, { type: "vec4", name: "_c0" }]
    }[type];
    const ret = type === "coord" || type === "combineCoord" ? "vec2" : "vec4";
    const allArgs = leading.concat(wrapperInputs);
    const fnName = wrapperName(funcName);
    const signature = `${ret} ${fnName}(${allArgs.map((i) => `${i.type} ${i.name}`).join(", ")})`;
    const callArgs = wrapperInputs.length > 0 ? ", " + wrapperInputs.map((i) => i.name).join(", ") : "";
    return { signature, callArgs, ret, fnName };
  }
  function buildShader(effect) {
    const { name, type } = effect;
    const tmpl = TEMPLATES[type];
    if (!tmpl) throw new Error(`Hydra effect '${name}' has unknown type '${type}'`);
    const body = hydraGlslBody(effect);
    const inputs = processInputs(effect);
    const { wrapperInputs, samplerInputs } = classifyInputs(inputs);
    const { signature, callArgs, fnName } = buildSignature(name, type, wrapperInputs);
    const utilities = inlineUtilities(body);
    const uniformLines = wrapperInputs.map((i) => `uniform ${i.type} ${i.name};`).join("\n");
    const samplerLines = [];
    if (tmpl.needsInputTex) samplerLines.push("uniform sampler2D inputTex;");
    for (const s of samplerInputs) samplerLines.push(`uniform sampler2D ${s.samplerName};`);
    const sampler1 = samplerInputs[0]?.samplerName || null;
    const sampler2 = samplerInputs[1]?.samplerName || null;
    const wrapper = `${signature} {
  ${body}
}`;
    return `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform float time;
// prevBuffer = previous-frame contents of the current output.
// Declared unconditionally so the built-in prev effect (and any user effect
// added via setFunction) can sample it without redeclaring.
uniform sampler2D prevBuffer;
${samplerLines.join("\n")}
${uniformLines}

out vec4 fragColor;

${utilities}

${wrapper}
${tmpl.body(fnName, callArgs, sampler1, sampler2)}
`;
  }
  function buildEffectDefinition(effect, Effect) {
    const { name, type } = effect;
    const tmpl = TEMPLATES[type];
    if (!tmpl) throw new Error(`Hydra effect '${name}' has unknown type '${type}'`);
    const inputs = processInputs(effect);
    const { wrapperInputs, samplerInputs } = classifyInputs(inputs);
    const globals = {};
    for (const input of wrapperInputs) {
      globals[input.name] = inputToGlobalSpec(input);
    }
    for (const s of samplerInputs) {
      globals[s.samplerName] = {
        type: "surface",
        default: "none",
        ui: { label: s.samplerName }
      };
    }
    const passInputs = {};
    if (tmpl.needsInputTex) passInputs.inputTex = "inputTex";
    for (const s of samplerInputs) passInputs[s.samplerName] = s.samplerName;
    passInputs.prevBuffer = "feedback";
    const passUniforms = {};
    for (const input of wrapperInputs) {
      passUniforms[input.name] = input.name;
    }
    return new Effect({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      namespace: HYDRA_NAMESPACE,
      func: name,
      tags: [type],
      description: `Hydra ${type} effect: ${name}`,
      globals,
      textures: {
        out: { format: "rgba32f" }
      },
      passes: [
        {
          name: "render",
          program: name,
          type: "render",
          inputs: passInputs,
          uniforms: passUniforms,
          outputs: { fragColor: "outputTex" }
        }
      ]
    });
  }
  function registerHydraEffect(effect, engine) {
    const eng = engine || getEngine();
    const definition = buildEffectDefinition(effect, eng.Effect);
    const shader = buildShader(effect);
    if (!definition.shaders) definition.shaders = {};
    definition.shaders[effect.name] = { glsl: shader };
    eng.registerEffect(effect.name, definition);
    eng.registerEffect(`${HYDRA_NAMESPACE}.${effect.name}`, definition);
    eng.registerEffect(`${HYDRA_NAMESPACE}/${effect.name}`, definition);
    const callableName = CALLABLE_ALIASES[effect.name] || effect.name;
    if (callableName !== effect.name) {
      eng.registerEffect(`${HYDRA_NAMESPACE}.${callableName}`, definition);
    }
    const args = Object.entries(definition.globals || {}).map(([key, spec]) => ({
      name: key,
      type: spec.type === "vec4" ? "color" : spec.type,
      default: spec.default,
      enum: spec.enum || spec.enumPath,
      enumPath: spec.enum || spec.enumPath,
      min: spec.min,
      max: spec.max,
      uniform: spec.uniform,
      choices: spec.choices
    }));
    const opSpec = { name: callableName, args };
    eng.registerOp(`${HYDRA_NAMESPACE}.${callableName}`, opSpec);
    if (eng.isStarterEffect({
      namespace: HYDRA_NAMESPACE,
      name: effect.name,
      instance: definition
    })) {
      eng.registerStarterOps([
        callableName,
        `${HYDRA_NAMESPACE}.${callableName}`
      ]);
    }
    return definition;
  }
  function registerAllHydraEffects(engine) {
    const eng = engine || getEngine();
    const builtins = glsl_functions_default().filter(isExecutableHydraEffect);
    for (const effect of builtins) {
      registerHydraEffect(effect, eng);
    }
  }

  // src/engine/fuseHydraPlan.js
  var EFFECTS = new Map(
    glsl_functions_default().filter(isExecutableHydraEffect).map((effect) => [effect.name, effect])
  );
  var INSTALLED = Symbol("hydraCompilerInstalled");
  var PROMOTED_SURFACES = /* @__PURE__ */ new WeakMap();
  var surfaceBackupIndex = 0;
  var HYDRA_SURFACE_SPEC = Object.freeze({
    width: "screen",
    height: "screen",
    format: "rgba32f",
    usage: ["render", "sample", "copySrc", "copyDst"]
  });
  var LEADING_ARGUMENTS = {
    src: [{ type: "vec2", name: "_st" }],
    coord: [{ type: "vec2", name: "_st" }],
    color: [{ type: "vec4", name: "_c0" }],
    combine: [
      { type: "vec4", name: "_c0" },
      { type: "vec4", name: "_c1" }
    ],
    combineCoord: [
      { type: "vec2", name: "_st" },
      { type: "vec4", name: "_c0" }
    ]
  };
  function effectName(step) {
    if (!step.op.startsWith("hydra.")) return null;
    const name = step.op.slice("hydra.".length);
    return name === "hydraOsc" ? "osc" : name;
  }
  function isTextureInput(_effect, input) {
    return input.type === "sampler2D";
  }
  function textureArgumentName(effect) {
    const sampler = (effect.inputs || []).find((input) => isTextureInput(effect, input));
    if (sampler) return sampler.name;
    if (effect.type === "combine" || effect.type === "combineCoord") return "tex";
    return null;
  }
  function valueLiteral(value, input, temp, bindings, bindingTypes) {
    const type = input.type;
    if (value && typeof value === "object" && ["Oscillator", "Midi", "Audio"].includes(value.type || value._ast?.type)) {
      const uniform = `_hydra_${temp}_${input.name}`;
      bindings[uniform] = {
        value,
        min: input.min ?? 0,
        max: input.max ?? 100
      };
      bindingTypes[uniform] = type;
      return uniform;
    }
    const resolved = value && typeof value === "object" && "value" in value ? value.value : value;
    if (typeof resolved === "number" && Number.isFinite(resolved)) {
      return Number.isInteger(resolved) ? `${resolved}.0` : String(resolved);
    }
    if (typeof resolved === "boolean") return resolved ? "true" : "false";
    if (Array.isArray(resolved)) {
      if (!/^vec[234]$/.test(type)) throw new Error(`Unsupported Hydra input type '${type}'`);
      return `${type}(${resolved.map((item) => valueLiteral(
        item,
        { type: "float", name: input.name },
        temp,
        bindings,
        bindingTypes
      )).join(", ")})`;
    }
    throw new Error(`Unsupported dynamic Hydra input '${String(resolved)}'`);
  }
  function wrapperName2(name) {
    return `_hydra_${name}`;
  }
  function buildWrapper(effect) {
    const leading = LEADING_ARGUMENTS[effect.type];
    const inputs = (effect.inputs || []).filter((input, index) => !isTextureInput(effect, input, index));
    const returnType = effect.type === "coord" || effect.type === "combineCoord" ? "vec2" : "vec4";
    const args = leading.concat(inputs).map((input) => `${input.type} ${input.name}`).join(", ");
    return `${returnType} ${wrapperName2(effect.name)}(${args}) {
${hydraGlslBody(effect)}
}`;
  }
  function buildNode(step, effect, steps, bindings, bindingTypes) {
    const inputs = effect.inputs || [];
    const values = inputs.filter((input, index) => !isTextureInput(effect, input, index)).map((input) => valueLiteral(
      step.args?.[input.name] ?? input.default,
      input,
      step.temp,
      bindings,
      bindingTypes
    ));
    const suffix = values.length > 0 ? `, ${values.join(", ")}` : "";
    const upstream = step.from == null ? null : `_hydra_node_${step.from}`;
    const textureInput = textureArgumentName(effect);
    let nested = null;
    if (textureInput) {
      const reference = step.args?.[textureInput];
      if (reference?.kind !== "temp" || !steps.has(reference.index)) {
        throw new Error(`Hydra effect '${effect.name}' requires a Hydra texture input`);
      }
      nested = `_hydra_node_${reference.index}`;
    }
    let expression;
    if (effect.type === "src") {
      if (textureInput) throw new Error(`Hydra source '${effect.name}' cannot be fused`);
      expression = `${wrapperName2(effect.name)}(_st${suffix})`;
    } else if (!upstream) {
      throw new Error(`Hydra effect '${effect.name}' has no upstream source`);
    } else if (effect.type === "coord") {
      expression = `${upstream}(${wrapperName2(effect.name)}(_st${suffix}))`;
    } else if (effect.type === "color") {
      expression = `${wrapperName2(effect.name)}(${upstream}(_st)${suffix})`;
    } else if (effect.type === "combine") {
      expression = `${wrapperName2(effect.name)}(${upstream}(_st), ${nested}(_st)${suffix})`;
    } else if (effect.type === "combineCoord") {
      expression = `${upstream}(${wrapperName2(effect.name)}(_st, ${nested}(_st)${suffix}))`;
    } else {
      throw new Error(`Unsupported Hydra effect type '${effect.type}'`);
    }
    return `vec4 _hydra_node_${step.temp}(vec2 _st) {
  return ${expression};
}`;
  }
  function usedUtilities(effects) {
    const bodies = effects.map((effect) => effect.glsl).join("\n");
    return Object.entries(utility_functions_default).filter(([name]) => new RegExp(`\\b${name}\\b\\s*\\(`).test(bodies)).map(([, utility]) => utility.glsl);
  }
  function reachableHydraSteps(finalTemp, steps) {
    const reachable = /* @__PURE__ */ new Map();
    function visit(temp) {
      if (reachable.has(temp)) return;
      const step = steps.get(temp);
      const name = step && effectName(step);
      const effect = name && EFFECTS.get(name);
      if (!step || !effect) throw new Error("Plan contains a non-Hydra node");
      reachable.set(temp, { step, effect });
      if (step.from != null) visit(step.from);
      const textureInput = textureArgumentName(effect);
      if (textureInput) {
        const reference = step.args?.[textureInput];
        if (reference?.kind !== "temp") {
          throw new Error(`Hydra effect '${name}' uses an external texture`);
        }
        visit(reference.index);
      }
    }
    visit(finalTemp);
    return [...reachable.values()].sort((a, b) => a.step.temp - b.step.temp);
  }
  function buildShader2(nodes, finalTemp) {
    const effects = [...new Map(nodes.map(({ effect }) => [effect.name, effect])).values()];
    const utilities = usedUtilities(effects);
    const wrappers = effects.map(buildWrapper);
    const steps = new Map(nodes.map(({ step }) => [step.temp, step]));
    const uniformBindings = {};
    const bindingTypes = {};
    const nodeFunctions = nodes.map(({ step, effect }) => buildNode(
      step,
      effect,
      steps,
      uniformBindings,
      bindingTypes
    ));
    const bindingDeclarations = Object.entries(bindingTypes).map(([name, type]) => `uniform ${type} ${name};`).join("\n");
    const glsl = `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform float time;
uniform sampler2D prevBuffer;
${bindingDeclarations}

out vec4 fragColor;

${utilities.join("\n\n")}

${wrappers.join("\n\n")}

${nodeFunctions.join("\n\n")}

void main() {
  vec2 _st = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution.xy;
  fragColor = _hydra_node_${finalTemp}(_st);
}
`;
    return { glsl, uniformBindings };
  }
  function buildHydraShaderOverrides(compiled) {
    const shaderOverrides = {};
    const outputSurfaces = [];
    const preserveSurfaces = [];
    const retainSurfaces = [];
    const uniformBindings = {};
    for (const plan of compiled?.plans || []) {
      const chain = plan.chain || [];
      const writeStep = [...chain].reverse().find((step) => step.op === "_write");
      const finalTemp = writeStep?.from;
      const output = plan.write?.name || writeStep?.args?.tex?.name;
      for (const step of chain) {
        if (step.op === "_write") continue;
        for (const value of Object.values(step.args || {})) {
          if (value?.kind === "output") retainSurfaces.push(value.name);
        }
        if (output && effectName(step) === "prev") {
          preserveSurfaces.push(output);
          retainSurfaces.push(output);
        }
      }
      if (finalTemp == null || !output) continue;
      const steps = new Map(
        chain.filter((step) => !step.builtin).map((step) => [step.temp, step])
      );
      const finalStep = steps.get(finalTemp);
      if (finalStep && effectName(finalStep)) {
        outputSurfaces.push(output);
        for (const step of steps.values()) {
          const name = effectName(step);
          if (!name) continue;
          for (const value of Object.values(step.args || {})) {
            if (value?.kind === "output") {
              if (value.name === output) preserveSurfaces.push(output);
            }
          }
        }
      }
      try {
        const nodes = reachableHydraSteps(finalTemp, steps);
        const final = nodes.find(({ step }) => step.temp === finalTemp);
        const fused = buildShader2(nodes, finalTemp);
        shaderOverrides[finalTemp] = {
          [final.effect.name]: { glsl: fused.glsl }
        };
        if (Object.keys(fused.uniformBindings).length > 0) {
          uniformBindings[finalTemp] = fused.uniformBindings;
        }
      } catch (_) {
      }
    }
    const result = {
      shaderOverrides,
      outputSurfaces: [...new Set(outputSurfaces)]
    };
    if (preserveSurfaces.length > 0) {
      result.preserveSurfaces = [...new Set(preserveSurfaces)];
    }
    if (retainSurfaces.length > 0) {
      result.retainSurfaces = [...new Set(retainSurfaces)];
    }
    if (Object.keys(uniformBindings).length > 0) result.uniformBindings = uniformBindings;
    return result;
  }
  function mergeShaderOverrides(generated, supplied = {}) {
    const merged = {};
    for (const [temp, programs] of Object.entries(generated)) {
      merged[temp] = { ...programs };
    }
    for (const [temp, programs] of Object.entries(supplied)) {
      merged[temp] = { ...merged[temp] || {}, ...programs };
    }
    return merged;
  }
  function backupSurfaceRead(pipeline, surface) {
    const { backend } = pipeline;
    const state = pipeline.surfaces.get(surface);
    const texture = state && backend.textures.get(state.read);
    if (!state || !texture || typeof backend.createTexture !== "function" || typeof backend.copyTexture !== "function") {
      throw new Error(`Cannot preserve Hydra surface '${surface}' during format migration`);
    }
    const name = `_hydra_surface_backup_${surface}_${surfaceBackupIndex++}`;
    backend.createTexture(name, {
      width: texture.width,
      height: texture.height,
      format: texture.format,
      usage: ["render", "sample", "copySrc", "copyDst"]
    });
    backend.copyTexture(state.read, name);
    return { name, surface };
  }
  function reconcileSurfaceFormats(renderer, outputSurfaces, preserveSurfaces = [], retainSurfaces = []) {
    const pipeline = renderer.pipeline;
    if (!pipeline?.graph?.textures || !pipeline.backend?.textures || !pipeline.surfaces) return;
    const promoted = new Set(outputSurfaces);
    const preserve = new Set(preserveSurfaces);
    const retain = new Set(retainSurfaces);
    const previous = PROMOTED_SURFACES.get(renderer) || /* @__PURE__ */ new Map();
    const current = /* @__PURE__ */ new Map();
    const touched = /* @__PURE__ */ new Set([...previous.keys(), ...promoted]);
    for (const surface of promoted) {
      pipeline.graph.textures.set(`global_${surface}`, HYDRA_SURFACE_SPEC);
      current.set(surface, HYDRA_SURFACE_SPEC);
    }
    for (const surface of retain) {
      if (current.has(surface) || !previous.has(surface)) continue;
      const spec = previous.get(surface);
      pipeline.graph.textures.set(`global_${surface}`, spec);
      current.set(surface, spec);
    }
    for (const [surface, spec] of previous) {
      const key = `global_${surface}`;
      if (!current.has(surface) && pipeline.graph.textures.get(key) === spec) {
        pipeline.graph.textures.delete(key);
      }
    }
    let recreate = false;
    const backups = [];
    for (const surface of touched) {
      const state = pipeline.surfaces.get(surface);
      if (!state) continue;
      const key = `global_${surface}`;
      const desired = pipeline.graph.textures.get(key)?.format || "rgba16f";
      const actual = pipeline.backend.textures.get(state.read)?.format;
      if (actual === desired) continue;
      if (preserve.has(surface) && pipeline.backend.getName?.() === "WebGPU") {
        const retained = { ...HYDRA_SURFACE_SPEC, format: actual };
        pipeline.graph.textures.set(key, retained);
        current.set(surface, retained);
        continue;
      }
      if (preserve.has(surface)) backups.push(backupSurfaceRead(pipeline, surface));
      pipeline.backend.destroyTexture(state.read);
      pipeline.backend.destroyTexture(state.write);
      pipeline.surfaces.delete(surface);
      recreate = true;
    }
    if (recreate) {
      try {
        pipeline.createSurfaces();
        for (const backup of backups) {
          const state = pipeline.surfaces.get(backup.surface);
          if (!state) throw new Error(`Hydra surface '${backup.surface}' was not recreated`);
          pipeline.backend.copyTexture(backup.name, state.read);
        }
      } finally {
        for (const backup of backups) pipeline.backend.destroyTexture(backup.name);
      }
    }
    PROMOTED_SURFACES.set(renderer, current);
  }
  function applyUniformBindings(pipeline, uniformBindings = {}) {
    for (const [temp, bindings] of Object.entries(uniformBindings)) {
      const passes = (pipeline?.graph?.passes || []).filter((pass) => pass.nodeId === `node_${temp}`);
      for (const pass of passes) {
        pass.uniforms ||= {};
        pass.uniformSpecs ||= {};
        for (const [name, binding] of Object.entries(bindings)) {
          pass.uniforms[name] = binding.value;
          pass.uniformSpecs[name] = {
            min: binding.min,
            max: binding.max
          };
        }
      }
    }
  }
  function installHydraCompiler(engine) {
    const prototype = engine?.CanvasRenderer?.prototype;
    if (!prototype || typeof prototype.compile !== "function" || typeof engine.compile !== "function") {
      throw new Error("Noisemaker CanvasRenderer compiler is required");
    }
    if (prototype[INSTALLED]) return engine;
    const compile = prototype.compile;
    Object.defineProperty(prototype, INSTALLED, { value: true });
    prototype.compile = async function compileWithHydraParity(source, options = {}) {
      const compiled = engine.compile(source);
      const hydra = buildHydraShaderOverrides(compiled);
      const pipeline = await compile.call(this, source, {
        ...options,
        shaderOverrides: mergeShaderOverrides(
          hydra.shaderOverrides,
          options.shaderOverrides
        )
      });
      applyUniformBindings(pipeline, hydra.uniformBindings);
      reconcileSurfaceFormats(
        this,
        hydra.outputSurfaces,
        hydra.preserveSurfaces,
        hydra.retainSurfaces
      );
      return pipeline;
    };
    return engine;
  }

  // src/index.js
  var NAMESPACE_DESCRIPTION = "Hydra effects ported to the Noisemaker engine";
  function registerHydraEffects(engine) {
    if (!engine || typeof engine.registerNamespace !== "function") {
      throw new Error("Noisemaker engine with registerNamespace() is required");
    }
    engine.registerNamespace(HYDRA_NAMESPACE, {
      description: NAMESPACE_DESCRIPTION
    });
    registerAllHydraEffects(engine);
    installHydraCompiler(engine);
    return engine;
  }
  async function loadHydraEffects({
    engine,
    cdn = DEFAULT_CDN
  } = {}) {
    const resolvedEngine = engine || await loadEngine(cdn);
    return registerHydraEffects(resolvedEngine);
  }
  return __toCommonJS(index_exports);
})();
