import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

// Museum of Motion's masked lines and drawn rules, adapted to the existing
// typography. No character splitting touches HybridText's custom SVG glyphs.
export default function useAboutMotion(rootRef, enabled) {
  useGSAP(() => {
    if (!enabled) return
    const root = rootRef.current
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', context => {
      // Late scroll callbacks belong to this media context too, so a live
      // preference change immediately restores ordinary, readable DOM content.
      const safe = fn => context.add(null, fn)
      let alive = true
      const splits = new Set()
      const compact = window.matchMedia('(max-width: 700px)').matches
      const statement = root.querySelector('.about__statement')
      gsap.from(root.querySelector('.about__rule'), {
        scaleX: 0, transformOrigin: 'left', duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: root, start: 'top 88%', once: true },
        clearProps: 'transform,transformOrigin',
      })
      gsap.from(root.querySelector('h2'), {
        yPercent: 105, duration: compact ? 0.65 : 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: root, start: 'top 80%', once: true },
        clearProps: 'transform',
      })
      ScrollTrigger.create({
        trigger: statement, start: 'top 90%', once: true,
        onEnter: safe(() => {
          try {
            const split = SplitText.create(statement, {
              type: 'lines', mask: 'lines', aria: 'auto', autoSplit: true,
              onSplit: self => gsap.from(self.lines, {
                yPercent: 110, duration: compact ? 0.6 : 0.85,
                stagger: 0.065, ease: 'power3.out',
                onComplete: () => { self.revert(); splits.delete(self) },
              }),
            })
            splits.add(split)
          } catch {
            splits.forEach(split => split.revert())
            splits.clear()
          }
        }),
      })
      ScrollTrigger.batch(root.querySelectorAll('.about__reveal'), {
        start: 'top 92%', once: true,
        onEnter: safe(elements => gsap.from(elements, {
          y: compact ? 10 : 18, opacity: 0, duration: 0.55,
          stagger: 0.07, ease: 'power2.out', clearProps: 'transform,opacity',
        })),
      })
      // The preloader has released scroll; refresh after any late font settling.
      document.fonts?.ready.then(safe(() => { if (alive) ScrollTrigger.refresh() }))
      ScrollTrigger.refresh()
      return () => {
        alive = false
        splits.forEach(split => split.revert())
        splits.clear()
      }
    })
    return () => media.revert()
  }, { scope: rootRef, dependencies: [enabled], revertOnUpdate: true })
}
