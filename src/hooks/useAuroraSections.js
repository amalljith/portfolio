import { useEffect, useRef } from 'react'
import { AURORA_PROFILES, PROFILE_KEYS } from '../components/aurora/sectionProfiles'

export default function useAuroraSections(rootRef) {
  const controls = useRef({ ...AURORA_PROFILES.hero, scroll: 0 })

  useEffect(() => {
    const root = rootRef.current
    const shell = root.closest('.portfolio-shell')
    let sections = []
    let viewport = window.innerHeight
    let frame = 0
    const update = () => {
      const scroll = Math.max(0, window.scrollY)
      let previous = AURORA_PROFILES.hero
      let next = previous
      let blend = 0
      let name = 'hero'
      for (const section of sections) {
        const start = Math.max(0, section.top - viewport * 0.6)
        if (scroll < start) break
        next = section.profile
        // Settle before the section reaches the reading area, including anchors
        // with scroll-margin. Scrolling in either direction follows one curve.
        const end = Math.max(start + 1, section.top - viewport * 0.15)
        blend = Math.min(1, (scroll - start) / (end - start))
        name = section.name
        if (blend < 1) break
        previous = next
      }
      for (const key of PROFILE_KEYS) controls.current[key] = previous[key] + (next[key] - previous[key]) * blend
      controls.current.scroll = Math.min(20, scroll / Math.max(viewport, 1))
      // Useful for the static fallback too; no React render on scroll.
      root.style.setProperty('--aurora-fallback-strength', String(controls.current.opacity * controls.current.intensity))
      if (root.dataset.section !== name) root.dataset.section = name
    }
    const measure = () => {
      frame = 0
      viewport = window.innerHeight
      sections = [...shell.querySelectorAll('[data-aurora-section]')]
        .map(element => ({
          name: element.dataset.auroraSection,
          top: element.getBoundingClientRect().top + window.scrollY,
          profile: AURORA_PROFILES[element.dataset.auroraSection] ?? AURORA_PROFILES.hero,
        }))
        .sort((a, b) => a.top - b.top)
      update()
    }
    const scheduleMeasure = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    const resize = new ResizeObserver(scheduleMeasure)
    resize.observe(shell)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', scheduleMeasure, { passive: true })
    document.fonts?.addEventListener('loadingdone', scheduleMeasure)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', scheduleMeasure)
      document.fonts?.removeEventListener('loadingdone', scheduleMeasure)
    }
  }, [rootRef])

  return controls
}
