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

type Point = { x: number; y: number }

const MIN_ZOOM = 1
const MAX_ZOOM = 8

export function ImageSampler({ imageUrl, kernel, onSample }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imageDataRef = useRef<ImageData | null>(null)

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [crosshair, setCrosshair] = useState<Point | null>(null)
  const [magnifier, setMagnifier] = useState(true)
  const [ready, setReady] = useState(false)

  const zoomRef = useRef(zoom)
  const offsetRef = useRef(offset)
  const crosshairRef = useRef(crosshair)
  const magnifierRef = useRef(magnifier)
  const pointersRef = useRef<Map<number, Point>>(new Map())
  const panRef = useRef<{
    pointerId: number
    start: Point
    origin: Point
    moved: boolean
  } | null>(null)
  const pinchRef = useRef<{
    startDist: number
    startZoom: number
    startOffset: Point
    center: Point
  } | null>(null)
  const gestureRef = useRef<'none' | 'pan' | 'pinch'>('none')

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  useEffect(() => {
    offsetRef.current = offset
  }, [offset])
  useEffect(() => {
    crosshairRef.current = crosshair
  }, [crosshair])
  useEffect(() => {
    magnifierRef.current = magnifier
  }, [magnifier])

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

    const z = zoomRef.current
    const off = offsetRef.current
    const scale = fitScale(img, w, h) * z
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const dx = (w - dw) / 2 + off.x
    const dy = (h - dh) / 2 + off.y
    ctx.imageSmoothingEnabled = z < 2.5
    ctx.drawImage(img, dx, dy, dw, dh)

    const mark = crosshairRef.current
    if (mark) {
      ctx.save()
      ctx.strokeStyle = 'rgba(61,214,198,0.95)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(mark.x - 18, mark.y)
      ctx.lineTo(mark.x + 18, mark.y)
      ctx.moveTo(mark.x, mark.y - 18)
      ctx.lineTo(mark.x, mark.y + 18)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(mark.x, mark.y, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      if (magnifierRef.current) {
        const imgPoint = screenToImage(mark.x, mark.y, w, h, img, z, off)
        const size = 88
        const mx = clamp(mark.x - size / 2, 8, w - size - 8)
        const my = clamp(mark.y - size - 24, 8, h - size - 8)
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
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'
        ctx.beginPath()
        ctx.arc(mx + size / 2, my + size / 2, size / 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }, [])

  // Load image once per URL — never reset zoom when draw identity changes.
  useEffect(() => {
    let cancelled = false
    setReady(false)
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      imgRef.current = img
      const off = document.createElement('canvas')
      off.width = img.naturalWidth
      off.height = img.naturalHeight
      const octx = off.getContext('2d', { willReadFrequently: true })
      if (octx) {
        octx.drawImage(img, 0, 0)
        imageDataRef.current = octx.getImageData(0, 0, off.width, off.height)
      }
      zoomRef.current = 1
      offsetRef.current = { x: 0, y: 0 }
      crosshairRef.current = null
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setCrosshair(null)
      setReady(true)
      draw()
    }
    img.src = imageUrl
    return () => {
      cancelled = true
    }
  }, [imageUrl, draw])

  useEffect(() => {
    draw()
  }, [draw, zoom, offset, crosshair, magnifier, ready])

  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  const sampleAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img || !imageDataRef.current) return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const point = { x, y }
      setCrosshair(point)
      crosshairRef.current = point
      const imgPoint = screenToImage(
        x,
        y,
        rect.width,
        rect.height,
        img,
        zoomRef.current,
        offsetRef.current,
      )
      const rgb = sampleImageData(
        imageDataRef.current,
        imgPoint.x,
        imgPoint.y,
        kernel,
      )
      onSample(rgb, imgPoint)
      draw()
    },
    [draw, kernel, onSample],
  )

  const applyZoomAt = useCallback(
    (nextZoom: number, focal?: Point) => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img) return
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const focus = focal ?? { x: w / 2, y: h / 2 }
      const prev = zoomRef.current
      const next = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
      if (next === prev) return

      const prevScale = fitScale(img, w, h) * prev
      const nextScale = fitScale(img, w, h) * next
      const imgX =
        (focus.x - ((w - img.naturalWidth * prevScale) / 2 + offsetRef.current.x)) /
        prevScale
      const imgY =
        (focus.y - ((h - img.naturalHeight * prevScale) / 2 + offsetRef.current.y)) /
        prevScale
      const newOffset = {
        x: focus.x - (w - img.naturalWidth * nextScale) / 2 - imgX * nextScale,
        y: focus.y - (h - img.naturalHeight * nextScale) / 2 - imgY * nextScale,
      }

      zoomRef.current = next
      offsetRef.current = newOffset
      setZoom(next)
      setOffset(newOffset)
    },
    [],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const a = pts[0]!
      const b = pts[1]!
      const rect = canvas.getBoundingClientRect()
      pinchRef.current = {
        startDist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        startZoom: zoomRef.current,
        startOffset: { ...offsetRef.current },
        center: {
          x: (a.x + b.x) / 2 - rect.left,
          y: (a.y + b.y) / 2 - rect.top,
        },
      }
      panRef.current = null
      gestureRef.current = 'pinch'
      return
    }

    panRef.current = {
      pointerId: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      origin: { ...offsetRef.current },
      moved: false,
    }
    gestureRef.current = 'pan'
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    e.preventDefault()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()]
      const a = pts[0]!
      const b = pts[1]!
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
      const ratio = dist / pinchRef.current.startDist
      applyZoomAt(pinchRef.current.startZoom * ratio, pinchRef.current.center)
      gestureRef.current = 'pinch'
      return
    }

    const pan = panRef.current
    if (!pan || pan.pointerId !== e.pointerId) return
    const dx = e.clientX - pan.start.x
    const dy = e.clientY - pan.start.y
    if (Math.hypot(dx, dy) > 8) pan.moved = true
    if (!pan.moved) return
    const next = { x: pan.origin.x + dx, y: pan.origin.y + dy }
    offsetRef.current = next
    setOffset(next)
    gestureRef.current = 'pan'
  }

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hadPinch = gestureRef.current === 'pinch' || pointersRef.current.size >= 2
    const pan = panRef.current
    const wasTap =
      !hadPinch &&
      pan &&
      pan.pointerId === e.pointerId &&
      !pan.moved &&
      gestureRef.current === 'pan'

    pointersRef.current.delete(e.pointerId)
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // already released
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }

    if (pointersRef.current.size === 1) {
      // Resume pan with remaining finger from current offset
      const [id, point] = [...pointersRef.current.entries()][0]!
      panRef.current = {
        pointerId: id,
        start: point,
        origin: { ...offsetRef.current },
        moved: true,
      }
      gestureRef.current = 'pan'
      return
    }

    if (pointersRef.current.size === 0) {
      if (wasTap) sampleAt(e.clientX, e.clientY)
      panRef.current = null
      gestureRef.current = 'none'
    }
  }

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12
    applyZoomAt(zoomRef.current * factor, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <Card className="space-y-3 overflow-hidden p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Tap to sample · pinch / scroll to zoom
        </p>
        <div className="flex items-center gap-1">
          <span className="mr-1 min-w-10 text-right text-xs font-semibold text-[var(--color-muted)]">
            {zoom.toFixed(1)}×
          </span>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => applyZoomAt(zoomRef.current / 1.25)}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => applyZoomAt(zoomRef.current * 1.25)}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => {
              zoomRef.current = 1
              offsetRef.current = { x: 0, y: 0 }
              setZoom(1)
              setOffset({ x: 0, y: 0 })
            }}
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            1×
          </Button>
          <Button
            type="button"
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
        className="relative overflow-hidden rounded-2xl border border-white/10 touch-none"
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onWheel={onWheel}
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
        Averaging kernel: {kernel}×{kernel} · Drag to pan · Pinch or buttons to zoom
      </p>
    </Card>
  )
}

function fitScale(img: HTMLImageElement, viewW: number, viewH: number) {
  return Math.min(viewW / img.naturalWidth, viewH / img.naturalHeight)
}

function screenToImage(
  x: number,
  y: number,
  viewW: number,
  viewH: number,
  img: HTMLImageElement,
  zoom: number,
  offset: Point,
) {
  const scale = fitScale(img, viewW, viewH) * zoom
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  const dx = (viewW - dw) / 2 + offset.x
  const dy = (viewH - dh) / 2 + offset.y
  return {
    x: clamp((x - dx) / scale, 0, img.naturalWidth - 1),
    y: clamp((y - dy) / scale, 0, img.naturalHeight - 1),
  }
}
