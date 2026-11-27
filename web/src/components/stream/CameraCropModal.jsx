'use client'

import React, { useEffect, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { computeCropRect } from '@/components/stream/canvasRenderer'

function getTargetDimensions(layout, overlays) {
  if (layout === 'duo') {
    const tickerHeight = overlays?.showTicker ? 42 : 0
    return { w: (1280 - 42) / 2, h: 720 - 28 - tickerHeight, label: 'Duo Pane' }
  }
  if (layout === 'screen') {
    const ratio = overlays?.pipSize === 'sm' ? 0.2 : overlays?.pipSize === 'lg' ? 0.33 : 0.26
    const w = Math.round(1280 * ratio)
    const h = overlays?.pipShape === 'circle' ? w : Math.round((w * 9) / 16)
    return { w, h, label: 'Camera Overlay' }
  }
  return { w: 1280, h: 720, label: 'Full Stage (16:9)' }
}

export default function CameraCropModal({
  stream,
  isMirrored,
  currentLayout,
  overlays,
  crop,
  onChange,
  onClose,
}) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const dragStateRef = useRef(null)
  const [videoDims, setVideoDims] = useState({ w: 1280, h: 720 })

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.srcObject = stream || null
    if (stream) {
      vid.play().catch(() => {})
    }
    const updateDims = () => {
      if (vid.videoWidth && vid.videoHeight) {
        setVideoDims({ w: vid.videoWidth, h: vid.videoHeight })
      }
    }
    vid.addEventListener('loadedmetadata', updateDims)
    updateDims()
    return () => {
      vid.removeEventListener('loadedmetadata', updateDims)
    }
  }, [stream])

  const target = getTargetDimensions(currentLayout, overlays)
  const rect = computeCropRect(videoDims.w, videoDims.h, target.w, target.h, crop, isMirrored)

  // Convert source crop rect (sx, sy, sw, sh) into visual percentages on the (possibly mirrored) preview
  const visualLeftPct = isMirrored
    ? ((videoDims.w - (rect.sx + rect.sw)) / videoDims.w) * 100
    : (rect.sx / videoDims.w) * 100
  const visualTopPct = (rect.sy / videoDims.h) * 100
  const visualWidthPct = (rect.sw / videoDims.w) * 100
  const visualHeightPct = (rect.sh / videoDims.h) * 100

  const handlePointerDown = (e) => {
    if (!containerRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: crop.panX,
      startPanY: crop.panY,
    }
  }

  const handlePointerMove = (e) => {
    const drag = dragStateRef.current
    const container = containerRef.current
    if (!drag || !container) return

    const box = container.getBoundingClientRect()
    const dxNorm = (e.clientX - drag.startX) / Math.max(1, box.width)
    const dyNorm = (e.clientY - drag.startY) / Math.max(1, box.height)

    // Scale sensitivity by remaining slack so dragging follows the mouse cleanly
    const slackXFrac = Math.max(0.05, 1 - rect.sw / videoDims.w)
    const slackYFrac = Math.max(0.05, 1 - rect.sh / videoDims.h)

    const nextPanX = Math.max(-1, Math.min(1, drag.startPanX + (dxNorm * 2) / slackXFrac))
    const nextPanY = Math.max(-1, Math.min(1, drag.startPanY + (dyNorm * 2) / slackYFrac))

    onChange({
      ...crop,
      panX: Number(nextPanX.toFixed(3)),
      panY: Number(nextPanY.toFixed(3)),
    })
  }

  const handlePointerUp = () => {
    dragStateRef.current = null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Crop &amp; Frame Camera</h3>
            <p className="text-xs text-muted-foreground">
              Drag the highlighted box or zoom in to select what viewers see ({target.label})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Interactive Camera Preview + Crop Box */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full aspect-video overflow-hidden rounded-lg border border-border bg-black select-none touch-none cursor-grab active:cursor-grabbing"
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-contain ${isMirrored ? '-scale-x-100' : ''}`}
          />

          {/* Highlighted Crop Region with dark outer mask */}
          <div
            style={{
              left: `${visualLeftPct}%`,
              top: `${visualTopPct}%`,
              width: `${visualWidthPct}%`,
              height: `${visualHeightPct}%`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.58)',
            }}
            className="pointer-events-none absolute border-2 border-white"
          >
            <span className="absolute -left-1 -top-1 size-2.5 bg-white" />
            <span className="absolute -right-1 -top-1 size-2.5 bg-white" />
            <span className="absolute -left-1 -bottom-1 size-2.5 bg-white" />
            <span className="absolute -right-1 -bottom-1 size-2.5 bg-white" />
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Framing Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cover', label: 'Fill Frame (Crop, No Stretch)' },
                { id: 'contain', label: 'Show Full Camera (Letterbox)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...crop, fit: opt.id })}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    crop.fit === opt.id
                      ? 'border-white bg-white text-black'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span className="tabular-nums">{crop.zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={crop.zoom}
              onChange={(e) => onChange({ ...crop, zoom: Number(e.target.value) })}
              className="w-full accent-white cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Horizontal</span>
                <span className="tabular-nums">{Math.round(crop.panX * 100)}%</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.02"
                value={crop.panX}
                onChange={(e) => onChange({ ...crop, panX: Number(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vertical</span>
                <span className="tabular-nums">{Math.round(crop.panY * 100)}%</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.02"
                value={crop.panY}
                onChange={(e) => onChange({ ...crop, panY: Number(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ zoom: 1, panX: 0, panY: 0, fit: 'cover' })}
            className="cursor-pointer"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
          <Button type="button" onClick={onClose} className="cursor-pointer">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
