// Snapshot the existing DOM slots, not replacement fonts or SplitText markup.
// Each profile is rendered by the same Caustics shader and shared GL context.
import { CAUSTICS_SETTINGS } from './causticsConfig'

export const TEXT_PROFILES = [
  { selector: '#hero-heading .headline-line', intensity: 1, readability: 0.32, delay: 0.16, line: 0.3, letter: 0.035 },
  { selector: '.hero-name', intensity: 0.65, readability: 0.42, delay: 0.04 },
  { selector: '.hero-role', intensity: 0.28, readability: 0.55, delay: 0.12 },
  { selector: '.identity-divider', intensity: 0.3, readability: 0.5, delay: 0.1 },
  { selector: '.hero-description', intensity: 0.38, readability: 0.45, delay: 0.26 },
  { selector: '.cta__label', intensity: 0.32, readability: 0.5, delay: 0.34 },
  { selector: '.nav-link', intensity: 0.32, readability: 0.5, delay: 0.06 },
  { selector: '.wordmark__letters', intensity: 0.35, readability: 0.45, delay: 0.02 },
  { selector: '.disciplines > span', intensity: 0.3, readability: 0.55, delay: 0.38 },
  { selector: '.scroll-link > span:first-child', intensity: 0.3, readability: 0.55, delay: 0.42 },
]

function visible(element) {
  const style = getComputedStyle(element)
  const box = element.getBoundingClientRect()
  return element.getClientRects().length > 0 && box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
}

export function collectTargets(root, selector) {
  return TEXT_PROFILES.flatMap(profile => [...root.querySelectorAll(profile.selector)]
    .filter(element => (!selector || element.matches(selector)) && visible(element))
    .map((element, index) => ({ ...profile, strength: CAUSTICS_SETTINGS.refraction * profile.intensity, element, delay: profile.delay + (profile.line ?? 0.035) * index })))
}

function characters(element) {
  const glyphs = [...element.querySelectorAll('.type-glyph')]
  if (glyphs.length) return glyphs.map(glyph => {
    const pixel = glyph.classList.contains('type-glyph--pixel') ? glyph.querySelector('svg') : null
    const clean = glyph.querySelector('.type-glyph__clean')
    const range = document.createRange()
    range.selectNodeContents(clean)
    return { text: glyph.dataset.character, style: getComputedStyle(clean), rect: range.getBoundingClientRect(), pixel }
  })
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const result = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.parentElement.closest('.sr-only, svg')) continue
    const style = getComputedStyle(node.parentElement)
    let offset = 0
    for (const character of node.data) {
      const range = document.createRange()
      range.setStart(node, offset)
      offset += character.length
      range.setEnd(node, offset)
      if (!character.trim()) continue
      const rect = range.getBoundingClientRect()
      if (rect.width && rect.height) result.push({ text: character, style, rect })
    }
  }
  return result
}

export function buildMask(target, maxTextureSize) {
  const { element } = target
  const style = getComputedStyle(element)
  const fontSize = parseFloat(style.fontSize)
  const box = element.getBoundingClientRect()
  const pad = fontSize * 1.2
  const ratio = Math.min(window.devicePixelRatio || 1, 1.25, maxTextureSize / (box.width + 2 * pad + 2), maxTextureSize / (box.height + 2 * pad + 2))
  const width = Math.ceil((box.width + 2 * pad) * ratio)
  const height = Math.ceil((box.height + 2 * pad) * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Text mask canvas unavailable')
  ctx.scale(ratio, ratio)
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  const boxes = []
  const delays = []
  const letters = characters(element)
  let lineTop = null
  let line = -1
  let index = 0
  letters.forEach(({ text, style: letterStyle, rect, pixel }) => {
    if (lineTop === null || Math.abs(rect.top - lineTop) > fontSize * 0.35) {
      lineTop = rect.top
      line++
      index = 0
    }
    const x = rect.left - box.left + pad
    const y = rect.top - box.top + pad
    if (pixel) {
      // Draw the actual custom pixel path, in its actual SVG viewport.
      const svgBox = pixel.getBoundingClientRect()
      const view = pixel.viewBox.baseVal
      ctx.save()
      ctx.translate(svgBox.left - box.left + pad, svgBox.top - box.top + pad)
      ctx.scale(svgBox.width / view.width, svgBox.height / view.height)
      ctx.fill(new Path2D(pixel.querySelector('path').getAttribute('d')))
      ctx.restore()
    } else {
      ctx.font = `${letterStyle.fontStyle} ${letterStyle.fontWeight} ${letterStyle.fontSize} ${letterStyle.fontFamily}`
      const metrics = ctx.measureText(text)
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent
      const baseline = y + (rect.height - ascent - descent) / 2 + ascent
      ctx.fillText(text, x, baseline)
    }
    boxes.push([Math.floor(x * ratio), Math.floor(y * ratio), Math.ceil((x + rect.width) * ratio), Math.ceil((y + rect.height) * ratio)])
    delays.push(line * 0.3 + index++ * (target.letter ?? 0.009))
  })
  const maxDelay = Math.max(0, ...delays)
  return {
    ...target,
    width, height, ratio, pad, fontSize, maxDelay,
    left: box.left - pad,
    top: box.top - pad,
    job: { pixels: ctx.getImageData(0, 0, width, height).data, width, height, boxes, delays, reach: Math.ceil(pad * ratio), smooth: 0.35 * fontSize * ratio, maxDelay },
  }
}

const colorCanvas = document.createElement('canvas')
colorCanvas.width = colorCanvas.height = 1
const colors = colorCanvas.getContext('2d', { willReadFrequently: true })
export function readColor(value) {
  colors.clearRect(0, 0, 1, 1)
  colors.fillStyle = value
  colors.fillRect(0, 0, 1, 1)
  return [...colors.getImageData(0, 0, 1, 1).data].map(channel => channel / 255)
}
