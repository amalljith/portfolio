import { useEffect, useRef, useState } from 'react'
import ThemeSwitcher from './ThemeSwitcher'
import Icon from './Icon'

const NAV_LINKS = ['Work', 'About', 'Skills', 'Contact']

export default function Navbar({ theme, onThemeChange, onUpcoming }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const headerRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) return
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    function onPointerDown(event) {
      if (!headerRef.current?.contains(event.target)) setIsMenuOpen(false)
    }
    function onResize() {
      if (window.innerWidth > 700) setIsMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onResize)
    }
  }, [isMenuOpen])

  return (
    <header className="navbar page-gutter" ref={headerRef}>
      <a className="wordmark" href="#main" aria-label="Amal Jith home">
        <span className="wordmark__letters">AJ</span><span className="wordmark__dot" aria-hidden="true" />
      </a>
      <nav className={`navigation${isMenuOpen ? ' navigation--open' : ''}`} id="primary-navigation" aria-label="Main navigation">
        {NAV_LINKS.map((label, index) => (
          <a key={label} className={`nav-link${index === 0 ? ' nav-link--featured' : ''}`} href={`#${label.toLowerCase()}`} aria-disabled="true" aria-label={`${label}, coming soon`} title={`${label} — coming soon`} onClick={(event) => onUpcoming(event, label)}>{label}</a>
        ))}
      </nav>
      <div className="navbar__actions">
        <ThemeSwitcher theme={theme} onChange={onThemeChange} onOpen={() => setIsMenuOpen(false)} />
        <button className="menu-trigger" type="button" ref={menuButtonRef} aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isMenuOpen} aria-controls="primary-navigation" onClick={() => setIsMenuOpen(!isMenuOpen)}><Icon name={isMenuOpen ? 'close' : 'menu'} /></button>
      </div>
    </header>
  )
}
