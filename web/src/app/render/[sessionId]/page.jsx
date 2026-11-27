'use client'

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import io from 'socket.io-client'
import useP2PCall from '@/app/hooks/useP2PCall'
import { renderStudioFrame } from '@/components/stream/canvasRenderer'
import { DEFAULT_OVERLAYS } from '@/components/stream/overlayPresets'

function CloudRenderContent() {
  const params = useParams()
  const searchParams = useSearchParams()

  const sessionId = typeof params?.sessionId === 'string' ? params.sessionId : ''
  const roomId = searchParams.get('room') || ''
  const quality = searchParams.get('quality') || '720p30'
  const ticket = searchParams.get('ticket') || ''

  const canvasRef = useRef(null)
  const hostCamRef = useRef(null)
  const hostScreenRef = useRef(null)
  const guestVideoRef = useRef(null)
  const loadedImagesRef = useRef(new Map())
  const animationRef = useRef(null)
  const recorderRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audioDestRef = useRef(null)
  const connectedTrackIdsRef = useRef(new Set())
  const hadHostRef = useRef(false)
  const [hostDisconnected, setHostDisconnected] = useState(false)

  const {
    hostPeer,
    guestPeer,
    hostCamStream,
    hostScreenStream,
    hostAudioStream,
    guestStream,
    studioState,
  } = useP2PCall({
    roomId,
    role: 'compositor',
    name: 'CloudCompositor',
    enabled: Boolean(roomId && ticket),
    initialMediaState: { micEnabled: false, videoEnabled: false, screenSharing: false },
  })

  // Attach incoming WebRTC streams to off-screen <video> elements
  useEffect(() => {
    if (hostCamRef.current) {
      hostCamRef.current.srcObject = hostCamStream || null
      if (hostCamStream) hostCamRef.current.play().catch(() => {})
    }
  }, [hostCamStream])

  useEffect(() => {
    if (hostScreenRef.current) {
      hostScreenRef.current.srcObject = hostScreenStream || null
      if (hostScreenStream) hostScreenRef.current.play().catch(() => {})
    }
  }, [hostScreenStream])

  useEffect(() => {
    if (guestVideoRef.current) {
      guestVideoRef.current.srcObject = guestStream || null
      if (guestStream) guestVideoRef.current.play().catch(() => {})
    }
  }, [guestStream])

  // Track if host disconnected mid-stream so we show a clean BRB/Reconnecting scene
  useEffect(() => {
    if (hostPeer) {
      hadHostRef.current = true
      setHostDisconnected(false)
    } else if (hadHostRef.current) {
      setHostDisconnected(true)
    }
  }, [hostPeer])

  // Preload custom image overlay dataUrls synced via studioState
  useEffect(() => {
    const layers = studioState?.overlays?.imageLayers || []
    const cache = loadedImagesRef.current
    const activeIds = new Set(layers.map((l) => l.id))

    for (const id of cache.keys()) {
      if (!activeIds.has(id)) cache.delete(id)
    }

    for (const layer of layers) {
      if (!cache.has(layer.id) && layer.dataUrl) {
        const img = new window.Image()
        img.src = layer.dataUrl
        cache.set(layer.id, img)
      }
    }
  }, [studioState?.overlays?.imageLayers])

  const attachAudioTracks = useCallback((mediaStream) => {
    const audioCtx = audioCtxRef.current
    const dest = audioDestRef.current
    if (!audioCtx || !dest || !mediaStream) return

    for (const track of mediaStream.getAudioTracks()) {
      if (track.readyState !== 'live') continue
      if (connectedTrackIdsRef.current.has(track.id)) continue
      try {
        const src = audioCtx.createMediaStreamSource(new MediaStream([track]))
        src.connect(dest)
        connectedTrackIdsRef.current.add(track.id)
      } catch {}
    }
  }, [])

  useEffect(() => {
    attachAudioTracks(hostAudioStream)
  }, [hostAudioStream, attachAudioTracks])

  useEffect(() => {
    if (studioState?.isGuestOnStage !== false) {
      attachAudioTracks(guestStream)
    }
  }, [guestStream, studioState?.isGuestOnStage, attachAudioTracks])

  const renderStateRef = useRef({})
  const effectiveOverlays = hostDisconnected
    ? {
        ...(studioState?.overlays || DEFAULT_OVERLAYS),
        sceneMode: 'brb',
        sceneTitle: 'Reconnecting...',
        sceneSubtitle: 'Host connection interrupted — broadcast stays live',
      }
    : studioState?.overlays || DEFAULT_OVERLAYS

  renderStateRef.current = {
    currentLayout: studioState?.currentLayout || 'single',
    isCameraEnabled: studioState?.isCameraEnabled ?? true,
    isCameraMirrored: studioState?.isCameraMirrored ?? false,
    isScreenShareEnabled: studioState?.isScreenShareEnabled ?? false,
    isGuestOnStage: studioState?.isGuestOnStage ?? true,
    remotePeer: guestPeer,
    isStreaming: true,
    elapsedSeconds: studioState?.elapsedSeconds ?? 0,
    hostName: studioState?.hostName || 'Host',
    brand: studioState?.brand || {
      accentColor: '#ffffff',
      frameStyle: 'minimal',
      showWatermark: false,
      watermarkText: 'StreamXT',
      watermarkPosition: 'top-right',
      showNameTag: false,
    },
    overlays: effectiveOverlays,
    pinnedChat: studioState?.pinnedChat || null,
    activePoll: studioState?.activePoll || null,
    showPollOnStream: studioState?.showPollOnStream ?? false,
  }

  // Canvas animation loop inside cloud Chromium
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (canvas) {
        if (canvas.width !== 1280) canvas.width = 1280
        if (canvas.height !== 720) canvas.height = 720
        const ctx = canvas.getContext('2d')
        try {
          renderStudioFrame({
            ctx,
            width: canvas.width,
            height: canvas.height,
            camVideo: hostCamRef.current,
            screenVideo: hostScreenRef.current,
            remoteVideo: guestVideoRef.current,
            state: renderStateRef.current,
            loadedImages: loadedImagesRef.current,
            nowMs: performance.now(),
          })
        } catch {}
      }
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Connect ingest socket and stream canvas + mixed audio into FFmpeg
  useEffect(() => {
    if (!ticket || !canvasRef.current) return

    const baseUrl = process.env.NEXT_PUBLIC_STREAM_SERVER_URL || 'http://localhost:3001'
    const socket = io(baseUrl, {
      auth: { token: ticket, compositor: true },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      socket.emit('stream:start')
    })

    socket.on('stream:ready', () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const fps = quality === '720p60' ? 60 : 30
      const canvasStream = canvas.captureStream(fps)

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx({ sampleRate: 44100 })
      audioCtxRef.current = audioCtx
      const destination = audioCtx.createMediaStreamDestination()
      audioDestRef.current = destination
      connectedTrackIdsRef.current.clear()

      const silentOsc = audioCtx.createOscillator()
      const silentGain = audioCtx.createGain()
      silentGain.gain.value = 0
      silentOsc.connect(silentGain)
      silentGain.connect(destination)
      silentOsc.start()

      attachAudioTracks(hostAudioStream)
      if (studioState?.isGuestOnStage !== false) {
        attachAudioTracks(guestStream)
      }

      destination.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t))

      const mimeType =
        ['video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm'].find((m) =>
          MediaRecorder.isTypeSupported(m),
        ) || ''

      const bitrateMap = {
        '720p30': 2500000,
        '720p60': 4000000,
        '1080p30': 4500000,
      }

      const recorder = new MediaRecorder(canvasStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: bitrateMap[quality] ?? 2500000,
      })
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.connected) {
          socket.emit('stream:data', event.data)
        }
      }

      recorder.start(250)
    })

    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop()
        } catch {}
      }
      audioCtxRef.current?.close().catch(() => {})
      socket.disconnect()
    }
  }, [ticket, quality, attachAudioTracks])

  return (
    <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
      <canvas ref={canvasRef} className="w-[1280px] h-[720px] block" data-session={sessionId} />
      <video ref={hostCamRef} className="hidden" autoPlay muted playsInline />
      <video ref={hostScreenRef} className="hidden" autoPlay muted playsInline />
      <video ref={guestVideoRef} className="hidden" autoPlay muted playsInline />
    </div>
  )
}

export default function CloudRenderPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-black" />}>
      <CloudRenderContent />
    </Suspense>
  )
}
