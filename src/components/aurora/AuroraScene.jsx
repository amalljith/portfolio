import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Color, Vector2 } from 'three'
import { auroraFragmentShader, auroraVertexShader } from './auroraShaders'

const GL_OPTIONS = { antialias: false, alpha: true, depth: false, stencil: false, powerPreference: 'low-power' }
const ENTRANCE_SECONDS = 2.25

function AuroraPlane({ accentColor, active, compact, reducedMotion, pointer, onReady, onFailure }) {
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const setDpr = useThree((state) => state.setDpr)
  const get = useThree((state) => state.get)
  const targetColor = useMemo(() => new Color(accentColor), [accentColor])
  const targetMouse = useMemo(() => new Vector2(0.75, 0.45), [])
  const ready = useRef(false)
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const lastFrameTime = useRef(null)
  const entranceElapsed = useRef(reducedMotion ? ENTRANCE_SECONDS : 0)
  const quality = useRef({ elapsed: 0, average: 1 / 60, lastChange: 0 })
  const [initialUniforms] = useState(() => ({
    uTime: { value: 0 },
    uProgress: { value: reducedMotion ? 1 : 0 },
    uResolution: { value: new Vector2(1, 1) },
    uAccent: { value: new Color(accentColor) },
    uMouse: { value: new Vector2(0.75, 0.45) },
    uInteraction: { value: 0 },
    uCompact: { value: compact ? 1 : 0 },
  }))

  useEffect(() => {
    const gl = get().gl
    const uniforms = materialRef.current.uniforms
    uniforms.uCompact.value = compact ? 1 : 0
    gl.getDrawingBufferSize(uniforms.uResolution.value)
    // Enforce a pixel budget as well as the DPR cap on large monitors.
    const ceiling = compact ? 0.85 : 1.25
    const budgetDpr = Math.sqrt(1_800_000 / Math.max(size.width * size.height, 1))
    setDpr(Math.min(window.devicePixelRatio, ceiling, budgetDpr))
    invalidate()
  }, [compact, get, invalidate, setDpr, size.width, size.height])

  useEffect(() => {
    const uniforms = materialRef.current.uniforms
    if (reducedMotion) {
      uniforms.uAccent.value.copy(targetColor)
      uniforms.uInteraction.value = 0
      uniforms.uProgress.value = 1
      entranceElapsed.current = ENTRANCE_SECONDS
    }
    invalidate()
  }, [invalidate, reducedMotion, targetColor])

  useEffect(() => {
    // Paused wall time never advances the entrance or jumps the material flow.
    lastFrameTime.current = null
    invalidate()
  }, [active, invalidate, reducedMotion])

  useEffect(() => {
    const gl = get().gl
    const canvas = gl.domElement
    const onContextLost = (event) => {
      event.preventDefault()
      onFailure()
    }
    const previousErrorHandler = gl.debug.onShaderError
    gl.debug.onShaderError = onFailure
    canvas.addEventListener('webglcontextlost', onContextLost)
    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      gl.debug.onShaderError = previousErrorHandler
    }
  }, [get, onFailure])

  useEffect(() => {
    const { geometry, material } = meshRef.current
    // Release our two resources before the renderer drops its program cache.
    // This also avoids deferred material disposal after a context-loss fallback.
    return () => {
      material.dispose()
      geometry.dispose()
    }
  }, [])

  useFrame((_, delta) => {
    const uniforms = materialRef.current.uniforms
    const now = performance.now()
    const elapsed = lastFrameTime.current === null ? 0 : Math.max(0, (now - lastFrameTime.current) / 1000)
    lastFrameTime.current = now
    const dt = Math.min(delta, 0.05)
    if (active && !reducedMotion) {
      uniforms.uTime.value += Math.min(elapsed, 0.1)
      entranceElapsed.current = Math.min(ENTRANCE_SECONDS, entranceElapsed.current + elapsed)
      uniforms.uProgress.value = entranceElapsed.current / ENTRANCE_SECONDS
      uniforms.uAccent.value.lerp(targetColor, 1 - Math.exp(-dt * 3.0))

      const isInteracting = performance.now() < pointer.current.activeUntil
      targetMouse.set(isInteracting ? pointer.current.x : 0.75, isInteracting ? pointer.current.y : 0.45)
      uniforms.uMouse.value.lerp(targetMouse, 1 - Math.exp(-dt * 3.0))
      const intensity = isInteracting ? (compact ? 0.15 : 0.65) : 0
      uniforms.uInteraction.value += (intensity - uniforms.uInteraction.value) * (1 - Math.exp(-dt * 2.4))

      // Lower quality only after sustained slow frames, outside shader compilation.
      const sample = quality.current
      sample.elapsed += Math.min(delta, 0.5)
      sample.average += (Math.min(delta, 0.1) - sample.average) * 0.025
      if (sample.elapsed > 3 && sample.elapsed - sample.lastChange > 3 && sample.average > 1 / 36) {
        const currentDpr = get().viewport.dpr
        const minimum = compact ? 0.6 : 0.65
        if (currentDpr > minimum + 0.01) setDpr(Math.max(minimum, currentDpr * 0.8))
        sample.lastChange = sample.elapsed
      }
    }
    get().gl.getDrawingBufferSize(uniforms.uResolution.value)
    if (!ready.current) {
      ready.current = true
      // One notification, never a React state update on every animation frame.
      queueMicrotask(onReady)
    }
  })

  return (
    <mesh ref={meshRef} frustumCulled={false} dispose={null}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={initialUniforms}
        vertexShader={auroraVertexShader}
        fragmentShader={auroraFragmentShader}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function AuroraScene(props) {
  const dpr = useMemo(() => props.compact ? [0.6, 0.85] : [0.65, 1.25], [props.compact])

  return (
    <Canvas
      className="aurora-canvas"
      aria-hidden="true"
      tabIndex={-1}
      frameloop={props.active && !props.reducedMotion ? 'always' : 'demand'}
      dpr={dpr}
      gl={GL_OPTIONS}
      flat
      fallback={null}
    >
      <AuroraPlane {...props} />
    </Canvas>
  )
}
