import { useEffect, useRef, useState } from 'react'
import { Aperture, Flashlight, FlashlightOff, Pause, Play } from 'lucide-react'
import type { AveragingKernel, RGB } from '@/types'
import { sampleImageData } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props {
  kernel: AveragingKernel
  running: boolean
  onRunningChange: (v: boolean) => void
  onSample: (rgb: RGB) => void
  onCapture?: (dataUrl: string) => void
}

export function LiveCamera({
  kernel,
  running,
  onRunningChange,
  onSample,
  onCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function start() {
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }

        // Best-effort AE/AWB lock & torch
        const track = stream.getVideoTracks()[0]
        const caps = track?.getCapabilities?.() as
          | (MediaTrackCapabilities & {
              torch?: boolean
              exposureMode?: string[]
              whiteBalanceMode?: string[]
              zoom?: { min: number; max: number }
            })
          | undefined
        try {
          const advanced: Record<string, unknown>[] = []
          if (caps?.exposureMode?.includes('locked')) {
            advanced.push({ exposureMode: 'locked' })
          }
          if (caps?.whiteBalanceMode?.includes('locked')) {
            advanced.push({ whiteBalanceMode: 'locked' })
          }
          if (advanced.length) {
            await track?.applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] })
          }
        } catch {
          // unsupported constraints are fine
        }
      } catch {
        setError('Camera permission denied or unavailable on this device.')
      }
    }
    void start()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const loop = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (running && video && canvas && video.readyState >= 2) {
        const w = video.videoWidth
        const h = video.videoHeight
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          const data = ctx.getImageData(0, 0, w, h)
          const rgb = sampleImageData(data, w / 2, h / 2, kernel)
          onSample(rgb)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [kernel, onSample, running])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torch } as unknown as MediaTrackConstraintSet],
      })
      setTorch((v) => !v)
    } catch {
      setError('Flash/torch is not supported on this camera.')
    }
  }

  const applyZoom = async (next: number) => {
    setZoom(next)
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({
        advanced: [{ zoom: next } as unknown as MediaTrackConstraintSet],
      })
    } catch {
      // CSS zoom fallback via transform on video
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || !onCapture) return
    const c = document.createElement('canvas')
    c.width = video.videoWidth
    c.height = video.videoHeight
    const ctx = c.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    onCapture(c.toDataURL('image/jpeg', 0.92))
  }

  return (
    <Card className="space-y-3 overflow-hidden p-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
        {error ? (
          <div className="flex h-72 items-center justify-center p-6 text-center text-sm text-[var(--color-muted)]">
            {error}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[3/4] w-full object-cover"
              style={{ transform: `scale(${Math.max(1, zoom)})` }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-accent)]" />
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--color-accent)]" />
                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent)]/80" />
              </div>
            </div>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => onRunningChange(!running)}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? 'Pause live' : 'Resume live'}
        </Button>
        <Button variant="secondary" onClick={toggleTorch} aria-label="Toggle flash">
          {torch ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
        </Button>
        {onCapture ? (
          <Button variant="outline" onClick={capture}>
            <Aperture className="h-4 w-4" /> Capture
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-[var(--color-muted)]">
          <span>Camera zoom</span>
          <span>{zoom.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min={1}
          max={4}
          step={0.1}
          value={zoom}
          onChange={(e) => void applyZoom(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </div>
    </Card>
  )
}
