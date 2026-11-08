# Continuous portfolio background

Phase 6 uses one viewport-sized, fixed Aurora canvas mounted in `App`, outside
the page sections. `hero-stage` only groups the Hero DOM and its frame corners;
it does not contain, clip, or own Aurora. The existing Caustics overlay remains
a separate, finite Hero effect. About adds no renderer.

The original river, noise, particles, pointer steering and cascade are retained.
Section uniforms only adjust their presentation:

| Uniform | Purpose |
| --- | --- |
| `uFlowPosition` | Offset the existing flow in viewport UV coordinates |
| `uIntensity` | Scale energy and atmosphere brightness |
| `uOpacity` | Blend the field over the dark page background |
| `uParticleVisibility` | Control embedded sparks and depth motes |
| `uCurvature` | Scale the existing curved guide |
| `uScroll` | Add a small, continuous vertical drift |

`useAuroraSections` caches section geometry on resize/font/layout changes. Passive
scroll events update a mutable target ref; they do not set React state, render
canvases, or read layout on each scroll. The scene damps the targets into existing
uniforms, preserving `uTime` and `uProgress`. Only the first page entrance advances
`uProgress`; scrolling back to Hero does not reset it.

Future Skills, Projects, Contact and Footer sections can opt in with
`data-aurora-section="skills"`, `"projects"`, `"contact"`, or `"footer"`.
Tune their targets in `sectionProfiles.js`; no scene changes are needed. Newly
added section components should be mounted in normal document order. For a new
profile, add its name and targets to that registry and use the matching attribute.

The renderer pauses for document visibility and the existing initial preloader
gate, never because Hero leaves the viewport. Reduced motion uses the themed CSS
fallback without initializing Aurora's renderer. WebGL failure uses that same
fallback. The existing DPR/pixel budget and adaptive quality remain in place.

About inherits the existing theme variables, supplies independent dark reading
surfaces, and uses scoped GSAP ScrollTrigger/SplitText entrances. Its DOM text is
visible by default, restored after splitting, and static with reduced motion.
