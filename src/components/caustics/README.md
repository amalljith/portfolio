# Hero Caustics

Source inspected: Codrops TextCharacterAnimations variation 19,
[caustics.js](https://github.com/codrops/TextCharacterAnimations/blob/main/js/variations/caustics.js)
and [glText.js](https://github.com/codrops/TextCharacterAnimations/blob/main/js/variations/glText.js).
The MIT notice is shipped in `public/licenses/codrops-caustics.txt`.

The shader retains the six wave directions, wavelengths, phases and dispersion,
two inverse-refraction iterations, Hessian determinant light concentration,
0.45 baseline filament softening, 1.15 light peak, 0.15s appearance,
quartic roughness decay and integrated slowing clock. Heading letters start at
0.035s intervals with overlapping lines 0.3s apart. The masks retain nearest-letter
ownership and 0.35em smoothed start times. GSAP advances the shader clock linearly;
the calm final frame hands back to the original selectable DOM text.

Adaptations: one shared, scissored raw WebGL2 overlay instead of a context per
text block; DOM Range measurements instead of SplitText; existing SVG paths for
pixel glyphs; gentler displacement and shorter letter intervals for small text;
theme-colored concentrated highlights; a 0.4s DOM handover; a 1.25 DPR cap and
1.5-million-pixel overlay budget. Mobile displacement is reduced by 20%.
Text masks are prepared in one short-lived worker. Parallel shader compilation
is used when supported, and the idle drawing buffer shrinks to one pixel.
No DOM text or glyphs are replaced.

## Intensity tuning

`causticsConfig.js` supplies the default intensity (1.3) and finite calming
duration (1.6s, extended from the original 1.2s). Alternatively pass
`<HeroCaustics intensity={1.3} />`; values are clamped to 0–2, with 0 disabling
the effect on initial load. Changes during playback update the existing shader
uniform without rebuilding masks, creating contexts, or restarting the clock.

`TEXT_PROFILES` in `textMasks.js` sets relative intensity: heading 1, name 0.65,
and supporting text 0.28–0.38. Refraction is the original 0.28em multiplied by
the profile and global intensity. Higher intensity sharpens the original
curvature-based filaments; concentrated highlights gain a pale, themed shimmer.
The six waves and inverse-refraction calculation remain unchanged. Small text
retains a stronger DOM underlay, while the heading keeps a faint readable
silhouette. These layers are fully restored on completion or fallback.

Aurora has an encapsulated React Three Fiber canvas behind the interface and
no overlay composition slot. Reusing it would require editing its scene and
render order, contrary to preserving it. This additional context serves all
text, uses no Three.js renderer, and stops drawing and releases textures after
the finite entrance. It does not run continuous water animation after settling,
matching the original effect's water-to-crisp-text behavior. Mobile menu labels
use this same context when opened. The existing background remains untouched.

Reduced motion skips GPU and worker setup. Missing WebGL2/worker support,
context loss, unavailable fonts/workers, resizing and text selection leave the
original DOM readable. Text stays visible while masks prepare. Visibility changes pause the clock. Theme changes
update colors on the next rendered frame without rerunning either entrance.
