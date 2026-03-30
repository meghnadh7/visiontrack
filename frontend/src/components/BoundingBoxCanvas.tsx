import { useEffect, useRef, useCallback } from 'react'

export interface Prediction {
  x: number
  y: number
  width: number
  height: number
  class: string
  confidence: number
  class_id?: number
  detection_id?: string
}

interface BoundingBoxCanvasProps {
  imageUrl: string
  predictions: Prediction[]
  /** Natural width of the original image (used for coordinate scaling). If not
   *  provided the component will read it from the loaded image element. */
  naturalWidth?: number
  /** Natural height of the original image. */
  naturalHeight?: number
  className?: string
  /** Called when the image finishes loading */
  onLoad?: (width: number, height: number) => void
}

// Deterministic colour palette – cycles through a set of visually distinct hues.
const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#14b8a6', // teal
]

function classColour(className: string): string {
  let hash = 0
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function BoundingBoxCanvas({
  imageUrl,
  predictions,
  naturalWidth,
  naturalHeight,
  className = '',
  onLoad,
}: BoundingBoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !img.complete) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use the container's current width to derive the display size
    const containerWidth = containerRef.current?.clientWidth ?? img.naturalWidth
    const imgNatW = naturalWidth ?? img.naturalWidth
    const imgNatH = naturalHeight ?? img.naturalHeight
    const aspectRatio = imgNatH / imgNatW

    // Scale canvas to fit container width while maintaining aspect ratio
    const displayWidth = containerWidth
    const displayHeight = Math.round(containerWidth * aspectRatio)

    canvas.width = displayWidth
    canvas.height = displayHeight

    // Draw the base image
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight)

    if (!predictions || predictions.length === 0) return

    // Roboflow returns bounding boxes as center-x, center-y, width, height
    // in the coordinate space of the original (natural) image.
    const scaleX = displayWidth / imgNatW
    const scaleY = displayHeight / imgNatH

    const BORDER = 2
    const FONT_SIZE = Math.max(11, Math.min(14, displayWidth / 60))
    const PAD = 4

    ctx.textBaseline = 'top'
    ctx.font = `600 ${FONT_SIZE}px Inter, ui-sans-serif, system-ui, sans-serif`

    predictions.forEach((pred) => {
      const color = classColour(pred.class)

      // Convert centre-based coords to top-left
      const x = (pred.x - pred.width / 2) * scaleX
      const y = (pred.y - pred.height / 2) * scaleY
      const w = pred.width * scaleX
      const h = pred.height * scaleY

      // Box fill (translucent)
      ctx.fillStyle = hexToRgba(color, 0.12)
      ctx.fillRect(x, y, w, h)

      // Box border
      ctx.strokeStyle = color
      ctx.lineWidth = BORDER
      ctx.strokeRect(x, y, w, h)

      // Label background
      const labelText = `${pred.class} ${(pred.confidence * 100).toFixed(0)}%`
      const textWidth = ctx.measureText(labelText).width
      const labelWidth = textWidth + PAD * 2
      const labelHeight = FONT_SIZE + PAD * 2

      // Place label above box; clamp to canvas top
      const labelY = y - labelHeight >= 0 ? y - labelHeight : y + h
      const labelX = Math.min(x, displayWidth - labelWidth)

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, [3])
      ctx.fill()

      // Label text
      ctx.fillStyle = '#ffffff'
      ctx.fillText(labelText, labelX + PAD, labelY + PAD)
    })
  }, [predictions, naturalWidth, naturalHeight])

  // Load image and draw
  useEffect(() => {
    if (!imageUrl) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl

    img.onload = () => {
      imageRef.current = img
      onLoad?.(img.naturalWidth, img.naturalHeight)
      draw()
    }

    img.onerror = () => {
      // If CORS fails, try without crossOrigin
      const fallbackImg = new Image()
      fallbackImg.src = imageUrl
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg
        onLoad?.(fallbackImg.naturalWidth, fallbackImg.naturalHeight)
        draw()
      }
    }

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imageUrl, draw, onLoad])

  // Redraw when predictions change
  useEffect(() => {
    draw()
  }, [draw])

  // Redraw on container resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto block rounded-lg"
        aria-label={`Image with ${predictions.length} detected object${predictions.length !== 1 ? 's' : ''}`}
      />
      {predictions.length > 0 && (
        <div className="absolute top-2 right-2">
          <span className="badge bg-blue-600/90 text-white text-xs font-medium shadow">
            {predictions.length} detection{predictions.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
