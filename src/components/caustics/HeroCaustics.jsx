import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CausticsRenderer } from './CausticsRenderer'
import { buildMask, collectTargets } from './textMasks'
import { CAUSTICS_SETTINGS, clampIntensity } from './causticsConfig'

gsap.registerPlugin(useGSAP)

export default function HeroCaustics({ intensity = CAUSTICS_SETTINGS.intensity, enabled = true, scopeRef }) {
  const canvasRef = useRef(null)
  const intensityRef = useRef(clampIntensity(intensity))
  const { contextSafe } = useGSAP({ scope: canvasRef })

  useEffect(() => {
    intensityRef.current = clampIntensity(intensity)
  }, [intensity])

  useEffect(() => {
    const canvas = canvasRef.current
    const root = canvas.closest('.portfolio-shell')
    const scope = scopeRef?.current ?? root
    if (!enabled) {
      root.dataset.caustics = 'waiting'
      return () => { delete root.dataset.caustics }
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches || intensityRef.current === 0) {
      root.dataset.caustics = reduced.matches ? 'reduced' : 'disabled'
      return () => { delete root.dataset.caustics }
    }

    let renderer
    let worker
    let timeline
    let generation = 0
    let deadline
    let alive = true
    let inView = true
    let paletteDirty = true
    let navOpen = false
    let nextJob = 0
    let activeTargets = []
    const pending = new Map()
    const clock = { time: 0 }
    const handover = { opacity: 1 }
    const stopWorker = () => {
      worker?.terminate()
      worker = null
      pending.forEach(resolve => resolve(null))
      pending.clear()
    }
    const finish = (state = 'settled') => {
      generation++
      clearTimeout(deadline)
      timeline?.kill()
      timeline = null
      stopWorker()
      activeTargets.forEach(({ element }) => {
        element.classList.remove('caustics-playing')
        element.style.removeProperty('--caustics-dom-opacity')
      })
      activeTargets = []
      renderer?.clearTargets()
      canvas.style.opacity = '0'
      root.style.removeProperty('--caustics-dom-opacity')
      root.dataset.caustics = state
    }
    const frame = () => {
      if (!renderer || !alive) return
      if (intensityRef.current === 0) { finish('disabled'); return }
      if (paletteDirty) {
        renderer.readPalette(root)
        paletteDirty = false
      }
      renderer.render(clock.time, intensityRef.current)
    }
    const play = contextSafe(targets => {
      clearTimeout(deadline)
      renderer.setTargets(targets)
      paletteDirty = true
      clock.time = 0
      handover.opacity = 1
      root.dataset.caustics = 'playing'
      root.dataset.causticsTargets = String(targets.length)
      root.style.setProperty('--caustics-dom-opacity', '0')
      targets.forEach(({ element, readability }) => {
        element.style.setProperty('--caustics-dom-opacity', String(readability))
        element.classList.add('caustics-playing')
      })
      canvas.style.opacity = '1'
      const total = Math.max(...targets.map(target => target.delay + target.maxDelay + CAUSTICS_SETTINGS.duration)) + 0.05
      timeline = gsap.timeline({ onComplete: () => finish() })
        .to(clock, { time: total, duration: total, ease: 'none', onUpdate: frame })
        // Like GLText, hand the calm final frame back to selectable DOM text.
        .call(() => {
          root.style.setProperty('--caustics-dom-opacity', '1')
          targets.forEach(({ element }) => element.style.removeProperty('--caustics-dom-opacity'))
        })
        .to(handover, { opacity: 0, duration: 0.4, ease: 'power1.inOut', onUpdate: () => { canvas.style.opacity = String(handover.opacity) } })
      frame()
      if (document.hidden || !inView) timeline?.pause()
    })

    let signalBackground
    const background = root.querySelector('.aurora')
    const backgroundReady = new Promise(resolve => { signalBackground = resolve })
    const backgroundObserver = new MutationObserver(() => {
      if (background.dataset.ready === 'true' || background.dataset.fallback === 'true') signalBackground()
    })
    if (!background || background.dataset.ready === 'true' || background.dataset.fallback === 'true') signalBackground()
    else backgroundObserver.observe(background, { attributes: true, attributeFilter: ['data-ready', 'data-fallback'] })
    const backgroundTimeout = setTimeout(signalBackground, 600)

    const run = async selector => {
      if (!alive || reduced.matches || intensityRef.current === 0 || document.hidden || !inView) return
      finish('preparing')
      const current = generation
      activeTargets = collectTargets(scope, selector)
      if (!activeTargets.length) { finish(); return }
      // DOM text remains readable throughout preparation. Slow setup never
      // creates a loading screen or leaves transparent content behind.
      deadline = setTimeout(() => finish('fallback'), 1800)
      try {
        await document.fonts.ready
        await backgroundReady
        if (!alive || current !== generation) return
        clearTimeout(deadline)
        renderer ??= new CausticsRenderer(canvas)
        const initialized = await renderer.initialize()
        if (!alive || current !== generation) return
        if (!initialized) { finish('fallback'); return }
        // A busy main thread can delay a completed worker's message; keep the
        // DOM visible rather than mistaking shader warmup for worker failure.
        deadline = setTimeout(() => finish('fallback'), 5000)
        worker = new Worker(new URL('./causticsTexture.worker.js', import.meta.url), { type: 'module' })
        worker.onmessage = ({ data: { id, data } }) => {
          pending.get(id)?.(data)
          pending.delete(id)
        }
        worker.onerror = error => {
          if (import.meta.env.DEV) console.warn('Caustics worker failed', error.message)
          finish('fallback')
        }
        const targets = await Promise.all(activeTargets.map(target => {
          const mask = buildMask(target, renderer.maxTextureSize)
          const id = ++nextJob
          return new Promise(resolve => {
            pending.set(id, data => resolve({ ...mask, data }))
            worker.postMessage({ id, job: mask.job }, [mask.job.pixels.buffer])
          })
        }))
        if (!alive || current !== generation || targets.some(target => !target.data)) return
        stopWorker()
        play(targets)
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Caustics preparation failed:', error)
        if (alive && current === generation) finish('fallback')
      }
    }

    const syncVisibility = () => {
      if (document.hidden || !inView) timeline?.pause()
      else timeline?.resume()
    }
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      syncVisibility()
    })
    intersection.observe(scope)
    const onPreference = () => { if (reduced.matches) finish('reduced') }
    const onLayoutChange = () => {
      if (activeTargets.length) finish()
    }
    const onContextLost = event => {
      event.preventDefault()
      finish('fallback')
    }
    const onSelection = () => {
      // Selection remains the native, readable DOM text even during entrance.
      const selection = window.getSelection()
      if (!selection?.isCollapsed && root.contains(selection?.anchorNode)) finish()
    }
    const paletteChanged = () => { paletteDirty = true }
    const changes = new MutationObserver(records => {
      if (records.some(record => record.target === root)) paletteDirty = true
      const open = root.querySelector('.navigation')?.classList.contains('navigation--open')
      if (open && !navOpen && innerWidth <= 700) void run('.nav-link')
      if (!open && navOpen && activeTargets.some(target => target.element.matches('.nav-link'))) finish()
      navOpen = open
    })
    changes.observe(root, { attributes: true, attributeFilter: ['style'] })
    const navigation = root.querySelector('.navigation')
    if (navigation) changes.observe(navigation, { attributes: true, attributeFilter: ['class'] })
    reduced.addEventListener('change', onPreference)
    document.addEventListener('visibilitychange', syncVisibility)
    document.addEventListener('selectionchange', onSelection)
    window.addEventListener('resize', onLayoutChange, { passive: true })
    window.addEventListener('scroll', onLayoutChange, { passive: true })
    canvas.addEventListener('webglcontextlost', onContextLost)
    root.addEventListener('pointerover', paletteChanged, { passive: true })
    root.addEventListener('pointerout', paletteChanged, { passive: true })
    root.addEventListener('focusin', paletteChanged)
    void run()

    return () => {
      alive = false
      finish()
      clearTimeout(backgroundTimeout)
      backgroundObserver.disconnect()
      signalBackground()
      intersection.disconnect()
      changes.disconnect()
      reduced.removeEventListener('change', onPreference)
      document.removeEventListener('visibilitychange', syncVisibility)
      document.removeEventListener('selectionchange', onSelection)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      root.removeEventListener('pointerover', paletteChanged)
      root.removeEventListener('pointerout', paletteChanged)
      root.removeEventListener('focusin', paletteChanged)
      renderer?.dispose()
      delete root.dataset.caustics
      delete root.dataset.causticsTargets
    }
  }, [contextSafe, enabled, scopeRef])

  return <canvas ref={canvasRef} className="caustics-canvas" aria-hidden="true" tabIndex={-1} />
}
