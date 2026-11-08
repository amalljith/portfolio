import { vertexShader, fragmentShader } from './causticsShaders'
import { readColor } from './textMasks'
import { CAUSTICS_SETTINGS } from './causticsConfig'

export class CausticsRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.targets = []
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    this.parallel = gl.getExtension('KHR_parallel_shader_compile')
    this.shaders = []
    this.program = gl.createProgram()
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]]) {
      const shader = gl.createShader(type)
      this.shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      gl.attachShader(this.program, shader)
    }
    gl.linkProgram(this.program)
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  }

  async initialize() {
    if (this.initialized) return true
    const gl = this.gl
    if (this.parallel) {
      const completed = await new Promise(resolve => {
        let timer
        const started = performance.now()
        this.cancelCompilation = () => { clearTimeout(timer); resolve(false) }
        const poll = () => {
          if (this.disposed || gl.isContextLost() || performance.now() - started > 4000) { resolve(false); return }
          if (gl.getProgramParameter(this.program, this.parallel.COMPLETION_STATUS_KHR)) resolve(true)
          else timer = setTimeout(poll, 16)
        }
        poll()
      })
      this.cancelCompilation = null
      if (!completed) return false
    }
    if (this.disposed || gl.isContextLost()) return false
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const reason = [gl.getProgramInfoLog(this.program), ...this.shaders.map(shader => gl.getShaderInfoLog(shader))].filter(Boolean).join('\n')
      this.dispose()
      throw new Error(`Caustics shader unavailable: ${reason}`)
    }
    gl.useProgram(this.program)
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    this.uniforms = Object.fromEntries(['uTexture', 'uTime', 'uDuration', 'uMaxDelay', 'uFontSize', 'uPixelRatio', 'uStrength', 'uIntensity', 'uResolution', 'uColor', 'uAccent', 'uSecondary'].map(name => [name, gl.getUniformLocation(this.program, name)]))
    gl.uniform1i(this.uniforms.uTexture, 0)
    gl.uniform1f(this.uniforms.uDuration, CAUSTICS_SETTINGS.duration)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    this.initialized = true
    return true
  }

  setTargets(targets) {
    this.clearTargets()
    const gl = this.gl
    this.targets = targets
    for (const target of targets) {
      const texture = gl.createTexture()
      target.texture = texture
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, target.width, target.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, target.data)
      delete target.data
      delete target.job
    }
    // Bound the single overlay's drawing buffer, even on high-DPR displays.
    this.ratio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(1_500_000 / (innerWidth * innerHeight)))
    this.canvas.width = Math.round(innerWidth * this.ratio)
    this.canvas.height = Math.round(innerHeight * this.ratio)
  }

  readPalette(root) {
    const style = getComputedStyle(root)
    this.accent = readColor(style.getPropertyValue('--accent'))
    this.secondary = readColor(root.style.getPropertyValue('--energy-secondary') || style.getPropertyValue('--energy-secondary'))
    this.targets.forEach(target => { target.color = readColor(getComputedStyle(target.element).color) })
  }

  render(time, intensity) {
    const gl = this.gl
    const u = this.uniforms
    gl.disable(gl.SCISSOR_TEST)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.SCISSOR_TEST)
    gl.uniform1f(u.uIntensity, intensity)
    gl.uniform3fv(u.uAccent, this.accent.slice(0, 3))
    gl.uniform3fv(u.uSecondary, this.secondary.slice(0, 3))
    for (const target of this.targets) {
      if (time < target.delay) continue
      const x = Math.round(target.left * this.ratio)
      const y = Math.round(this.canvas.height - (target.top + target.height / target.ratio) * this.ratio)
      const width = Math.round(target.width / target.ratio * this.ratio)
      const height = Math.round(target.height / target.ratio * this.ratio)
      gl.viewport(x, y, width, height)
      gl.scissor(x, y, width, height)
      gl.bindTexture(gl.TEXTURE_2D, target.texture)
      gl.uniform1f(u.uTime, time - target.delay)
      gl.uniform1f(u.uMaxDelay, target.maxDelay)
      gl.uniform1f(u.uFontSize, target.fontSize)
      gl.uniform1f(u.uPixelRatio, target.ratio)
      gl.uniform1f(u.uStrength, innerWidth <= 700 ? target.strength * 0.8 : target.strength)
      gl.uniform2f(u.uResolution, target.width, target.height)
      gl.uniform4fv(u.uColor, target.color)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }

  clearTargets() {
    this.targets.forEach(target => {
      target.element.classList.remove('caustics-playing')
      target.element.style.removeProperty('--caustics-dom-opacity')
      if (target.texture) this.gl.deleteTexture(target.texture)
    })
    this.targets = []
    this.canvas.width = this.canvas.height = 1
  }

  dispose() {
    this.disposed = true
    this.cancelCompilation?.()
    this.clearTargets()
    this.shaders.forEach(shader => this.gl.deleteShader(shader))
    if (this.vao) this.gl.deleteVertexArray(this.vao)
    this.gl.deleteProgram(this.program)
    // React StrictMode reuses the DOM canvas during its cleanup probe. Losing
    // that context here would poison the next setup on the same canvas.
    queueMicrotask(() => {
      if (!this.canvas.isConnected) this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    })
  }
}
