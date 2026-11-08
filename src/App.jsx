import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AuroraBackground from './components/aurora/AuroraBackground'
import { useAccentTheme } from './hooks/useAccentTheme'

export default function App() {
  const { theme, setTheme } = useAccentTheme()
  const [notice, setNotice] = useState('')

  function announceUpcoming(event, label) {
    event.preventDefault()
    setNotice(`${label} is not available yet.`)
  }

  return (
    <div className="portfolio-shell" style={{ '--accent': theme.color, '--energy-primary': theme.energyPrimary, '--energy-secondary': theme.energySecondary }}>
      <a className="skip-link" href="#main">Skip to content</a>
      <AuroraBackground primaryColor={theme.energyPrimary} secondaryColor={theme.energySecondary} />
      <div className="frame-corners" aria-hidden="true"><i /><i /><i /><i /></div>
      <Navbar theme={theme} onThemeChange={setTheme} onUpcoming={announceUpcoming} />
      <Hero onUpcoming={announceUpcoming} />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {notice}
      </div>
    </div>
  )
}
