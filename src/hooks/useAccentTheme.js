import { useEffect, useState } from 'react'

export const THEMES = [
  // Keep every stored ID and swatch compatible with existing selections.
  { id: 'aurora', name: 'Acid Lime', color: '#AFEC00', energyPrimary: '#AFEC00', energySecondary: '#10B981' },
  { id: 'cosmic', name: 'Cosmic Violet', color: '#A855F7', energyPrimary: '#A855F7', energySecondary: '#C4B5FD' },
  { id: 'electric', name: 'Electric Cyan', color: '#22D3EE', energyPrimary: '#2563EB', energySecondary: '#22D3EE' },
  { id: 'rose', name: 'Neon Rose', color: '#FF4DA6', energyPrimary: '#FF4DA6', energySecondary: '#FF00CC' },
  { id: 'solar', name: 'Solar Orange', color: '#FF914D', energyPrimary: '#FF914D', energySecondary: '#FFBF24' },
  { id: 'glacier', name: 'Glacier Blue', color: '#60A5FA', energyPrimary: '#A5D8FF', energySecondary: '#1D4ED8' },
]
const DEFAULT_THEME = THEMES[0]
const STORAGE_KEY = 'aj-portfolio-accent'

function getSavedTheme() {
  try {
    return THEMES.find(({ id }) => id === localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function useAccentTheme() {
  const [theme, setTheme] = useState(getSavedTheme)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme.id)
    } catch {
      // The selector remains usable when browser storage is unavailable.
    }
  }, [theme])
  return { theme, setTheme }
}
