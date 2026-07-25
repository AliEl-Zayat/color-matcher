import { jsPDF } from 'jspdf'
import type { MixRecipe } from '@/types'
import { downloadBlob } from '@/lib/utils'

export async function exportRecipePng(
  element: HTMLElement,
  filename = 'paint-match-recipe.png',
) {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    backgroundColor: '#0b0f14',
    scale: 2,
    useCORS: true,
  })
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (blob) downloadBlob(blob, filename)
}

export function exportRecipePdf(recipe: MixRecipe, filename = 'paint-match-recipe.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Paint Match AI — Recipe', margin, y)
  y += 28

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(`Palette: ${recipe.paletteName}`, margin, y)
  y += 18
  doc.text(`Target: ${recipe.target.hex}`, margin, y)
  y += 18
  doc.text(`Predicted: ${recipe.predicted.hex}`, margin, y)
  y += 18
  doc.text(`Match: ${recipe.matchPercent}%  ·  ΔE ${recipe.deltaE}`, margin, y)
  y += 28

  doc.setFont('helvetica', 'bold')
  doc.text('Mix components', margin, y)
  y += 20
  doc.setFont('helvetica', 'normal')

  for (const c of recipe.components) {
    doc.text(
      `${c.percent}%  ${c.paintName} (${c.brand})  ·  ${c.drops} drops  ·  ${c.milliliters} ml  ·  ${c.grams} g`,
      margin,
      y,
    )
    y += 18
    if (y > 760) {
      doc.addPage()
      y = margin
    }
  }

  if (recipe.notes) {
    y += 12
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', margin, y)
    y += 18
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(recipe.notes, 500)
    doc.text(lines, margin, y)
  }

  doc.save(filename)
}

export function buildDifferenceHeatmap(
  target: { r: number; g: number; b: number },
  predicted: { r: number; g: number; b: number },
  size = 120,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const image = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = x / (size - 1)
      const r = Math.round(target.r * (1 - t) + predicted.r * t)
      const g = Math.round(target.g * (1 - t) + predicted.g * t)
      const b = Math.round(target.b * (1 - t) + predicted.b * t)
      const diff =
        (Math.abs(target.r - predicted.r) +
          Math.abs(target.g - predicted.g) +
          Math.abs(target.b - predicted.b)) /
        (255 * 3)
      const heat = Math.min(255, Math.round(diff * 255 * 2 + (y / size) * 40))
      const i = (y * size + x) * 4
      image.data[i] = Math.min(255, r + heat * 0.35)
      image.data[i + 1] = Math.max(0, g - heat * 0.1)
      image.data[i + 2] = Math.min(255, b + heat * 0.2)
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}
