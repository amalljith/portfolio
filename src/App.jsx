import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import { useAccentTheme } from './hooks/useAccentTheme'

export default function App() {
  const { theme, setTheme } = useAccentTheme()
  const [notice, setNotice] = useState('')

  function announceUpcoming(event, label) {
    event.preventDefault()
    setNotice(`${label} is not available yet.`)
  }

  return (
    <div className="portfolio-shell" style={{ '--accent': theme.color }}>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="aurora" aria-hidden="true">
        <div className="aurora__atmosphere" />
        <div className="aurora__ribbon aurora__ribbon--one" />
        <div className="aurora__ribbon aurora__ribbon--two" />
        <div className="aurora__ribbon aurora__ribbon--three" />
        <div className="aurora__haze" />
        <div className="aurora__stars" />
      </div>
      <div className="frame-corners" aria-hidden="true"><i /><i /><i /><i /></div>
      <Navbar theme={theme} onThemeChange={setTheme} onUpcoming={announceUpcoming} />
      <Hero onUpcoming={announceUpcoming} />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {notice}
      </div>
    </div>
  )
}
