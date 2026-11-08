// One renderer and one material clock. Future sections opt in with
// data-aurora-section="skills" (etc.); these are targets, never new scenes.
const HERO = { x: 0, y: 0, intensity: 1, opacity: 1, particles: 1, curvature: 1 }

export const AURORA_PROFILES = {
  hero: HERO,
  about: { x: 0.035, y: -0.025, intensity: 0.64, opacity: 0.8, particles: 0.4, curvature: 0.72 },
  skills: { x: 0.015, y: 0.02, intensity: 0.72, opacity: 0.85, particles: 0.5, curvature: 0.85 },
  projects: { x: -0.015, y: 0, intensity: 0.85, opacity: 0.9, particles: 0.65, curvature: 1.05 },
  contact: { x: 0.025, y: -0.015, intensity: 0.7, opacity: 0.85, particles: 0.5, curvature: 0.8 },
  footer: { x: 0.04, y: 0, intensity: 0.55, opacity: 0.75, particles: 0.3, curvature: 0.7 },
}

export const PROFILE_KEYS = Object.keys(HERO)
