'use client'

import React, { useRef, useState } from 'react'
import { Eye, EyeOff, Pause, Play, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_OVERLAYS, OVERLAY_PRESETS } from '@/components/stream/overlayPresets'

const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'banners', label: 'Banners' },
  { id: 'widgets', label: 'Widgets' },
  { id: 'media', label: 'Media' },
]

const LOWER_THIRD_STYLES = [
  { id: 'modern', label: 'Modern' },
  { id: 'glass', label: 'Glass' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'block', label: 'Solid' },
  { id: 'broadcast', label: 'News' },
]

const ALIGN_OPTIONS = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
]

const SCENE_MODES = [
  { id: 'none', label: 'Live Video' },
  { id: 'starting', label: 'Starting Soon' },
  { id: 'brb', label: 'BRB' },
  { id: 'ending', label: 'Ending' },
]

const IMAGE_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'center', label: 'Center' },
  { id: 'full', label: 'Full Frame' },
]

const PIP_POSITIONS = [
  { id: 'top-left', label: 'Top L' },
  { id: 'top-right', label: 'Top R' },
  { id: 'bottom-left', label: 'Bot L' },
  { id: 'bottom-right', label: 'Bot R' },
]

const PIP_SIZES = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
]

const PIP_SHAPES = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' },
  { id: 'circle', label: 'Circle' },
]

const VIDEO_FILTERS = [
  { id: 'none', label: 'Normal' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'bw', label: 'B&W' },
  { id: 'contrast', label: 'Crisp' },
]

const STAGE_BACKGROUNDS = [
  { id: 'solid', label: 'Solid' },
  { id: 'grid', label: 'Grid' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'glow', label: 'Glow' },
]

function OverlaySwitch({ label, description, checked, onChange }) {
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

const GRID_COLS = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

function SegmentedButtons({ options, value, onChange, cols = 3 }) {
  return (
    <div className={`grid gap-1.5 ${GRID_COLS[cols] || 'grid-cols-3'}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-md border px-2 py-1.5 text-xs font-medium transition cursor-pointer ${
            value === opt.id
              ? 'border-white bg-white text-black'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function formatTimer(seconds) {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function OverlaysPanel({ overlays, onChange }) {
  const [activeTab, setActiveTab] = useState('library')
  const fileInputRef = useRef(null)

  const update = (patch) => onChange({ ...overlays, ...patch })

  const handleUploadImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      const newLayer = {
        id: `img-${Date.now()}`,
        name: file.name.slice(0, 28),
        dataUrl: reader.result,
        position: 'top-left',
        scale: 0.22,
        opacity: 1,
        visible: true,
      }
      update({ imageLayers: [...(overlays.imageLayers || []), newLayer] })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const updateImageLayer = (id, patch) => {
    update({
      imageLayers: (overlays.imageLayers || []).map((layer) =>
        layer.id === id ? { ...layer, ...patch } : layer,
      ),
    })
  }

  const removeImageLayer = (id) => {
    update({
      imageLayers: (overlays.imageLayers || []).filter((layer) => layer.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-background/60 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERLAY LIBRARY & SCENES */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Quick Presets
              </Label>
              <button
                type="button"
                onClick={() => onChange({ ...DEFAULT_OVERLAYS, imageLayers: overlays.imageLayers })}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Reset all
              </button>
            </div>

            <div className="space-y-2">
              {OVERLAY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => update(preset.patch)}
                  className="w-full rounded-lg border border-border bg-background/60 p-3 text-left transition hover:border-white/50 cursor-pointer"
                >
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Full-screen Scene Overlay Controls */}
          <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Scene Overlay
            </Label>
            <SegmentedButtons
              cols={2}
              options={SCENE_MODES}
              value={overlays.sceneMode}
              onChange={(mode) => {
                const defaults = {
                  starting: {
                    sceneTitle: 'Stream Starting Soon',
                    sceneSubtitle: 'Going live in a moment',
                  },
                  brb: {
                    sceneTitle: 'Be Right Back',
                    sceneSubtitle: 'Taking a short break — stay tuned!',
                  },
                  ending: {
                    sceneTitle: 'Thanks for Watching',
                    sceneSubtitle: 'See you on the next stream!',
                  },
                }
                update({
                  sceneMode: mode,
                  ...(defaults[mode] || {}),
                })
              }}
            />

            {overlays.sceneMode !== 'none' ? (
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Scene Heading</Label>
                  <Input
                    value={overlays.sceneTitle}
                    onChange={(e) => update({ sceneTitle: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Scene Subtext</Label>
                  <Input
                    value={overlays.sceneSubtitle}
                    onChange={(e) => update({ sceneSubtitle: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {overlays.sceneMode === 'starting' ? (
                  <div className="space-y-2 rounded-md border border-border bg-background/60 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Countdown</span>
                      <span className="font-mono text-sm font-semibold">
                        {formatTimer(overlays.countdownSeconds)}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => update({ countdownRunning: !overlays.countdownRunning })}
                        className="flex-1 h-8 text-xs cursor-pointer"
                      >
                        {overlays.countdownRunning ? (
                          <>
                            <Pause className="mr-1 size-3.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 size-3.5" />
                            Start
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => update({ countdownSeconds: 300, countdownRunning: false })}
                        className="h-8 px-2.5 text-xs cursor-pointer"
                        title="Reset to 5:00"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: BANNERS & TICKERS */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <OverlaySwitch
              label="Lower-Third Banner"
              description="Headline & subtitle bar"
              checked={overlays.showLowerThird}
              onChange={(val) => update({ showLowerThird: val })}
            />

            {overlays.showLowerThird ? (
              <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Headline</Label>
                  <Input
                    value={overlays.lowerThirdTitle}
                    maxLength={60}
                    onChange={(e) => update({ lowerThirdTitle: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Subtitle</Label>
                  <Input
                    value={overlays.lowerThirdSubtitle}
                    maxLength={80}
                    onChange={(e) => update({ lowerThirdSubtitle: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Style</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LOWER_THIRD_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => update({ lowerThirdStyle: st.id })}
                        className={`rounded-md border px-2 py-1.5 text-xs font-medium transition cursor-pointer ${
                          overlays.lowerThirdStyle === st.id
                            ? 'border-white bg-white text-black'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Alignment</Label>
                  <SegmentedButtons
                    cols={3}
                    options={ALIGN_OPTIONS}
                    value={overlays.lowerThirdAlign}
                    onChange={(val) => update({ lowerThirdAlign: val })}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <OverlaySwitch
              label="Scrolling Ticker"
              description="Continuous marquee announcement bar"
              checked={overlays.showTicker}
              onChange={(val) => update({ showTicker: val })}
            />

            {overlays.showTicker ? (
              <div className="space-y-2.5 rounded-lg border border-border bg-background/40 p-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ticker Text</Label>
                  <Input
                    value={overlays.tickerText}
                    maxLength={160}
                    onChange={(e) => update({ tickerText: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Position</Label>
                    <SegmentedButtons
                      cols={2}
                      options={[
                        { id: 'bottom', label: 'Bottom' },
                        { id: 'top', label: 'Top' },
                      ]}
                      value={overlays.tickerPosition}
                      onChange={(val) => update({ tickerPosition: val })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Speed</Label>
                    <SegmentedButtons
                      cols={3}
                      options={[
                        { id: 'slow', label: '1x' },
                        { id: 'normal', label: '2x' },
                        { id: 'fast', label: '3x' },
                      ]}
                      value={overlays.tickerSpeed}
                      onChange={(val) => update({ tickerSpeed: val })}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <OverlaySwitch
              label="CTA / Social Card"
              description="Compact call-to-action pill on stream"
              checked={overlays.showCta}
              onChange={(val) => update({ showCta: val })}
            />

            {overlays.showCta ? (
              <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tag Label</Label>
                  <Input
                    value={overlays.ctaLabel}
                    maxLength={18}
                    onChange={(e) => update({ ctaLabel: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Message / Handle</Label>
                  <Input
                    value={overlays.ctaText}
                    maxLength={48}
                    onChange={(e) => update({ ctaText: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: WIDGETS (LIVE BADGE, CLOCK, PIP) */}
      {activeTab === 'widgets' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <OverlaySwitch
              label="LIVE Status Badge"
              description="Show live indicator on canvas"
              checked={overlays.showLiveBadge}
              onChange={(val) => update({ showLiveBadge: val })}
            />
            {overlays.showLiveBadge ? (
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Badge Label</Label>
                <SegmentedButtons
                  cols={3}
                  options={[
                    { id: 'LIVE', label: 'LIVE' },
                    { id: 'ON AIR', label: 'ON AIR' },
                    { id: 'REC', label: 'REC' },
                  ]}
                  value={overlays.liveBadgeLabel}
                  onChange={(val) => update({ liveBadgeLabel: val })}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <OverlaySwitch
              label="Clock / Timer Widget"
              description="Display stream duration, clock, or countdown"
              checked={overlays.showClockWidget}
              onChange={(val) => update({ showClockWidget: val })}
            />
            {overlays.showClockWidget ? (
              <div className="space-y-2.5 rounded-lg border border-border bg-background/40 p-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mode</Label>
                  <SegmentedButtons
                    cols={3}
                    options={[
                      { id: 'elapsed', label: 'Elapsed' },
                      { id: 'clock', label: 'Clock' },
                      { id: 'countdown', label: 'Timer' },
                    ]}
                    value={overlays.clockMode}
                    onChange={(val) => update({ clockMode: val })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <SegmentedButtons
                    cols={3}
                    options={[
                      { id: 'top-left', label: 'Top L' },
                      { id: 'top-right', label: 'Top R' },
                      { id: 'bottom-right', label: 'Bot R' },
                    ]}
                    value={overlays.clockPosition}
                    onChange={(val) => update({ clockPosition: val })}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Camera PIP Settings */}
          <div className="space-y-2.5 rounded-lg border border-border bg-background/60 p-3">
            <p className="text-sm font-medium">Camera Overlay (Screen Layout)</p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Corner</Label>
              <SegmentedButtons
                cols={4}
                options={PIP_POSITIONS}
                value={overlays.pipPosition}
                onChange={(val) => update({ pipPosition: val })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <SegmentedButtons
                cols={3}
                options={PIP_SIZES}
                value={overlays.pipSize}
                onChange={(val) => update({ pipSize: val })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Shape</Label>
              <SegmentedButtons
                cols={3}
                options={PIP_SHAPES}
                value={overlays.pipShape}
                onChange={(val) => update({ pipShape: val })}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOM IMAGE OVERLAYS & VIDEO FILTERS */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Image & Frame Layers</p>
                <p className="text-xs text-muted-foreground">
                  Upload logos or transparent PNG frames
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleUploadImage}
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs cursor-pointer"
              >
                <Upload className="mr-1.5 size-3.5" />
                Upload
              </Button>
            </div>

            {(overlays.imageLayers || []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No image overlays added yet. Upload a PNG logo or full-frame stream border.
              </div>
            ) : (
              <div className="space-y-2.5">
                {overlays.imageLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className="space-y-2.5 rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={layer.dataUrl}
                          alt={layer.name}
                          className="size-7 rounded border border-border object-contain bg-black"
                        />
                        <span className="truncate text-xs font-medium">{layer.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateImageLayer(layer.id, { visible: !layer.visible })}
                          className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          title={layer.visible ? 'Hide layer' : 'Show layer'}
                        >
                          {layer.visible ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImageLayer(layer.id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete layer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {IMAGE_POSITIONS.map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => updateImageLayer(layer.id, { position: pos.id })}
                          className={`rounded border px-1.5 py-1 text-[11px] transition cursor-pointer ${
                            layer.position === pos.id
                              ? 'border-white bg-white text-black'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>

                    {layer.position !== 'full' ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Size</span>
                          <span>{Math.round((layer.scale ?? 0.22) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="65"
                          value={Math.round((layer.scale ?? 0.22) * 100)}
                          onChange={(e) =>
                            updateImageLayer(layer.id, { scale: Number(e.target.value) / 100 })
                          }
                          className="w-full accent-white cursor-pointer"
                        />
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Opacity</span>
                        <span>{Math.round((layer.opacity ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={Math.round((layer.opacity ?? 1) * 100)}
                        onChange={(e) =>
                          updateImageLayer(layer.id, { opacity: Number(e.target.value) / 100 })
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Filter & Stage Background */}
          <div className="space-y-2.5 rounded-lg border border-border bg-background/60 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Camera Color Filter</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {VIDEO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => update({ videoFilter: f.id })}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition cursor-pointer ${
                      overlays.videoFilter === f.id
                        ? 'border-white bg-white text-black'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">Stage Background</Label>
              <SegmentedButtons
                cols={4}
                options={STAGE_BACKGROUNDS}
                value={overlays.stageBackground}
                onChange={(val) => update({ stageBackground: val })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
