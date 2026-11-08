import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { POINTER_EFFECTS_QUERY } from '../animations/pointerPreferences'

gsap.registerPlugin(useGSAP)

export function useMagneticCTA(wrapperRef) {
  useGSAP(() => {
    const wrapper = wrapperRef.current
    const button = wrapper.querySelector('.cta')
    const arrow = wrapper.querySelector('.cta__arrow')
    const media = gsap.matchMedia()
    media.add(POINTER_EFFECTS_QUERY, () => {
      const x = gsap.quickTo(button, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.75)' })
      const y = gsap.quickTo(button, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.75)' })
      const arrowX = gsap.quickTo(arrow, 'x', { duration: 0.3, ease: 'power3.out' })
      const arrowY = gsap.quickTo(arrow, 'y', { duration: 0.3, ease: 'power3.out' })
      const setters = [button, arrow].map(element => ({ x: gsap.quickSetter(element, 'x', 'px'), y: gsap.quickSetter(element, 'y', 'px') }))
      const animations = [x, y, arrowX, arrowY]
      let bounds
      let frame = 0
      let engaged = false
      const pointer = { x: 0, y: 0 }
      const reset = (immediate = false) => {
        cancelAnimationFrame(frame)
        frame = 0
        bounds = null
        if (immediate) {
          animations.forEach(animate => animate.tween.pause())
          setters.forEach(setter => { setter.x(0); setter.y(0) })
        } else if (engaged) {
          animations.forEach(animate => animate(0))
        }
        engaged = false
      }
      const update = () => {
        frame = 0
        // Keep the original Caustics texture aligned throughout its entrance.
        const caustics = wrapper.closest('.portfolio-shell')?.dataset.caustics
        if (caustics === 'playing' || caustics === 'preparing' || button.matches(':focus-visible')) {
          reset(true)
          return
        }
        bounds ??= wrapper.getBoundingClientRect()
        if (!bounds.width || !bounds.height) return
        const dx = (pointer.x - bounds.left - bounds.width / 2) / (bounds.width / 2) * 8
        const dy = (pointer.y - bounds.top - bounds.height / 2) / (bounds.height / 2) * 8
        const distance = Math.hypot(dx, dy)
        const scale = distance > 8 ? 8 / distance : 1
        x(dx * scale)
        y(dy * scale)
        if (!engaged) { arrowX(1.5); arrowY(-1.5) }
        engaged = true
      }
      const onMove = event => {
        if (event.pointerType !== 'mouse') { reset(true); return }
        if (event.buttons) return
        pointer.x = event.clientX
        pointer.y = event.clientY
        if (!frame) frame = requestAnimationFrame(update)
      }
      const onLeave = () => reset()
      const onDown = () => {
        // Freeze the hit target until pointerup/click; never move it on press.
        cancelAnimationFrame(frame)
        frame = 0
        animations.forEach(animate => animate.tween.pause())
      }
      const onFocus = () => { if (button.matches(':focus-visible')) reset(true) }
      const onLayout = () => reset(true)
      const onVisibility = () => { if (document.hidden) reset(true) }
      const observer = new ResizeObserver(onLayout)
      observer.observe(wrapper)
      wrapper.addEventListener('pointerenter', onMove, { passive: true })
      wrapper.addEventListener('pointermove', onMove, { passive: true })
      wrapper.addEventListener('pointerleave', onLeave, { passive: true })
      wrapper.addEventListener('pointercancel', onLayout, { passive: true })
      wrapper.addEventListener('pointerdown', onDown, { passive: true })
      button.addEventListener('focus', onFocus)
      window.addEventListener('blur', onLayout)
      window.addEventListener('resize', onLayout, { passive: true })
      window.addEventListener('scroll', onLayout, { passive: true })
      document.addEventListener('visibilitychange', onVisibility)
      return () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        wrapper.removeEventListener('pointerenter', onMove)
        wrapper.removeEventListener('pointermove', onMove)
        wrapper.removeEventListener('pointerleave', onLeave)
        wrapper.removeEventListener('pointercancel', onLayout)
        wrapper.removeEventListener('pointerdown', onDown)
        button.removeEventListener('focus', onFocus)
        window.removeEventListener('blur', onLayout)
        window.removeEventListener('resize', onLayout)
        window.removeEventListener('scroll', onLayout)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    })
    return () => media.revert()
  }, { scope: wrapperRef })
}
