import html from 'choo/html'
import Component from 'choo/component'
import P5 from './../lib/p5-wrapper.js'
import PatchBay from './../lib/patch-bay/pb-live.js'
import { createNoisemakerRuntime } from './../lib/noisemaker-runtime.mjs'

export default class HydraCanvas extends Component {
  constructor(id, state, emit) {
    super(id)
    this.local = state.components[id] = {}
    state.hydra = this
    this.state = state
    this.emit = emit
    this.canvas = null
    this.hydra = null
    this._unloaded = false
  }

  load(element) {
    this._unloaded = false
    this.canvas = element.querySelector('canvas')
    window.P5 = P5

    this._engineReady = createNoisemakerRuntime({ canvas: this.canvas }).then(renderer => {
      if (this._unloaded) {
        renderer.stop()
        return Promise.resolve(renderer.dispose()).then(() => renderer)
      }
      this.hydra = renderer
      window.hydraSynth = renderer

      if (this.state.serverURL !== null) {
        this.pb = new PatchBay()
        this.captureStream = this.canvas.captureStream(25)
        this.pb.init(this.captureStream, {
          server: this.state.serverURL,
          room: 'iclc'
        })
        window.pb = this.pb
      }

      this.emit('hydra loaded')
      return renderer
    }).catch(error => {
      if (typeof window._reportError === 'function') window._reportError(error)
      else console.error(error)
      throw error
    })
  }

  unload() {
    this._unloaded = true
    const renderer = this.hydra
    this.hydra = null
    if (renderer) {
      renderer.stop()
      Promise.resolve(renderer.dispose()).catch(error => {
        if (typeof window._reportError === 'function') window._reportError(error)
      })
      if (window.hydraSynth === renderer) window.hydraSynth = null
    }
    if (this.captureStream) {
      for (const track of this.captureStream.getTracks()) track.stop()
      this.captureStream = null
    }
    if (this.pb && typeof this.pb._destroy === 'function') this.pb._destroy()
    this.pb = null
  }

  getScreenImage(callback) {
    this.canvas.toBlob(callback, 'image/png')
  }

  downloadFrame() {
    this.canvas.toBlob(blob => {
      const link = document.createElement('a')
      const date = new Date()
      link.download = `hydra-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}.png`
      link.href = URL.createObjectURL(blob)
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 300)
    }, 'image/png')
  }

  clear() {
    if (!this.hydra) return Promise.resolve()
    return this.hydra.compile(
      'search hydra\nsolid(r: 0, g: 0, b: 0, a: 0).write(o0)'
    )
  }

  update() {
    return false
  }

  createElement({ width = window.innerWidth, height = window.innerHeight } = {}) {
    return html`<div style="width:100%;height:100%;">
      <canvas id="hydra-canvas" class="bg-black" style="image-rendering:pixelated; width:100%;height:100%" width="${width}" height="${height}"></canvas>
    </div>`
  }
}
