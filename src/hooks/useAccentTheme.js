import { useEffect, useState } from 'react'

export const THEMES = [
  // Keep the stored ID so existing green selections adopt the new default.
  { id: 'aurora', name: 'Acid Lime', color: '#AFEC00' },
  { id: 'cosmic', name: 'Cosmic Violet', color: '#A855F7' },
  { id: 'electric', name: 'Electric Cyan', color: '#22D3EE' },
  { id: 'rose', name: 'Neon Rose', color: '#FF4DA6' },
  { id: 'solar', name: 'Solar Orange', color: '#FF914D' },
  { id: 'glacier', name: 'Glacier Blue', color: '#60A5FA' },
]
const STORAGE_KEY = 'aj-portfolio-accent'

function getSavedTheme() {
  try {
    return THEMES.find(({ id }) => id === localStorage.getItem(STORAGE_KEY)) ?? THEMES[0]
  } catch {
    return THEMES[0]
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
