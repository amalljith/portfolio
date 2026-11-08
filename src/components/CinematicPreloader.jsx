import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import HybridText from './HybridText'
import './cinematic-preloader.css'

// The line is decorative, not an estimate of download progress. Readiness is
// based on the actual font set and Aurora's first frame (or its fallback).
export default function CinematicPreloader({ accentColor, heroRef, onReveal, onComplete }) {
  const rootRef = useRef(null)
  const skipRef = useRef(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    const html = document.documentElement
    const body = document.body
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const previous = {
      overflow: html.style.overflow,
      gutter: html.style.scrollbarGutter,
      bodyOverflow: body.style.overflow,
    }
    // Reserve the existing scrollbar space so the Hero never shifts sideways.
    if (window.innerWidth > html.clientWidth) html.style.scrollbarGutter = 'stable'
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    let alive = true
    let complete = false
    let revealing = false
    let logoReady = false
    let fontsReady = !document.fonts
    let backgroundReady = false
    let assetsExpired = false
    const started = performance.now()
    let intro
    let curtain
    let line
    const restoreScroll = () => {
      html.style.overflow = previous.overflow
      html.style.scrollbarGutter = previous.gutter
      body.style.overflow = previous.bodyOverflow
    }
    const finish = () => {
      if (!alive || complete) return
      complete = true
      intro?.kill()
      curtain?.kill()
      line?.kill()
      observer.disconnect()
      clearTimeout(assetTimeout)
      clearTimeout(safetyTimeout)
      restoreScroll()
      // The parent removes inert before moving keyboard focus out of the loader.
      onReveal()
      onComplete(root.contains(document.activeElement))
    }
    const reveal = () => {
      if (!alive || complete || revealing) return
      if (reduced.matches) { finish(); return }
      revealing = true
      root.dataset.phase = 'revealing'
      line?.kill()
      onReveal()
      curtain = gsap.timeline({ onComplete: finish })
        .to(root.querySelector('.preloader__identity'), { y: -16, opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)
        .to(root, { yPercent: -100, duration: 0.66, ease: 'power3.inOut' }, 0.04)
    }
    const maybeReveal = () => {
      if (logoReady && ((fontsReady && backgroundReady) || assetsExpired)) reveal()
    }
    const background = heroRef.current?.querySelector('.aurora')
    const readBackground = () => {
      backgroundReady = !background || background.dataset.ready === 'true' || background.dataset.fallback === 'true'
      if (backgroundReady) observer.disconnect()
      maybeReveal()
    }
    const observer = new MutationObserver(readBackground)
    if (background) observer.observe(background, { attributes: true, attributeFilter: ['data-ready', 'data-fallback'] })
    const assetTimeout = setTimeout(() => {
      assetsExpired = true
      maybeReveal()
    }, 1800)
    // Also bound the curtain itself: a suspended/slow animation ticker cannot
    // leave an inert page behind. No dependency can hold the screen forever.
    const safetyTimeout = setTimeout(finish, 3200)
    const onVisibility = () => {
      if (!document.hidden && performance.now() - started >= 3200) finish()
    }
    const onPreference = () => { if (reduced.matches) finish() }
    const onKey = event => {
      if (event.key === 'Escape') finish()
    }
    skipRef.current = finish
    reduced.addEventListener('change', onPreference)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('keydown', onKey)

    const context = gsap.context(() => {
      const glyphs = gsap.utils.toArray('.preloader__logo .type-glyph')
      // Reconstruct the existing custom glyphs with a few small, deterministic
      // pixel offsets. No character scrambling or additional canvas is needed.
      intro = gsap.timeline({ onComplete: () => { logoReady = true; maybeReveal() } })
        .fromTo('.preloader__logo', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.38, ease: 'steps(7)' }, 0)
        .fromTo(glyphs, { x: i => i === 1 ? -2 : 2 }, { x: 0, duration: 0.32, ease: 'steps(4)' }, 0.09)
        .fromTo(glyphs, { '--pixel-amount': 0.35 }, { '--pixel-amount': 1, duration: 0.26, ease: 'steps(3)' }, 0.12)
        .fromTo('.preloader__scan', { yPercent: -110 }, { yPercent: 110, duration: 0.46, ease: 'power1.inOut' }, 0.08)
        .to('.preloader__scan', { opacity: 0, duration: 0.12 }, 0.5)
      line = gsap.fromTo('.preloader__line-light', { xPercent: -110 }, { xPercent: 330, duration: 1.1, repeat: -1, ease: 'power1.inOut' })
    }, root)

    readBackground()
    document.fonts?.ready.then(() => {
      if (!alive) return
      fontsReady = true
      maybeReveal()
    }, () => {
      if (!alive) return
      fontsReady = true // Browser fallback fonts remain usable.
      maybeReveal()
    })
    if (reduced.matches) finish()

    return () => {
      alive = false
      skipRef.current = null
      clearTimeout(assetTimeout)
      clearTimeout(safetyTimeout)
      observer.disconnect()
      reduced.removeEventListener('change', onPreference)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', onKey)
      intro?.kill()
      curtain?.kill()
      line?.kill()
      context.revert()
      restoreScroll()
    }
  }, [heroRef, onComplete, onReveal])

  return (
    <div ref={rootRef} className="preloader" data-phase="loading" data-native-cursor style={{ '--accent': accentColor }}>
      <div className="preloader__identity" aria-hidden="true">
        <div className="preloader__logo">
          <HybridText text="AJ." pixelIndices={[0, 1, 2]} />
          <span className="preloader__scan" />
        </div>
        <div className="preloader__line"><span className="preloader__line-light" /></div>
        <span className="preloader__caption">DESIGN / LOGIC / MOTION</span>
      </div>
      <p className="sr-only" role="status">Loading Amal Jith’s portfolio.</p>
      <button className="preloader__skip" type="button" onClick={() => skipRef.current?.()}>SKIP INTRO <span aria-hidden="true">↗</span></button>
    </div>
  )
}
