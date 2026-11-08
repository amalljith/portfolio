export const auroraVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const auroraFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec3 uEnergyPrimary;
  uniform vec3 uEnergySecondary;
  uniform vec2 uMouse;
  uniform float uInteraction;
  uniform float uCompact;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + 1.0), f.x), f.y);
  }

  float cascadeFront(float progress, float delay) {
    float p = clamp((progress - delay) / (1.0 - delay), 0.0, 1.0);
    float eased = p * p * p * (p * (p * 6.0 - 15.0) + 10.0);
    return mix(-0.08, 1.12, eased);
  }

  // A continuous river replaces the two pinched fans. Only the two neighboring
  // fibers are sampled, independent of the number of visible strands.
  vec3 streamRiver(vec2 uv, float aspect, float progress, vec3 tint, vec3 deepTint) {
    const float seed = 3.1;
    float s = (1.08 - uv.y) / 1.16;
    // The same advected turbulence carries bends, density and light outwards.
    // The band stays anchored; only the flowing material undulates.
    float material = s * 4.2 - uTime * 0.16;
    float turbulence = noise(vec2(material, seed));
    float detail = noise(vec2(material * 2.3 + 4.1, seed + 8.0));
    // Width has a positive, aspect-aware base everywhere: there is no origin,
    // shared endpoint, or width multiplier that can collapse the river.
    float width = clamp(0.42 / max(aspect, 0.4), 0.22, 0.30)
                * (0.94 + turbulence * 0.12);
    float guide = mix(0.84, 0.94, uCompact)
                + mix(0.075, 0.035, uCompact) * cos(s * 6.283185);
    guide += (turbulence - 0.5) * 0.018 + (detail - 0.5) * 0.008;
    float count = mix(28.0, 16.0, uCompact);
    float lane = ((uv.x - guide) / width + 0.5) * count;
    // Compress and separate neighboring fibers instead of equally spaced rays.
    lane += (sin(lane * 0.42 + material * 2.8 + seed) * 1.25
           + sin(lane * 1.43 - material * 3.1) * 0.24)
          * smoothstep(0.03, 0.30, s);
    float first = floor(lane);
    float laneAA = max(fwidth(lane), 0.018);
    float travelAA = max(fwidth(s) * 2.2, 0.005);
    // Keep the existing cascade and per-fiber stagger, now following this
    // uninterrupted curved path from above the viewport to below it.
    float path = s;
    float pathAA = max(fwidth(path), 0.004);
    float handoff = smoothstep(0.72, 1.0, progress);
    vec3 light = vec3(0.0);

    for (int neighbor = 0; neighbor < 2; neighbor++) {
      float id = first + float(neighbor);
      float random = hash(vec2(id, seed));
      float depth = hash(vec2(id + 17.3, seed));
      float front = 1.12;
      float revealed = 1.0;
      float entranceHead = 0.0;
      // Skip entrance lighting once settled. Rightmost fibers arrive first;
      // stable per-fiber delays make the descending edge irregular.
      if (progress < 1.0) {
        float delay = random * 0.055 + (1.0 - clamp(id / count, 0.0, 1.0)) * 0.045;
        front = cascadeFront(progress, delay);
        revealed = 1.0 - smoothstep(front - 0.022, front + 0.022, path);
        entranceHead = exp(-abs(path - front) / max(0.012, pathAA)) * (1.0 - handoff);
      }
      float offset = (random - 0.5) * 0.38
                   + sin(material * (1.4 + random) + random * 6.283) * 0.055;
      float d = abs(lane - id - offset);
      float support = 1.0 - smoothstep(0.38, 0.72, d);
      float coreWidth = max(mix(0.045, 0.30, random) * (0.8 + detail * 0.5),
                            laneAA * mix(0.45, 1.1, depth));
      float core = exp(-d * d / (coreWidth * coreWidth)) * support;
      float softness = mix(0.42, 0.20, depth);
      float halo = exp(-d * d / (softness * softness)) * support;

      // A bright head moves downwards along a curved fiber, followed by a long
      // fading wake. Only the dark gap wraps: particles never jump on a path.
      float phase = fract(uTime * (0.30 + random * 0.16) - s * 2.2 + random * 7.0);
      float wake = smoothstep(0.07, 0.18, phase)
                 * exp(-max(phase - 0.18, 0.0) * 7.0)
                 * (1.0 - smoothstep(0.80, 1.0, phase));
      float head = exp(-abs(phase - 0.18) / travelAA)
                 * smoothstep(0.0, 0.08, phase)
                 * (1.0 - smoothstep(0.80, 1.0, phase));
      if (progress < 1.0) {
        float pouringWake = exp(-max(front - path, 0.0) * 12.0);
        wake = mix(pouringWake, wake, handoff);
      }
      float track = step(0.0, id) * (1.0 - step(count, id));
      vec3 trackTint = mix(deepTint * 1.8, tint, 0.4 + random * 0.6);
      trackTint = mix(trackTint, uEnergySecondary, step(0.975, random) * 0.18);
      float energy = core * (0.03 + wake * 0.48 + entranceHead * 0.4)
                   + halo * (0.025 + wake * 0.19);
      // Only some fibers carry a sharp, pale glint. The other particles
      // remain softly embedded in the glowing stream at different depths.
      vec3 sparkTint = mix(trackTint, mix(tint, vec3(1.0), 0.65), 0.28);
      sparkTint = mix(sparkTint, uEnergySecondary, step(0.92, depth) * 0.20);
      // Themed droplets ride the descending front, then yield smoothly to the
      // unchanged steady-flow particles. No phase or material clock resets.
      vec3 spark = sparkTint * head * handoff * (core * 0.95 + halo * 0.15) * step(0.62, random);
      spark += tint * entranceHead * (core * 0.55 + halo * 0.12) * step(0.45, random);
      light += (trackTint * energy + spark) * track * mix(0.22, 1.0, depth) * revealed;
    }

    // Broad, uneven light between fibers binds them into a luminous volume.
    // This is analytic glow in the same pass, with no bloom render targets.
    float across = (uv.x - guide) / width;
    float veil = exp(-across * across * 7.0) * (0.010 + detail * 0.035);
    float fog = exp(-across * across * 1.7) * (0.025 + turbulence * 0.025);
    float bankReveal = 1.0;
    if (progress < 1.0) {
      float bankFront = cascadeFront(progress, 0.05);
      bankReveal = 1.0 - smoothstep(bankFront - 0.035, bankFront + 0.035, path);
    }
    light += (tint * veil * 0.65 + deepTint * fog) * bankReveal;
    return light;
  }

  vec3 depthMotes(vec2 uv, float aspect, float layer, vec3 tint) {
    float density = mix(24.0, 11.0, layer);
    vec2 drift = vec2(0.003 + layer * 0.007, -0.002 - layer * 0.004) * uTime;
    // Each layer has its own grid, speed, size, focus and brightness.
    vec2 grid = (uv * vec2(aspect, 1.0) - drift) * density + layer * 19.7;
    vec2 cell = floor(grid);
    float seed = hash(cell + layer * 31.0);
    vec2 mote = fract(grid) - vec2(0.22 + seed * 0.56, 0.22 + hash(cell + 7.1) * 0.56);
    float radius2 = dot(mote, mote);
    // Small points at both depths, with a pixel-aware minimum to avoid shimmer.
    float radius = max(inversesqrt(mix(2200.0, 900.0, layer)), fwidth(grid.x) * 0.65);
    float point = exp(-radius2 / (radius * radius)) * mix(0.028, 0.055, layer);
    float halo = exp(-radius2 * 220.0) * mix(0.001, 0.003, layer);
    float rarity = step(mix(0.88, 0.92, layer), seed);
    vec3 color = mix(tint * 0.4, uEnergySecondary, seed * 0.5);
    // A few stable, theme-tinted pinpoints; no timed flashes or large bloom disks.
    float sparkle = exp(-radius2 / (radius * radius)) * step(0.995, seed) * 0.12;
    return color * (point + halo) * rarity * (0.35 + seed * 0.65)
         + mix(tint, vec3(1.0), 0.65) * sparkle;
  }

  void main() {
    float progress = clamp(uProgress, 0.0, 1.0);
    // Zero velocity and acceleration at both ends of the entrance.
    float spread = progress * progress * progress * (progress * (progress * 6.0 - 15.0) + 10.0);
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    // The composition is anchored throughout the entrance; only light travels.
    vec2 uv = vUv;
    vec2 mouseDistance = (vUv - uMouse) * vec2(aspect, 1.0);
    float influence = exp(-dot(mouseDistance, mouseDistance) * 10.0) * uInteraction;
    uv += (uMouse - vec2(0.75, 0.45)) * 0.012 * uInteraction;
    // Preserve the existing gentle, localized cursor steering.
    uv += vec2(-mouseDistance.y / aspect, mouseDistance.x) * influence * 0.055;

    // Both colors come from the existing React theme and interpolate in linear light.
    vec3 tint = uEnergyPrimary;
    vec3 deepTint = uEnergySecondary * 0.28;
    vec3 field = vec3(0.0);
    if (vUv.x > 0.42) {
      field = streamRiver(uv, aspect, progress, tint, deepTint);

      field += depthMotes(uv, aspect, 0.0, tint) * spread;
      if (uCompact < 0.5) field += depthMotes(uv, aspect, 1.0, tint) * spread;

      // Very low-frequency fog creates depth in the open space between fans.
      // One noise lookup replaces expensive volumetric marching/postprocessing.
      float atmosphere = noise(uv * vec2(2.4, 3.1) + vec2(-uTime * 0.012, uTime * 0.006));
      vec2 hazeDelta = (uv - vec2(0.88, 0.53)) * vec2(aspect * 0.55, 0.9);
      float haze = exp(-dot(hazeDelta, hazeDelta) * 3.0) * (0.045 + atmosphere * 0.085);
      float dust = noise(uv * vec2(aspect * 9.0, 11.0) + vec2(-uTime * 0.006, uTime * 0.004));
      field += deepTint * haze * (0.85 + dust * 0.30) * spread;
    }

    float composition = smoothstep(0.42, 0.70, vUv.x);
    float textProtection = 1.0 - 0.65 * (1.0 - smoothstep(0.55, 0.85, vUv.x))
                               * smoothstep(0.28, 0.5, vUv.y);
    field *= composition * textProtection * mix(1.0, 0.65, uCompact);

    vec3 color = vec3(0.0008, 0.0012, 0.0018) + field;
    color += (hash(gl_FragCoord.xy) - 0.5) * 0.0006;
    gl_FragColor = vec4(max(color, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`
