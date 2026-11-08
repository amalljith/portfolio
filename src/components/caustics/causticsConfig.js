// 1 reproduces Codrops' 0.28em heading refraction; the default is more visible.
// HeroCaustics also accepts an intensity prop (0 disables, maximum 2).
export const CAUSTICS_SETTINGS = {
  intensity: 1.3,
  duration: 1.6,
  refraction: 0.28,
}

export function clampIntensity(value) {
  return Math.min(2, Math.max(0, Number.isFinite(value) ? value : CAUSTICS_SETTINGS.intensity))
}
