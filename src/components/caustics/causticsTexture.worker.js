// Nearest-letter ownership and smoothed start times adapted from Codrops'
// glText.js (MIT). Copyright (c) 2009 - 2026 Codrops; see the bundled license.
function boxBlur(source, target, length, count, step, lineStep, radius) {
  const scale = 1 / (2 * radius + 1)
  for (let line = 0; line < count; line++) {
    const start = line * lineStep
    let sum = 0
    for (let i = 0; i <= radius && i < length; i++) sum += source[start + i * step]
    for (let i = 0; i < length; i++) {
      target[start + i * step] = sum * scale
      if (i + radius + 1 < length) sum += source[start + (i + radius + 1) * step]
      if (i - radius >= 0) sum -= source[start + (i - radius) * step]
    }
  }
}
function blur(values, width, height, spread) {
  const radius = Math.max(1, Math.round((Math.sqrt(1 + 4 * spread * spread) - 1) / 2))
  const source = Float32Array.from(values)
  const target = new Float32Array(values.length)
  for (let pass = 0; pass < 3; pass++) {
    boxBlur(source, target, width, height, 1, width, radius)
    boxBlur(target, source, height, width, width, 1, radius)
  }
  return source
}
function compute({ pixels, width, height, boxes, delays, reach, smooth, maxDelay }) {
  const count = width * height
  const inBox = new Int16Array(count).fill(-1)
  boxes.forEach(([x0, y0, x1, y1], index) => {
    for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) {
      inBox.fill(index, y * width + Math.max(0, x0), y * width + Math.min(width, x1))
    }
  })
  const owners = new Int16Array(count).fill(-1)
  const distance = new Uint16Array(count)
  const queue = new Int32Array(count)
  let head = 0
  let tail = 0
  for (let i = 0; i < count; i++) {
    if (pixels[i * 4 + 3] >= 64 && inBox[i] >= 0) {
      owners[i] = inBox[i]
      queue[tail++] = i
    }
  }
  const claim = (from, to) => {
    if (owners[to] !== -1) return
    owners[to] = owners[from]
    distance[to] = distance[from] + 1
    queue[tail++] = to
  }
  while (head < tail) {
    const i = queue[head++]
    if (distance[i] >= reach) continue
    const x = i % width
    if (x > 0) claim(i, i - 1)
    if (x < width - 1) claim(i, i + 1)
    if (i >= width) claim(i, i - width)
    if (i < count - width) claim(i, i + width)
  }
  const weight = new Float32Array(count)
  const start = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    if (owners[i] >= 0) {
      weight[i] = 1
      start[i] = delays[owners[i]]
    }
  }
  const weights = blur(weight, width, height, smooth)
  const starts = blur(start, width, height, smooth)
  const data = new Uint8Array(count * 4)
  for (let i = 0; i < count; i++) {
    data[i * 4] = Math.round(255 * (pixels[i * 4 + 3] / 255) ** 2.4)
    if (owners[i] < 0) continue
    data[i * 4 + 2] = maxDelay ? Math.round(delays[owners[i]] / maxDelay * 255) : 0
    const nearby = weights[i] > 0 ? starts[i] / weights[i] : 0
    data[i * 4 + 3] = 1 + Math.round((maxDelay ? nearby / maxDelay : 0) * 254)
  }
  return data
}
self.onmessage = ({ data: { id, job } }) => {
  const data = compute(job)
  self.postMessage({ id, data }, [data.buffer])
}
