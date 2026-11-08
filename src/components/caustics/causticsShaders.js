// Adapted from Codrops TextCharacterAnimations, variation 19 (MIT).
// Copyright (c) 2009 - 2026 Codrops. See public/licenses/codrops-caustics.txt.
const waves = [
  [0.35, 1.3, 0], [1.25, 1, 2.1], [2.05, 0.85, 4.4],
  [2.9, 0.72, 1.3], [3.95, 0.62, 5.6], [5.1, 0.55, 3.7],
]
const floats = values => values.map(value => value.toFixed(4)).join(', ')

export const vertexShader = `#version 300 es
out vec2 vUv;
void main() {
  vec2 position = vec2(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0);
  vUv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`

export const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uDuration;
uniform float uMaxDelay;
uniform float uFontSize;
uniform float uPixelRatio;
uniform float uStrength;
uniform float uIntensity;
uniform vec2 uResolution;
uniform vec4 uColor;
uniform vec3 uAccent;
uniform vec3 uSecondary;
in vec2 vUv;
out vec4 fragColor;

const int WAVES = 6;
const vec2 DIRECTION[WAVES] = vec2[WAVES](${waves.map(([angle]) => `vec2(${floats([Math.cos(angle), Math.sin(angle)])})`).join(', ')});
const float NUMBER[WAVES] = float[WAVES](${floats(waves.map(([, length]) => 2.0 * Math.PI / length))});
const float SPEED[WAVES] = float[WAVES](${floats(waves.map(([, length]) => 1.4 * Math.sqrt(2.0 * Math.PI / length)))});
const float OFFSET[WAVES] = float[WAVES](${floats(waves.map(([, , phase]) => phase))});
const float SLOW = 0.3;
const float SOFTEN = 0.45;
const float PEAK = 1.15;
const float APPEAR = 0.15;

vec2 slope(vec2 q, float tau) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < WAVES; i++) {
    float phase = NUMBER[i] / uFontSize * dot(DIRECTION[i], q) - SPEED[i] * tau + OFFSET[i];
    g += DIRECTION[i] * cos(phase);
  }
  return g / sqrt(float(WAVES));
}
vec3 bend(vec2 q, float tau) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < WAVES; i++) {
    float n = NUMBER[i] / uFontSize;
    float phase = n * dot(DIRECTION[i], q) - SPEED[i] * tau + OFFSET[i];
    vec2 d = DIRECTION[i];
    c -= n * sin(phase) * vec3(d.x * d.x, d.y * d.y, d.x * d.y);
  }
  return c / sqrt(float(WAVES));
}
float flowTime(float s, float t) {
  float during = clamp(t, 0.0, uDuration);
  return s + min(t, 0.0) + during - (1.0 - SLOW) * during * during / (2.0 * uDuration) + SLOW * max(t - uDuration, 0.0);
}
void main() {
  vec4 here = texture(uTexture, vUv);
  if (here.a <= 0.0) { fragColor = vec4(0.0); return; }
  float around = (here.a * 255.0 - 1.0) / 254.0 * uMaxDelay;
  float t = uTime - around;
  float u = clamp(t / uDuration, 0.0, 1.0);
  float rough = (1.0 - u * u) * (1.0 - u * u);
  float k = uStrength * uIntensity * uFontSize * rough;
  float tau = flowTime(around, t);
  vec2 p = vUv * uResolution / uPixelRatio;
  vec2 q = p - k * slope(p, tau);
  q = p - k * slope(q, tau);
  vec3 c = bend(q, tau);
  float det = (1.0 + k * c.x) * (1.0 + k * c.y) - k * k * c.z * c.z;
  // Higher intensity narrows the original determinant-based light filaments.
  float soften = SOFTEN / max(1.0, uIntensity);
  float gather = sqrt(1.0 + soften * soften) / sqrt(det * det + soften * soften);
  vec4 source = texture(uTexture, vUv + (q - p) * uPixelRatio / uResolution);
  float since = uTime - source.b * uMaxDelay;
  if (source.a <= 0.0 || since < 0.0) { fragColor = vec4(0.0); return; }
  float light = source.r * gather * smoothstep(0.0, APPEAR, since);
  float alpha = clamp(min(light, PEAK) * uColor.a, 0.0, 1.0);
  // Light still comes from the original surface curvature, not an added ripple.
  float lightText = step(0.2, max(uColor.r, max(uColor.g, uColor.b)));
  float tint = clamp(gather - 1.0, 0.0, 1.0) * rough;
  float shimmer = tint * clamp(uIntensity - 0.5, 0.0, 1.0);
  vec3 color = mix(uColor.rgb, mix(uAccent, uSecondary, 0.3), tint * mix(0.015, 0.26, lightText));
  // Pale highlights make caustics visible on colored letters; dark CTA text
  // keeps its contrast. Both lighting additions disappear as the water calms.
  color = mix(color, vec3(1.0), shimmer * 0.18 * lightText);
  fragColor = vec4(color * alpha, alpha);
}`
