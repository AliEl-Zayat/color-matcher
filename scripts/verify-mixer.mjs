import Color from 'colorjs.io'

function rgbToLab({ r, g, b }) {
  const color = new Color('srgb', [r / 255, g / 255, b / 255])
  const [l, a, bb] = color.to('lab').coords
  return { l, a, b: bb }
}

function deltaE2000(a, b) {
  const c1 = new Color('lab', [a.l, a.a, a.b])
  const c2 = new Color('lab', [b.l, b.a, b.b])
  return c1.deltaE(c2, '2000')
}

function predictMix(paints, weights) {
  const total = weights.reduce((s, w) => s + w, 0)
  const norms = weights.map((w) => w / total)
  const mixed = paints.reduce(
    (acc, paint, i) => {
      const w = norms[i]
      return {
        c: acc.c + (1 - paint.r / 255) * w,
        m: acc.m + (1 - paint.g / 255) * w,
        y: acc.y + (1 - paint.b / 255) * w,
      }
    },
    { c: 0, m: 0, y: 0 },
  )
  return {
    r: Math.round((1 - mixed.c) * 255),
    g: Math.round((1 - mixed.m) * 255),
    b: Math.round((1 - mixed.y) * 255),
  }
}

const paints = [
  { name: 'White', r: 245, g: 245, b: 242 },
  { name: 'Brown', r: 110, g: 68, b: 42 },
  { name: 'Yellow', r: 242, g: 201, b: 56 },
  { name: 'Crimson', r: 176, g: 32, b: 48 },
]
const target = { r: 162, g: 120, b: 84 }
const weights = [0.63, 0.18, 0.11, 0.08]
const predicted = predictMix(paints, weights)
const dE = deltaE2000(rgbToLab(predicted), rgbToLab(target))

if (!(dE < 25)) {
  console.error('Mixer verification failed', { predicted, dE })
  process.exit(1)
}
console.log('Mixer verification OK', { predicted, deltaE: Number(dE.toFixed(2)) })
