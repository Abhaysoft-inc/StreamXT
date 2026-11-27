function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function formatClockSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hrs = Math.floor(safe / 3600)
  const mins = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  const pad = (n) => String(n).padStart(2, '0')
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`
}

function getCssVideoFilter(filterId) {
  switch (filterId) {
    case 'warm':
      return 'sepia(0.22) saturate(1.18) brightness(1.03)'
    case 'cool':
      return 'hue-rotate(12deg) saturate(0.95) contrast(1.06)'
    case 'bw':
      return 'grayscale(1) contrast(1.12)'
    case 'contrast':
      return 'contrast(1.22) saturate(1.1)'
    default:
      return 'none'
  }
}

function drawStageBackground(ctx, width, height, mode, accent) {
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, width, height)

  if (mode === 'grid') {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += 48) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()
  } else if (mode === 'stripes') {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'
    ctx.lineWidth = 14
    for (let x = -height; x < width + height; x += 56) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + height, height)
      ctx.stroke()
    }
    ctx.restore()
  } else if (mode === 'glow') {
    ctx.save()
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      40,
      width * 0.5,
      height * 0.5,
      width * 0.65,
    )
    grad.addColorStop(0, 'rgba(255,255,255,0.10)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.03)')
    grad.addColorStop(1, 'rgba(9,9,11,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.2
    ctx.lineWidth = 2
    ctx.strokeRect(18, 18, width - 36, height - 36)
    ctx.restore()
  }
}

function getPipDimensions(pipSize, pipShape, width) {
  const ratios = { sm: 0.2, md: 0.26, lg: 0.33 }
  const w = Math.round(width * (ratios[pipSize] ?? 0.26))
  const h = pipShape === 'circle' ? w : Math.round((w * 9) / 16)
  return { w, h }
}

function getPipCoords(pipPosition, width, height, pipW, pipH, topOffset, bottomOffset) {
  const margin = 20
  if (pipPosition === 'top-left') {
    return { x: margin, y: margin + topOffset }
  }
  if (pipPosition === 'top-right') {
    return { x: width - pipW - margin, y: margin + topOffset }
  }
  if (pipPosition === 'bottom-left') {
    return { x: margin, y: height - pipH - margin - bottomOffset }
  }
  return { x: width - pipW - margin, y: height - pipH - margin - bottomOffset }
}

function drawLowerThird(ctx, width, height, overlays, accent, bottomOffset) {
  const title = overlays.lowerThirdTitle?.trim() || ''
  const subtitle = overlays.lowerThirdSubtitle?.trim() || ''
  if (!title && !subtitle) return

  const style = overlays.lowerThirdStyle || 'modern'
  const align = overlays.lowerThirdAlign || 'left'

  ctx.save()
  ctx.font = '700 22px sans-serif'
  const titleW = ctx.measureText(title).width
  ctx.font = '500 15px sans-serif'
  const subW = ctx.measureText(subtitle).width
  const boxW = Math.min(Math.max(titleW, subW) + 56, width - 48)
  const boxH = subtitle ? 76 : 48

  let boxX = 24
  if (align === 'center') boxX = (width - boxW) / 2
  if (align === 'right') boxX = width - boxW - 24
  const boxY = height - bottomOffset - boxH - 18

  if (style === 'minimal') {
    ctx.fillStyle = 'rgba(9, 9, 11, 0.72)'
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillRect(boxX, boxY + boxH - 3, boxW, 3)
  } else if (style === 'glass') {
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 14)
    ctx.fillStyle = 'rgba(24, 24, 27, 0.68)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  } else if (style === 'block') {
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8)
    ctx.fillStyle = accent
    ctx.fill()
  } else if (style === 'broadcast') {
    ctx.fillStyle = 'rgba(9, 9, 11, 0.92)'
    ctx.fillRect(boxX, boxY, boxW, boxH)
    ctx.fillStyle = accent
    ctx.fillRect(boxX, boxY, 8, boxH)
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fillRect(boxX + 8, boxY, boxW - 8, 2)
  } else {
    // 'modern'
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.86)'
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillRect(boxX, boxY, 6, boxH)
  }

  const isLightBlock = style === 'block' && accent.toLowerCase() === '#ffffff'
  const titleColor = isLightBlock ? '#09090b' : '#ffffff'
  const subColor = isLightBlock ? '#27272a' : '#d4d4d8'

  ctx.fillStyle = titleColor
  ctx.font = '700 22px sans-serif'
  ctx.textBaseline = 'top'
  ctx.textAlign = align === 'center' ? 'center' : 'left'
  const textX = align === 'center' ? boxX + boxW / 2 : boxX + 20
  ctx.fillText(title, textX, boxY + 12)

  if (subtitle) {
    ctx.fillStyle = subColor
    ctx.font = '500 15px sans-serif'
    ctx.fillText(subtitle, textX, boxY + 44)
  }
  ctx.restore()
}

function drawCustomImageLayers(ctx, width, height, imageLayers, loadedImages) {
  if (!Array.isArray(imageLayers) || imageLayers.length === 0) return

  for (const layer of imageLayers) {
    if (!layer.visible) continue
    const img = loadedImages?.get(layer.id)
    if (!img || !img.complete || img.naturalWidth === 0) continue

    ctx.save()
    ctx.globalAlpha = Math.max(0.05, Math.min(1, layer.opacity ?? 1))

    if (layer.position === 'full') {
      ctx.drawImage(img, 0, 0, width, height)
      ctx.restore()
      continue
    }

    const scale = Math.max(0.08, Math.min(1, layer.scale ?? 0.2))
    const targetW = width * scale
    const aspect = img.naturalHeight / img.naturalWidth
    const targetH = targetW * aspect
    const margin = 24

    let x = margin
    let y = margin
    if (layer.position === 'top-right') {
      x = width - targetW - margin
      y = margin
    } else if (layer.position === 'bottom-left') {
      x = margin
      y = height - targetH - margin
    } else if (layer.position === 'bottom-right') {
      x = width - targetW - margin
      y = height - targetH - margin
    } else if (layer.position === 'center') {
      x = (width - targetW) / 2
      y = (height - targetH) / 2
    }

    ctx.drawImage(img, x, y, targetW, targetH)
    ctx.restore()
  }
}

function drawSceneOverlay(ctx, width, height, overlays, accent) {
  if (!overlays.sceneMode || overlays.sceneMode === 'none') return

  ctx.save()
  ctx.fillStyle = `rgba(9, 9, 11, ${overlays.sceneDimOpacity ?? 0.85})`
  ctx.fillRect(0, 0, width, height)

  // Subtle decorative border
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, 40, 40, width - 80, height - 80, 24)
  ctx.stroke()

  // Center card
  const cardW = 680
  const cardH = overlays.sceneMode === 'starting' ? 250 : 190
  const cardX = (width - cardW) / 2
  const cardY = (height - cardH) / 2

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20)
  ctx.fillStyle = 'rgba(24, 24, 27, 0.92)'
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 38px sans-serif'
  ctx.fillText(overlays.sceneTitle || 'Stream Starting Soon', width / 2, cardY + 64)

  if (overlays.sceneSubtitle) {
    ctx.fillStyle = '#a1a1aa'
    ctx.font = '500 20px sans-serif'
    ctx.fillText(overlays.sceneSubtitle, width / 2, cardY + 118)
  }

  if (overlays.sceneMode === 'starting') {
    ctx.fillStyle = accent
    ctx.font = '700 44px monospace'
    ctx.fillText(formatClockSeconds(overlays.countdownSeconds ?? 0), width / 2, cardY + 188)
  }

  ctx.restore()
}

function drawCameraVideo(ctx, camVideo, x, y, w, h, mirrored) {
  if (!mirrored) {
    ctx.drawImage(camVideo, x, y, w, h)
    return
  }

  ctx.save()
  ctx.translate(x + w, y)
  ctx.scale(-1, 1)
  ctx.drawImage(camVideo, 0, 0, w, h)
  ctx.restore()
}

export function renderStudioFrame({
  ctx,
  width,
  height,
  camVideo,
  screenVideo,
  remoteVideo,
  state,
  loadedImages,
  nowMs,
}) {
  const {
    currentLayout,
    isCameraEnabled,
    isCameraMirrored = false,
    isScreenShareEnabled,
    isGuestOnStage = false,
    remotePeer = null,
    isStreaming,
    elapsedSeconds = 0,
    hostName,
    brand,
    overlays,
    pinnedChat,
    activePoll,
    showPollOnStream,
  } = state

  const accent = brand?.accentColor || '#ffffff'
  const tickerHeight = overlays?.showTicker ? 42 : 0
  const tickerTopOffset =
    overlays?.showTicker && overlays.tickerPosition === 'top' ? tickerHeight : 0
  const tickerBottomOffset =
    overlays?.showTicker && overlays.tickerPosition !== 'top' ? tickerHeight : 0

  drawStageBackground(ctx, width, height, overlays?.stageBackground || 'solid', accent)

  const camReady = isCameraEnabled && camVideo && camVideo.readyState >= 2
  const screenReady = isScreenShareEnabled && screenVideo && screenVideo.readyState >= 2
  const remoteVideoActive =
    isGuestOnStage &&
    remotePeer &&
    (remotePeer.videoEnabled || remotePeer.screenSharing) &&
    remoteVideo &&
    remoteVideo.readyState >= 2
  const videoFilter = getCssVideoFilter(overlays?.videoFilter)

  // Main Video Layer
  if (currentLayout === 'guest') {
    if (remoteVideoActive) {
      ctx.drawImage(remoteVideo, 0, 0, width, height)
    } else if (isGuestOnStage && remotePeer) {
      ctx.fillStyle = '#18181b'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#e4e4e7'
      ctx.font = '600 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${remotePeer.name} · Audio Only`, width / 2, height / 2)
    } else {
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '600 26px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Waiting for guest...', width / 2, height / 2)
    }
  } else if (currentLayout === 'screen' && screenReady) {
    ctx.save()
    ctx.filter = videoFilter
    ctx.drawImage(screenVideo, 0, 0, width, height)
    ctx.restore()

    if (camReady) {
      const pipShape = overlays?.pipShape || 'rounded'
      const { w: camW, h: camH } = getPipDimensions(overlays?.pipSize, pipShape, width)
      const { x: camX, y: camY } = getPipCoords(
        overlays?.pipPosition,
        width,
        height,
        camW,
        camH,
        tickerTopOffset,
        tickerBottomOffset,
      )

      ctx.save()
      if (pipShape === 'circle') {
        ctx.beginPath()
        ctx.arc(camX + camW / 2, camY + camH / 2, camW / 2, 0, Math.PI * 2)
      } else {
        drawRoundedRect(ctx, camX, camY, camW, camH, pipShape === 'square' ? 0 : 12)
      }
      ctx.clip()
      ctx.filter = videoFilter
      drawCameraVideo(ctx, camVideo, camX, camY, camW, camH, isCameraMirrored)
      ctx.restore()

      ctx.save()
      if (pipShape === 'circle') {
        ctx.beginPath()
        ctx.arc(camX + camW / 2, camY + camH / 2, camW / 2, 0, Math.PI * 2)
      } else {
        drawRoundedRect(ctx, camX, camY, camW, camH, pipShape === 'square' ? 0 : 12)
      }
      ctx.strokeStyle = accent
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
    }
  } else if (currentLayout === 'duo') {
    const gap = 14
    const paneW = (width - gap * 3) / 2
    const paneH = height - gap * 2 - tickerHeight
    const leftX = gap
    const rightX = gap * 2 + paneW
    const topY = gap + tickerTopOffset

    // Left pane: Host
    ctx.save()
    drawRoundedRect(ctx, leftX, topY, paneW, paneH, 14)
    if (camReady) {
      ctx.clip()
      ctx.filter = videoFilter
      drawCameraVideo(ctx, camVideo, leftX, topY, paneW, paneH, isCameraMirrored)
    } else {
      ctx.fillStyle = '#18181b'
      ctx.fill()
      ctx.strokeStyle = '#27272a'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '600 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${hostName || 'Host'} · Camera off`, leftX + paneW / 2, topY + paneH / 2)
    }
    ctx.restore()

    // Right pane: Guest (video / screen / audio-only / waiting)
    ctx.save()
    drawRoundedRect(ctx, rightX, topY, paneW, paneH, 14)
    if (remoteVideoActive) {
      ctx.clip()
      ctx.drawImage(remoteVideo, rightX, topY, paneW, paneH)
    } else {
      ctx.fillStyle = '#18181b'
      ctx.fill()
      ctx.strokeStyle = '#27272a'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '600 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const guestLabel =
        isGuestOnStage && remotePeer
          ? `${remotePeer.name} · Audio Only`
          : 'Waiting for guest...'
      ctx.fillText(guestLabel, rightX + paneW / 2, topY + paneH / 2)
    }
    ctx.restore()
  } else if (camReady) {
    ctx.save()
    ctx.filter = videoFilter
    drawCameraVideo(ctx, camVideo, 0, 0, width, height, isCameraMirrored)
    ctx.restore()
  } else {
    ctx.fillStyle = '#a1a1aa'
    ctx.font = '600 26px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('No video source active', width / 2, height / 2)
  }

  // Brand Stage Frame
  if (brand?.frameStyle === 'bordered') {
    ctx.save()
    ctx.strokeStyle = accent
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, width - 8, height - 8)
    ctx.restore()
  } else if (brand?.frameStyle === 'rounded') {
    ctx.save()
    drawRoundedRect(ctx, 10, 10, width - 20, height - 20, 20)
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  // Custom Uploaded PNG/Image Layers
  drawCustomImageLayers(ctx, width, height, overlays?.imageLayers, loadedImages)

  // LIVE / ON AIR Badge
  if (overlays?.showLiveBadge) {
    const label = overlays.liveBadgeLabel || 'LIVE'
    const badgeX = 24
    const badgeY = 22 + tickerTopOffset
    const badgeW = label === 'ON AIR' ? 104 : 88

    ctx.save()
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, 34, 8)
    ctx.fillStyle = isStreaming ? 'rgba(220, 38, 38, 0.92)' : 'rgba(24, 24, 27, 0.85)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(badgeX + 18, badgeY + 17, 5, 0, Math.PI * 2)
    ctx.fillStyle = isStreaming ? '#ffffff' : '#ef4444'
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 15px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, badgeX + 32, badgeY + 18)
    ctx.restore()
  }

  // Brand Watermark
  if (brand?.showWatermark && brand.watermarkText?.trim()) {
    const text = brand.watermarkText.trim()
    ctx.save()
    ctx.font = '700 17px sans-serif'
    const textWidth = ctx.measureText(text).width
    const boxW = textWidth + 28
    const boxH = 34
    const x =
      brand.watermarkPosition === 'top-left'
        ? overlays?.showLiveBadge
          ? 136
          : 24
        : width - boxW - 24
    const y = 22 + tickerTopOffset

    drawRoundedRect(ctx, x, y, boxW, boxH, 8)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.76)'
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + boxW / 2, y + boxH / 2 + 1)
    ctx.restore()
  }

  // Clock / Timer Widget
  if (overlays?.showClockWidget) {
    let timeText = ''
    if (overlays.clockMode === 'clock') {
      timeText = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } else if (overlays.clockMode === 'countdown') {
      timeText = formatClockSeconds(overlays.countdownSeconds ?? 0)
    } else {
      timeText = formatClockSeconds(elapsedSeconds)
    }

    ctx.save()
    ctx.font = '700 16px monospace'
    const boxW = ctx.measureText(timeText).width + 26
    const boxH = 34
    let x = width - boxW - 24
    let y = 22 + tickerTopOffset

    if (overlays.clockPosition === 'top-left') {
      x = overlays.showLiveBadge ? 136 : 24
      y = 22 + tickerTopOffset
    } else if (overlays.clockPosition === 'top-right') {
      x = width - boxW - 24
      y = brand?.showWatermark && brand.watermarkPosition === 'top-right' ? 66 + tickerTopOffset : 22 + tickerTopOffset
    } else if (overlays.clockPosition === 'bottom-right') {
      x = width - boxW - 24
      y = height - tickerBottomOffset - boxH - 20
    }

    drawRoundedRect(ctx, x, y, boxW, boxH, 8)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.8)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(timeText, x + boxW / 2, y + boxH / 2 + 1)
    ctx.restore()
  }

  // CTA / Promo Card
  if (overlays?.showCta && (overlays.ctaLabel || overlays.ctaText)) {
    const label = overlays.ctaLabel?.trim() || ''
    const ctaText = overlays.ctaText?.trim() || ''
    ctx.save()
    ctx.font = '700 13px sans-serif'
    const labelW = label ? ctx.measureText(label).width + 20 : 0
    ctx.font = '600 15px sans-serif'
    const bodyW = ctaText ? ctx.measureText(ctaText).width + 24 : 0
    const totalW = labelW + bodyW + 12
    const boxH = 38
    const boxX = width - totalW - 24
    const boxY = height - tickerBottomOffset - boxH - (overlays.showClockWidget && overlays.clockPosition === 'bottom-right' ? 64 : 18)

    drawRoundedRect(ctx, boxX, boxY, totalW, boxH, 8)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.85)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    if (label) {
      drawRoundedRect(ctx, boxX + 4, boxY + 4, labelW, boxH - 8, 6)
      ctx.fillStyle = accent
      ctx.fill()
      ctx.fillStyle = accent.toLowerCase() === '#ffffff' ? '#09090b' : '#ffffff'
      ctx.font = '700 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, boxX + 4 + labelW / 2, boxY + boxH / 2 + 1)
    }

    if (ctaText) {
      ctx.fillStyle = '#f4f4f5'
      ctx.font = '600 15px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(ctaText, boxX + labelW + 16, boxY + boxH / 2 + 1)
    }
    ctx.restore()
  }

  // Host Name Tag
  if (brand?.showNameTag && hostName) {
    ctx.save()
    ctx.font = '600 16px sans-serif'
    const labelWidth = ctx.measureText(hostName).width + 28
    const tagH = 32
    const tagX = 24
    const tagY = height - tickerBottomOffset - (overlays?.showLowerThird ? 110 : 50)

    drawRoundedRect(ctx, tagX, tagY, labelWidth, tagH, 8)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.8)'
    ctx.fill()

    ctx.fillStyle = accent
    ctx.fillRect(tagX, tagY, 5, tagH)

    ctx.fillStyle = '#fafafa'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(hostName, tagX + 14, tagY + tagH / 2 + 1)
    ctx.restore()
  }

  // Lower Third Banner
  if (overlays?.showLowerThird) {
    drawLowerThird(ctx, width, height, overlays, accent, tickerBottomOffset)
  }

  // Pinned Chat Message Card
  if (pinnedChat) {
    const maxW = 460
    const boxH = 82
    const boxX = 24
    const boxY = (overlays?.showLiveBadge ? 72 : 24) + tickerTopOffset
    ctx.save()
    drawRoundedRect(ctx, boxX, boxY, maxW, boxH, 12)
    ctx.fillStyle = 'rgba(17, 17, 20, 0.9)'
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#a1a1aa'
    ctx.font = '700 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${pinnedChat.author} · Chat`, boxX + 16, boxY + 14)

    ctx.fillStyle = '#f4f4f5'
    ctx.font = '500 17px sans-serif'
    const clipped =
      pinnedChat.text.length > 48 ? `${pinnedChat.text.slice(0, 48)}...` : pinnedChat.text
    ctx.fillText(clipped, boxX + 16, boxY + 40)
    ctx.restore()
  }

  // Active Poll Overlay Card
  if (showPollOnStream && activePoll) {
    const cardW = 340
    const rowH = 34
    const cardH = 64 + activePoll.options.length * (rowH + 8)
    const cardX = width - cardW - 24
    const cardY =
      (brand?.showWatermark && brand.watermarkPosition === 'top-right' ? 72 : 24) + tickerTopOffset
    const totalVotes = activePoll.options.reduce((sum, o) => sum + o.votes, 0)

    ctx.save()
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.9)'
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 16px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const qText =
      activePoll.question.length > 34
        ? `${activePoll.question.slice(0, 34)}...`
        : activePoll.question
    ctx.fillText(qText, cardX + 16, cardY + 16)

    activePoll.options.forEach((opt, idx) => {
      const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
      const optY = cardY + 50 + idx * (rowH + 8)
      const optW = cardW - 32

      drawRoundedRect(ctx, cardX + 16, optY, optW, rowH, 8)
      ctx.fillStyle = 'rgba(39, 39, 42, 0.85)'
      ctx.fill()

      if (pct > 0) {
        ctx.save()
        drawRoundedRect(ctx, cardX + 16, optY, (optW * pct) / 100, rowH, 8)
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.4
        ctx.fill()
        ctx.restore()
      }

      ctx.fillStyle = '#f4f4f5'
      ctx.font = '600 14px sans-serif'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillText(opt.label.slice(0, 24), cardX + 28, optY + rowH / 2 + 1)

      ctx.textAlign = 'right'
      ctx.fillText(`${pct}%`, cardX + cardW - 28, optY + rowH / 2 + 1)
    })

    ctx.restore()
  }

  // Scrolling Ticker
  if (overlays?.showTicker && overlays.tickerText?.trim()) {
    const tickerY = overlays.tickerPosition === 'top' ? 0 : height - tickerHeight
    const speedMap = { slow: 50, normal: 90, fast: 150 }
    const pxPerSec = speedMap[overlays.tickerSpeed] ?? 90

    ctx.save()
    ctx.fillStyle = 'rgba(9, 9, 11, 0.92)'
    ctx.fillRect(0, tickerY, width, tickerHeight)
    ctx.fillStyle = accent
    ctx.fillRect(0, overlays.tickerPosition === 'top' ? tickerHeight - 3 : tickerY, width, 3)

    ctx.font = '600 17px sans-serif'
    const text = `   ${overlays.tickerText.trim()}   •   `
    const textW = ctx.measureText(text).width || 300
    const offset = ((nowMs / 1000) * pxPerSec) % textW

    ctx.fillStyle = '#fafafa'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    for (let x = -offset; x < width + textW; x += textW) {
      ctx.fillText(text, x, tickerY + tickerHeight / 2 + 1)
    }
    ctx.restore()
  }

  // Full-Screen Scene Overlay (Starting Soon / BRB / Ending)
  drawSceneOverlay(ctx, width, height, overlays, accent)
}
