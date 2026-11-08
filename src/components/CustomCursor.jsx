import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { POINTER_EFFECTS_QUERY } from '../animations/pointerPreferences'

gsap.registerPlugin(useGSAP)

const NATIVE_TARGETS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), iframe, video[controls], audio[controls], [data-native-cursor]'
const INTERACTIVE_TARGETS = 'a[href], button:not(:disabled), summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'

export default function CustomCursor({ accentColor = 'var(--accent)' }) {
  const cursorRef = useRef(null)

  useGSAP(() => {
    const cursor = cursorRef.current
    const media = gsap.matchMedia()
    media.add(POINTER_EFFECTS_QUERY, () => {
      const dot = cursor.querySelector('.custom-cursor__dot')
      const follower = cursor.querySelector('.custom-cursor__follower')
      const ring = cursor.querySelector('.custom-cursor__ring')
      gsap.set([dot, follower], { xPercent: -50, yPercent: -50 })
      const dotX = gsap.quickSetter(dot, 'x', 'px')
      const dotY = gsap.quickSetter(dot, 'y', 'px')
      const followX = gsap.quickTo(follower, 'x', { duration: 0.28, ease: 'power3.out' })
      const followY = gsap.quickTo(follower, 'y', { duration: 0.28, ease: 'power3.out' })
      // quickTo resets individual transform properties; avoid the scale alias.
      const scales = ['scaleX', 'scaleY'].map(property => gsap.quickTo(ring, property, { duration: 0.28, ease: 'power3.out' }))
      const scale = (value, start) => scales.forEach(animate => animate(value, start))
      let positioned = false
      let hovering = false
      let pressed = false
      let keyboardMode = false

      const hide = () => {
        cursor.dataset.visible = 'false'
        document.documentElement.classList.remove('has-custom-cursor')
        positioned = false
        hovering = false
        cursor.dataset.hover = 'false'
        for (const animate of [followX, followY, ...scales]) animate.tween.pause()
      }
      const update = event => {
        if (event.type === 'pointermove' && event.pointerType === 'mouse') keyboardMode = false
        const target = event.target instanceof Element ? event.target : null
        const overScrollbar = event.clientX >= document.documentElement.clientWidth || event.clientY >= document.documentElement.clientHeight
        if (keyboardMode || overScrollbar || event.pointerType !== 'mouse' || pressed || event.buttons || target?.closest(NATIVE_TARGETS) || !window.getSelection()?.isCollapsed) {
          hide()
          return
        }
        dotX(event.clientX)
        dotY(event.clientY)
        const interactive = Boolean(target?.closest(INTERACTIVE_TARGETS))
        if (!positioned) {
          // First entry teleports both parts, preventing a streak from (0, 0).
          followX(event.clientX, event.clientX)
          followY(event.clientY, event.clientY)
          scale(interactive ? 1.3 : 1, interactive ? 1.3 : 1)
          cursor.dataset.visible = 'true'
          document.documentElement.classList.add('has-custom-cursor')
          positioned = true
        } else {
          followX(event.clientX)
          followY(event.clientY)
          if (interactive !== hovering) scale(interactive ? 1.3 : 1)
        }
        hovering = interactive
        cursor.dataset.hover = String(interactive)
      }
      const onDown = () => { pressed = true; hide() }
      const onUp = () => { pressed = false }
      const onOut = event => { if (!event.relatedTarget) hide() }
      const onBlur = () => { pressed = false; hide() }
      const onKey = event => {
        if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
          keyboardMode = true
          hide()
        }
      }
      const onFocus = event => {
        if (event.target instanceof Element && (event.target.matches(':focus-visible') || event.target.closest(NATIVE_TARGETS))) hide()
      }
      const onVisibility = () => { if (document.hidden) onBlur() }
      const onSelection = () => { if (!window.getSelection()?.isCollapsed) hide() }

      window.addEventListener('pointermove', update, { passive: true })
      window.addEventListener('pointerover', update, { passive: true })
      window.addEventListener('pointerout', onOut, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      window.addEventListener('pointercancel', onBlur, { passive: true })
      window.addEventListener('blur', onBlur)
      window.addEventListener('keydown', onKey)
      document.addEventListener('focusin', onFocus)
      document.addEventListener('visibilitychange', onVisibility)
      document.addEventListener('selectionchange', onSelection)
      return () => {
        hide()
        window.removeEventListener('pointermove', update)
        window.removeEventListener('pointerover', update)
        window.removeEventListener('pointerout', onOut)
        window.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onBlur)
        window.removeEventListener('blur', onBlur)
        window.removeEventListener('keydown', onKey)
        document.removeEventListener('focusin', onFocus)
        document.removeEventListener('visibilitychange', onVisibility)
        document.removeEventListener('selectionchange', onSelection)
        delete cursor.dataset.visible
        delete cursor.dataset.hover
      }
    })
    return () => media.revert()
  }, { scope: cursorRef })

  return (
    <div className="custom-cursor" ref={cursorRef} style={{ '--cursor-accent': accentColor }} aria-hidden="true">
      <span className="custom-cursor__dot" />
      <span className="custom-cursor__follower"><span className="custom-cursor__ring" /></span>
    </div>
  )
}
