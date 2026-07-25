import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus, Scan, Search } from 'lucide-react'
import type { AveragingKernel, RGB } from '@/types'
import { sampleImageData } from '@/lib/color'
import { clamp } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props {
  imageUrl: string
  kernel: AveragingKernel
  onSample: (rgb: RGB, imagePoint: { x: number; y: number }) => void
}

export function ImageSampler({ imageUrl, kernel, onSample }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null)
  const [magnifier, setMagnifier] = useState(true)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const imageDataRef = useRef<ImageData | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    const container = containerRef.current
    if (!canvas || !img || !container) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = Math.min(520, Math.max(280, Math.round(w * 0.85)))
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0a0e14'
    ctx.fillRect(0, 0, w, h)

    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight) * zoom
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const dx = (w - dw) / 2 + offset.x
    const dy = (h - dh) / 2 + offset.y
    ctx.imageSmoothingEnabled = zoom < 3
    ctx.drawImage(img, dx, dy, dw, dh)

    // Store untransformed image data for accurate sampling
    const off = document.createElement('canvas')
    off.width = img.naturalWidth
    off.height = img.naturalHeight
    const octx = off.getContext('2d', { willReadFrequently: true })
    if (octx) {
      octx.drawImage(img, 0, 0)
      imageDataRef.current = octx.getImageData(0, 0, off.width, off.height)
    }

    if (crosshair) {
      ctx.save()
      ctx.strokeStyle = 'rgba(61,214,198,0.95)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(crosshair.x - 18, crosshair.y)
      ctx.lineTo(crosshair.x + 18, crosshair.y)
      ctx.moveTo(crosshair.x, crosshair.y - 18)
      ctx.lineTo(crosshair.x, crosshair.y + 18)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(crosshair.x, crosshair.y, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      if (magnifier && imageDataRef.current) {
        const imgPoint = screenToImage(crosshair.x, crosshair.y, w, h, img, zoom, offset)
        const size = 88
        const mx = clamp(crosshair.x - size / 2, 8, w - size - 8)
        const my = clamp(crosshair.y - size - 24, 8, h - size - 8)
        ctx.save()
        ctx.beginPath()
        ctx.arc(mx + size / 2, my + size / 2, size / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.fillStyle = '#000'
        ctx.fillRect(mx, my, size, size)
        const src = 24
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          img,
          imgPoint.x - src / 2,
          imgPoint.y - src / 2,
          src,
          src,
          mx,
          my,
          size,
          size,
        )
        ctx.restore()
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(mx + size / 2, my + size / 2, size / 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }, [crosshair, magnifier, offset, zoom])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setCrosshair(null)
      draw()
    }
    img.src = imageUrl
  }, [imageUrl, draw])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  const sampleAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imageDataRef.current) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    setCrosshair({ x, y })
    const imgPoint = screenToImage(
      x,
      y,
      rect.width,
      rect.height,
      img,
      zoom,
      offset,
    )
    const rgb = sampleImageData(
      imageDataRef.current,
      imgPoint.x,
      imgPoint.y,
      kernel,
    )
    onSample(rgb, imgPoint)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && (e as unknown as TouchEvent).touches) {
      // handled via touch events below
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || e.buttons === 0) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    if (Math.hypot(dx, dy) > 4) {
      setOffset({
        x: dragRef.current.ox + dx,
        y: dragRef.current.oy + dy,
      })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    const wasDrag = Math.hypot(dx, dy) > 6
    dragRef.current = null
    if (!wasDrag) sampleAt(e.clientX, e.clientY)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0]!
      const b = e.touches[1]!
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
      }
      dragRef.current = null
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const a = e.touches[0]!
      const b = e.touches[1]!
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const next = clamp(
        pinchRef.current.zoom * (dist / pinchRef.current.dist),
        0.5,
        8,
      )
      setZoom(next)
    }
  }

  return (
    <Card className="space-y-3 overflow-hidden p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Tap to sample · pinch to zoom</p>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setZoom((z) => clamp(z / 1.2, 0.5, 8))}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setZoom((z) => clamp(z * 1.2, 0.5, 8))}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={magnifier ? 'default' : 'secondary'}
            onClick={() => setMagnifier((v) => !v)}
            aria-label="Toggle magnifier"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-white/10"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        {!crosshair ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white/90">
              <Scan className="h-4 w-4" /> Tap a color
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        Averaging kernel: {kernel}×{kernel} · Pixel preview via crosshair + magnifier
      </p>
    </Card>
  )
}

function screenToImage(
  x: number,
  y: number,
  viewW: number,
  viewH: number,
  img: HTMLImageElement,
  zoom: number,
  offset: { x: number; y: number },
) {
  const scale = Math.min(viewW / img.naturalWidth, viewH / img.naturalHeight) * zoom
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  const dx = (viewW - dw) / 2 + offset.x
  const dy = (viewH - dh) / 2 + offset.y
  return {
    x: clamp((x - dx) / scale, 0, img.naturalWidth - 1),
    y: clamp((y - dy) / scale, 0, img.naturalHeight - 1),
  }
}
