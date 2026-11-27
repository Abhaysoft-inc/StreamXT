'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ACCENT_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
]

const FRAME_STYLES = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'bordered', label: 'Border' },
  { id: 'rounded', label: 'Soft' },
]

const WATERMARK_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
]

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3 cursor-pointer">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-border accent-white cursor-pointer"
      />
    </label>
  )
}

export default function BrandPanel({ brand, onChange }) {
  const update = (patch) => onChange({ ...brand, ...patch })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Brand Color</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Accent color for overlays and name tags.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const active = brand.accentColor.toLowerCase() === preset.value.toLowerCase()
            return (
              <button
                key={preset.value}
                type="button"
                title={preset.label}
                onClick={() => update({ accentColor: preset.value })}
                className="flex size-7 items-center justify-center rounded-full border border-border transition hover:scale-105 cursor-pointer"
                style={{ backgroundColor: preset.value }}
              >
                {active ? (
                  <Check
                    className={`size-3.5 ${preset.value === '#ffffff' ? 'text-black' : 'text-white'}`}
                  />
                ) : null}
              </button>
            )
          })}
          <input
            type="color"
            aria-label="Custom brand color"
            value={brand.accentColor}
            onChange={(e) => update({ accentColor: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Stage Frame</Label>
        <div className="grid grid-cols-3 gap-2">
          {FRAME_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => update({ frameStyle: style.id })}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                brand.frameStyle === style.id
                  ? 'border-white bg-white text-black'
                  : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="Brand Watermark"
          description="Display your channel name on stream"
          checked={brand.showWatermark}
          onChange={(val) => update({ showWatermark: val })}
        />

        {brand.showWatermark ? (
          <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="brand-watermark-text" className="text-xs text-muted-foreground">
                Watermark Text
              </Label>
              <Input
                id="brand-watermark-text"
                value={brand.watermarkText}
                maxLength={28}
                onChange={(e) => update({ watermarkText: e.target.value })}
                placeholder="StreamXT"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Position</Label>
              <div className="grid grid-cols-2 gap-2">
                {WATERMARK_POSITIONS.map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => update({ watermarkPosition: pos.id })}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                      brand.watermarkPosition === pos.id
                        ? 'border-white bg-white text-black'
                        : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <ToggleRow
          label="Host Name Tag"
          description="Show your display name on stage"
          checked={brand.showNameTag}
          onChange={(val) => update({ showNameTag: val })}
        />
      </div>
    </div>
  )
}
