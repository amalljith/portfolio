import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Color, Vector2 } from 'three'
import { auroraFragmentShader, auroraVertexShader } from './auroraShaders'

const GL_OPTIONS = { antialias: false, alpha: true, depth: false, stencil: false, powerPreference: 'low-power' }
const ENTRANCE_SECONDS = 2.8

function AuroraPlane({ primaryColor, secondaryColor, active, compact, reducedMotion, pointer, onReady, onFailure }) {
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const invalidate = useThree((state) => state.invalidate)
  const setDpr = useThree((state) => state.setDpr)
  const get = useThree((state) => state.get)
  const targetPrimary = useMemo(() => new Color(primaryColor), [primaryColor])
  const targetSecondary = useMemo(() => new Color(secondaryColor), [secondaryColor])
  const targetMouse = useMemo(() => new Vector2(0.75, 0.45), [])
  const ready = useRef(false)
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const lastFrameTime = useRef(null)
  const entranceElapsed = useRef(reducedMotion ? ENTRANCE_SECONDS : 0)
  const quality = useRef({ elapsed: 0, average: 1 / 60, lastChange: 0, scale: 1, ceiling: 1 })
  const [initialUniforms] = useState(() => ({
    uTime: { value: 0 },
    uProgress: { value: reducedMotion ? 1 : 0 },
    uResolution: { value: new Vector2(1, 1) },
    uEnergyPrimary: { value: new Color(primaryColor) },
    uEnergySecondary: { value: new Color(secondaryColor) },
    uMouse: { value: new Vector2(0.75, 0.45) },
    uInteraction: { value: 0 },
    uCompact: { value: compact ? 1 : 0 },
  }))

  useEffect(() => {
    const uniforms = materialRef.current.uniforms
    uniforms.uCompact.value = compact ? 1 : 0
    // Enforce a pixel budget as well as the DPR cap on large monitors.
    const ceiling = compact ? 0.85 : 1.25
    const budgetDpr = Math.sqrt((compact ? 750_000 : 1_800_000) / Math.max(size.width * size.height, 1))
    const cap = Math.min(window.devicePixelRatio || 1, ceiling, budgetDpr)
    quality.current.ceiling = cap
    // Keep the learned quality across resizes without exceeding the pixel budget.
    setDpr(Math.max(Math.min(cap, compact ? 0.55 : 0.65), cap * quality.current.scale))
    invalidate()
  }, [compact, invalidate, setDpr, size.width, size.height])

  useEffect(() => {
    get().gl.getDrawingBufferSize(materialRef.current.uniforms.uResolution.value)
    invalidate()
  }, [dpr, get, invalidate, size.width, size.height])

  useEffect(() => {
    const uniforms = materialRef.current.uniforms
    if (reducedMotion) {
      uniforms.uEnergyPrimary.value.copy(targetPrimary)
      uniforms.uEnergySecondary.value.copy(targetSecondary)
      uniforms.uInteraction.value = 0
      uniforms.uMouse.value.set(0.75, 0.45)
      uniforms.uProgress.value = 1
      entranceElapsed.current = ENTRANCE_SECONDS
    }
    invalidate()
  }, [invalidate, reducedMotion, targetPrimary, targetSecondary])

  useEffect(() => {
    // Paused wall time never advances the entrance or jumps the material flow.
    lastFrameTime.current = null
    quality.current.elapsed = 0
    quality.current.average = 1 / 60
    quality.current.lastChange = 0
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

  useFrame(() => {
    const uniforms = materialRef.current.uniforms
    const now = performance.now()
    const elapsed = lastFrameTime.current === null ? 0 : Math.max(0, (now - lastFrameTime.current) / 1000)
    lastFrameTime.current = now
    // All motion shares one bounded clock, including the entrance and pointer.
    // A stalled frame or a resumed tab cannot skip the reveal or jump the flow.
    const dt = Math.min(elapsed, 0.05)
    if (active && !reducedMotion) {
      uniforms.uTime.value += dt
      entranceElapsed.current = Math.min(ENTRANCE_SECONDS, entranceElapsed.current + dt)
      uniforms.uProgress.value = entranceElapsed.current / ENTRANCE_SECONDS
      // Mutate the existing uniforms; theme changes never reset time or reveal.
      const colorBlend = 1 - Math.exp(-dt * 3.0)
      uniforms.uEnergyPrimary.value.lerp(targetPrimary, colorBlend)
      uniforms.uEnergySecondary.value.lerp(targetSecondary, colorBlend)

      const activity = Math.max(0, Math.min(1, (pointer.current.activeUntil - now) / 800))
      const isInteracting = activity > 0
      targetMouse.set(isInteracting ? pointer.current.x : 0.75, isInteracting ? pointer.current.y : 0.45)
      uniforms.uMouse.value.lerp(targetMouse, 1 - Math.exp(-dt * 3.0))
      const intensity = compact ? 0 : activity * 0.65
      uniforms.uInteraction.value += (intensity - uniforms.uInteraction.value) * (1 - Math.exp(-dt * 2.4))

      // Lower quality only after sustained slow frames, outside shader compilation.
      const sample = quality.current
      sample.elapsed += dt
      if (elapsed > 0) sample.average += (Math.min(elapsed, 0.1) - sample.average) * 0.025
      if (sample.elapsed > 3 && sample.elapsed - sample.lastChange > 3 && sample.average > 1 / 36) {
        const currentDpr = get().viewport.dpr
        const minimum = Math.min(sample.ceiling, compact ? 0.55 : 0.65)
        if (currentDpr > minimum + 0.01) {
          const nextDpr = Math.max(minimum, currentDpr * 0.8)
          sample.scale = nextDpr / sample.ceiling
          setDpr(nextDpr)
        }
        sample.lastChange = sample.elapsed
      }
    }
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
  return (
    <Canvas
      className="aurora-canvas"
      aria-hidden="true"
      tabIndex={-1}
      frameloop={props.active && !props.reducedMotion ? 'always' : 'demand'}
      dpr={0.85}
      gl={GL_OPTIONS}
      flat
      fallback={null}
    >
      <AuroraPlane {...props} />
    </Canvas>
  )
}
