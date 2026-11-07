import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../hooks/useAccentTheme'
import Icon from './Icon'

export default function ThemeSwitcher({ theme, onChange, onOpen }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  function shuffleTheme() {
    const alternatives = THEMES.filter(({ id }) => id !== theme.id)
    onChange(alternatives[Math.floor(Math.random() * alternatives.length)])
  }

  return (
    <div className="theme-switcher" ref={containerRef}>
      <button className="theme-trigger" ref={triggerRef} type="button" aria-label={`Choose accent color. Current: ${theme.name}`} aria-expanded={isOpen} aria-controls="theme-panel" onClick={() => {
        if (!isOpen) onOpen?.()
        setIsOpen(!isOpen)
      }}><span /></button>
      {isOpen && (
        <div className="theme-panel" id="theme-panel">
          <div className="theme-panel__heading"><span id="theme-label">Theme</span><button className="shuffle-button" type="button" aria-label="Choose a random accent color" onClick={shuffleTheme}><Icon name="shuffle" /></button></div>
          <div className="theme-swatches" role="group" aria-labelledby="theme-label">
            {THEMES.map((option) => <button key={option.id} type="button" className="theme-swatch" style={{ '--swatch': option.color }} aria-label={option.name} aria-pressed={theme.id === option.id} title={option.name} onClick={() => onChange(option)} />)}
          </div>
          <span className="sr-only" role="status">{theme.name} selected</span>
        </div>
      )}
    </div>
  )
}
