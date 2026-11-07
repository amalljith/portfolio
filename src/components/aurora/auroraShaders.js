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
  uniform vec3 uAccent;
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

  // Backtrace a material coordinate along the sheet. A noise feature therefore
  // travels right-to-left, carrying its folds, width, and light with it.
  // No looping phase or global sine-wave oscillation drives the motion.
  vec4 flowingSheet(vec2 uv, float guide, float width, float seed, float weight, float growth) {
    float travel = 1.12 - uv.x - uTime * (0.062 + seed * 0.0015);
    float fold = noise(vec2(travel * 3.1, seed * 5.13 + uTime * 0.008));
    float shoulder = noise(vec2(travel * 5.3 + 4.7, seed * 9.7));
    float packet = smoothstep(0.14, 0.76, shoulder);
    float localWidth = width * (0.35 + packet * 1.25) * growth;
    float n = (uv.y - guide - (fold - 0.5) * 0.42) / localWidth;

    // Domain warping bends the interior of each translucent surface, so the
    // fine strands bunch, separate, and fold instead of staying parallel.
    vec2 material = vec2(travel * 3.5, n * 0.45);
    float curl = noise(material + vec2(seed * 3.7, 2.3));
    n += (curl - 0.5) * 0.85;

    float body = exp(-n * n * 1.35);
    float facing = smoothstep(-1.0, 0.8, n + (curl - 0.5) * 0.4);
    float rim = exp(-abs(n - 0.6) * 42.0);
    float innerFold = exp(-abs(n + 0.4 + (shoulder - 0.5) * 0.8) * 32.0) * 0.27;

    float threadPhase = n * mix(9.0, 17.0, 1.0 - uCompact) + curl * 2.2 + travel * 1.1;
    float aa = max(fwidth(threadPhase), 0.025);
    float strands = 1.0 - smoothstep(0.025, 0.025 + aa, abs(fract(threadPhase) - 0.5));
    strands *= 1.0 - smoothstep(0.18, 0.65, aa);

    // Finite illuminated sections travel with the width/fold field. Stronger
    // leading folds and quiet trailing silk give an unmistakable flow direction.
    float flowLight = (0.16 + 0.84 * smoothstep(0.18, 0.78, fold)) * (0.08 + packet * 1.4);
    float silk = body * (0.055 + facing * 0.22 + strands * 0.02) * flowLight;
    float edge = (rim + innerFold) * flowLight * 1.15;
    vec3 radiance = uAccent * (silk + edge * 0.86);
    radiance += mix(uAccent, vec3(1.0), 0.55) * rim * flowLight * 0.24;
    radiance += uAccent * exp(-n * n * 0.3) * 0.008 * packet;
    return vec4(radiance * weight, body * weight * packet * 0.42);
  }

  void main() {
    float progress = clamp(uProgress, 0.0, 1.0);
    float spread = progress * progress * (3.0 - 2.0 * progress);
    float arrival = 1.0 - spread;
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Actual sheet displacement accompanies the advancing reveal. The material
    // keeps flowing through both phases; completing the entrance resets nothing.
    vec2 uv = vUv - vec2(0.40, 0.32) * arrival;
    vec2 mouseDistance = (vUv - uMouse) * vec2(aspect, 1.0);
    float influence = exp(-dot(mouseDistance, mouseDistance) * 10.0) * uInteraction;
    uv += (uMouse - 0.5) * 0.012 * uInteraction;
    uv.y += (noise(uv * 4.0 + uTime * 0.03) - 0.5) * influence * 0.055;

    // Asymmetric guide curves establish composition, not time-dependent waves.
    float x = uv.x;
    float mainGuide = -0.24 + x * 0.9
                    + 0.15 * smoothstep(0.35, 0.57, x)
                    - 0.19 * smoothstep(0.57, 0.77, x)
                    + 0.14 * smoothstep(0.80, 1.02, x);
    float upperGuide = 0.28 + (x - 0.68) * 2.4 + 0.18 * smoothstep(0.58, 0.80, x);
    float growth = mix(0.32, 1.0, smoothstep(0.0, 0.85, progress));

    vec3 field = vec3(0.0);
    if (uCompact < 0.5) {
      vec4 rear = flowingSheet(uv, mainGuide - 0.16, 0.20, 7.0, 0.28, growth);
      field = rear.rgb;
    }
    vec4 upper = flowingSheet(uv, upperGuide, 0.14, 3.0, 0.64, growth);
    field = field * (1.0 - upper.a) + upper.rgb;
    vec4 mainSheet = flowingSheet(uv, mainGuide, 0.16, 1.0, 1.0, growth);
    field = field * (1.0 - mainSheet.a) + mainSheet.rgb;

    // An irregular right-to-left liquid front controls spatial coverage.
    // At progress=0 every sheet is hidden; at 1 the whole composition is open.
    float frontDistance = 1.05 - vUv.x
                        + 0.085 * noise(vUv * vec2(3.0, 5.0) + vec2(0.0, uTime * 0.04))
                        + 0.035 * (1.0 - vUv.y);
    float front = mix(-0.08, 1.28, spread);
    float revealed = smoothstep(frontDistance - 0.07, frontDistance + 0.07, front);
    float liquidHead = exp(-abs(frontDistance - front) * 35.0) * arrival;
    field *= revealed * (mix(0.5, 1.0, spread) + liquidHead * 0.4);

    float composition = smoothstep(0.24, 0.67, vUv.x);
    float textProtection = 1.0 - 0.88 * (1.0 - smoothstep(0.4, 0.7, vUv.x))
                               * smoothstep(0.18, 0.5, vUv.y);
    field *= composition * textProtection;

    vec3 color = vec3(0.0010, 0.0017, 0.0010) + field;
    color += (hash(gl_FragCoord.xy) - 0.5) * 0.0006;
    gl_FragColor = vec4(max(color, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`
