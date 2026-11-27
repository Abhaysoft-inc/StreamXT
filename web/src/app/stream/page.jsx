'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  MonitorUp,
  Settings,
  UserPlus,
  Video,
  VideoOff,
  X,
} from 'lucide-react'
import { Figtree } from 'next/font/google'
import io from 'socket.io-client'
import { ToastContainer, toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navbar from '@/components/stream/Navbar'
import Toolbar from '@/components/stream/Toolbar'
import BrandPanel from '@/components/stream/panels/BrandPanel'
import ChatPanel from '@/components/stream/panels/ChatPanel'
import PollsPanel from '@/components/stream/panels/PollsPanel'
import OverlaysPanel from '@/components/stream/panels/OverlaysPanel'
import { DEFAULT_OVERLAYS } from '@/components/stream/overlayPresets'
import { renderStudioFrame } from '@/components/stream/canvasRenderer'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api-client'
import useToggleMic from '../hooks/useToggleMic'
import useToggleScreenShare from '../hooks/useToggleScreenShare'
import useCameraToggle from '../hooks/useCameraToggle'

const figtree = Figtree({
  subsets: ['latin'],
})

const PANEL_TITLES = {
  brand: 'Brand',
  chat: 'Chat',
  polls: 'Polls',
  overlays: 'Overlays',
}

export default function StreamPage() {
  const { user } = useAuth()
  const hostName = user?.username || user?.name || 'Host'

  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const screenVideoRef = useRef(null)
  const animationRef = useRef(null)
  const loadedImagesRef = useRef(new Map())
  const socketRef = useRef(null)
  const recorderRef = useRef(null)
  const audioCtxRef = useRef(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [streamDestination, setStreamDestination] = useState('youtube')
  const [customRtmpUrl, setCustomRtmpUrl] = useState('')
  const [streamKey, setStreamKey] = useState('')
  const [streamTitle, setStreamTitle] = useState('StreamXT Live')
  const [streamQuality, setStreamQuality] = useState('720p30')
  const [streamStats, setStreamStats] = useState(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [draftStreamKey, setDraftStreamKey] = useState('')
  const [draftRtmpUrl, setDraftRtmpUrl] = useState('')
  const [draftDestination, setDraftDestination] = useState('youtube')
  const [draftQuality, setDraftQuality] = useState('720p30')

  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isCameraMirrored, setIsCameraMirrored] = useState(false)
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [currentLayout, setCurrentLayout] = useState('single')
  const [stream, setStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)

  const [activePanel, setActivePanel] = useState(null)

  const [brand, setBrand] = useState({
    accentColor: '#ffffff',
    frameStyle: 'minimal',
    showWatermark: false,
    watermarkText: 'StreamXT',
    watermarkPosition: 'top-right',
    showNameTag: false,
  })

  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS)

  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-1',
      author: 'StreamXT',
      text: 'Welcome to the stream! Pin any message to display it on stage.',
      time: 'Now',
    },
  ])
  const [pinnedChatId, setPinnedChatId] = useState(null)

  const [activePoll, setActivePoll] = useState(null)
  const [showPollOnStream, setShowPollOnStream] = useState(false)

  const pinnedChat = chatMessages.find((m) => m.id === pinnedChatId) || null

  // Preload uploaded image layers into Image cache for 60fps canvas rendering
  useEffect(() => {
    const cache = loadedImagesRef.current
    const activeIds = new Set((overlays.imageLayers || []).map((l) => l.id))

    for (const id of cache.keys()) {
      if (!activeIds.has(id)) {
        cache.delete(id)
      }
    }

    for (const layer of overlays.imageLayers || []) {
      if (!cache.has(layer.id)) {
        const img = new window.Image()
        img.src = layer.dataUrl
        cache.set(layer.id, img)
      }
    }
  }, [overlays.imageLayers])

  // Stream elapsed timer
  useEffect(() => {
    if (!isStreaming) return
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isStreaming])

  // Scene / widget countdown timer
  useEffect(() => {
    if (!overlays.countdownRunning) return
    const timer = setInterval(() => {
      setOverlays((prev) => {
        if (prev.countdownSeconds <= 1) {
          return { ...prev, countdownSeconds: 0, countdownRunning: false }
        }
        return { ...prev, countdownSeconds: prev.countdownSeconds - 1 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [overlays.countdownRunning])

  const studioStateRef = useRef({})
  studioStateRef.current = {
    currentLayout,
    isCameraEnabled,
    isCameraMirrored,
    isScreenShareEnabled,
    isStreaming,
    elapsedSeconds,
    hostName,
    brand,
    overlays,
    pinnedChat,
    activePoll,
    showPollOnStream,
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (canvas.width !== 1280) canvas.width = 1280
    if (canvas.height !== 720) canvas.height = 720

    try {
      renderStudioFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        camVideo: videoRef.current,
        screenVideo: screenVideoRef.current,
        state: studioStateRef.current,
        loadedImages: loadedImagesRef.current,
        nowMs: performance.now(),
      })
    } catch (error) {
      console.error('Canvas drawing error:', error)
    }

    animationRef.current = requestAnimationFrame(drawCanvas)
  }, [])

  const toggleCamera = useCameraToggle({
    isCameraEnabled,
    setIsCameraEnabled,
    isMicEnabled,
    videoRef,
    stream,
    setStream,
    animationRef,
    drawCanvas,
  })

  const toggleScreenShare = useToggleScreenShare({
    isScreenShareEnabled,
    screenStream,
    setScreenStream,
    setIsScreenShareEnabled,
    setCurrentLayout,
    isCameraEnabled,
    screenVideoRef,
    animationRef,
    drawCanvas,
  })

  const toggleMic = useToggleMic({ stream, setIsMicEnabled })

  const selectLayout = async (layout) => {
    setCurrentLayout(layout)
    if (layout === 'screen' && !isScreenShareEnabled) {
      await toggleScreenShare()
    }
  }

  const initializeCamera = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: isMicEnabled,
        video: { height: 720, width: 1280 },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current.play()
          drawCanvas()
        }
      }

      setStream(newStream)
    } catch (error) {
      console.error('Failed to initialize camera:', error)
      setIsCameraEnabled(false)
      drawCanvas()
    }
  }

  const cleanupBroadcastResources = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {}
    }
    recorderRef.current = null

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setIsConnecting(false)
    setIsStreaming(false)
    setStreamStats(null)
  }, [])

  const pickSupportedMimeType = () => {
    const candidates = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
    ]
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
  }

  const buildMixedMediaStream = (canvas) => {
    const fps = streamQuality === '720p60' ? 60 : 30
    const canvasStream = canvas.captureStream(fps)

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const audioCtx = new AudioCtx({ sampleRate: 44100 })
    audioCtxRef.current = audioCtx
    const destination = audioCtx.createMediaStreamDestination()

    // Keep an active silent audio bed so RTMP/YouTube never rejects a video-only stream
    const silentOsc = audioCtx.createOscillator()
    const silentGain = audioCtx.createGain()
    silentGain.gain.value = 0
    silentOsc.connect(silentGain)
    silentGain.connect(destination)
    silentOsc.start()

    const attachAudioFromStream = (mediaStream) => {
      if (!mediaStream) return
      const audioTracks = mediaStream.getAudioTracks()
      if (audioTracks.length > 0) {
        const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks))
        source.connect(destination)
      }
    }

    attachAudioFromStream(stream)
    if (currentLayout === 'screen') {
      attachAudioFromStream(screenStream)
    }

    destination.stream.getAudioTracks().forEach((track) => {
      canvasStream.addTrack(track)
    })

    return canvasStream
  }

  const startStreaming = async () => {
    if (isConnecting || isStreaming) return

    if (!streamKey) {
      toast('Add a stream key first', { theme: 'dark' })
      setDraftStreamKey('')
      setDraftDestination(streamDestination)
      setDraftRtmpUrl(customRtmpUrl)
      setDraftQuality(streamQuality)
      setShowKeyModal(true)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    setIsConnecting(true)

    try {
      const session = await apiFetch('/api/v1/streams/sessions', {
        method: 'POST',
        body: {
          destination: streamDestination,
          streamKey,
          ...(streamDestination === 'custom_rtmp' ? { rtmpUrl: customRtmpUrl } : {}),
          title: streamTitle,
          quality: streamQuality,
        },
      })

      const newSocket = io(session.ingestUrl, {
        auth: { token: session.ticket },
        transports: ['websocket'],
      })
      socketRef.current = newSocket

      newSocket.on('connect', () => {
        newSocket.emit('stream:start')
      })

      newSocket.on('stream:ready', () => {
        try {
          const mixedStream = buildMixedMediaStream(canvas)
          const mimeType = pickSupportedMimeType()
          const bitrateMap = {
            '720p30': 2500000,
            '720p60': 4000000,
            '1080p30': 4500000,
          }
          const recorder = new MediaRecorder(mixedStream, {
            ...(mimeType ? { mimeType } : {}),
            videoBitsPerSecond: bitrateMap[streamQuality] ?? 2500000,
          })
          recorderRef.current = recorder

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && newSocket.connected) {
              newSocket.emit('stream:data', event.data)
            }
          }

          recorder.start(250)
          setElapsedSeconds(0)
          setIsConnecting(false)
          setIsStreaming(true)
          toast.success('Broadcast started!', { theme: 'dark' })
        } catch (err) {
          console.error('MediaRecorder start failed:', err)
          toast.error('Failed to start browser media encoder', { theme: 'dark' })
          cleanupBroadcastResources()
        }
      })

      newSocket.on('stream:stats', (stats) => {
        setStreamStats(stats)
      })

      newSocket.on('stream:error', (payload) => {
        toast.error(payload?.message || 'Streaming error occurred', { theme: 'dark' })
        cleanupBroadcastResources()
      })

      newSocket.on('connect_error', (err) => {
        toast.error(err?.message || 'Unable to reach stream ingest server', { theme: 'dark' })
        cleanupBroadcastResources()
      })
    } catch (err) {
      toast.error(err?.message || 'Could not initialize stream session', { theme: 'dark' })
      cleanupBroadcastResources()
    }
  }

  const stopStreaming = () => {
    const recorder = recorderRef.current
    const activeSocket = socketRef.current

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        activeSocket?.emit('stream:stop')
        setTimeout(() => {
          cleanupBroadcastResources()
          window.location.href = '/dashboard'
        }, 200)
      }
      recorder.stop()
      return
    }

    activeSocket?.emit('stream:stop')
    cleanupBroadcastResources()
    window.location.href = '/dashboard'
  }

  useEffect(() => {
    let parsedTarget = null
    try {
      const raw = sessionStorage.getItem('StreamTarget')
      if (raw) parsedTarget = JSON.parse(raw)
    } catch {}

    const storedKey = parsedTarget?.streamKey || sessionStorage.getItem('YTStreamKey') || ''
    const storedDestination = parsedTarget?.destination || 'youtube'
    const storedRtmp = parsedTarget?.rtmpUrl || ''
    const storedTitle = parsedTarget?.title || 'StreamXT Live'

    setStreamKey(storedKey)
    setDraftStreamKey(storedKey)
    setStreamDestination(storedDestination)
    setDraftDestination(storedDestination)
    setCustomRtmpUrl(storedRtmp)
    setDraftRtmpUrl(storedRtmp)
    setStreamTitle(storedTitle)

    initializeCamera()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      cleanupBroadcastResources()
    }
  }, [cleanupBroadcastResources])

  useEffect(() => {
    if (!animationRef.current) {
      drawCanvas()
    }
  }, [currentLayout, isCameraEnabled, isScreenShareEnabled, drawCanvas])

  const handleSaveStreamKey = (e) => {
    e.preventDefault()
    const trimmed = draftStreamKey.trim()
    const trimmedRtmp = draftRtmpUrl.trim()

    setStreamDestination(draftDestination)
    setCustomRtmpUrl(trimmedRtmp)
    setStreamQuality(draftQuality)

    if (!trimmed) {
      sessionStorage.removeItem('YTStreamKey')
      sessionStorage.removeItem('StreamTarget')
      setStreamKey('')
      setShowKeyModal(false)
      return
    }

    sessionStorage.setItem('YTStreamKey', trimmed)
    sessionStorage.setItem(
      'StreamTarget',
      JSON.stringify({
        destination: draftDestination,
        rtmpUrl: trimmedRtmp,
        streamKey: trimmed,
        title: streamTitle,
      }),
    )
    setStreamKey(trimmed)
    setShowKeyModal(false)
    toast('Settings saved', { theme: 'dark' })
  }

  const handleInviteGuest = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Invite link copied!', { theme: 'dark' })
    } catch {
      toast('Copy failed — share this URL manually', { theme: 'dark' })
    }
  }

  const handleSendChat = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setChatMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, author: hostName, text, time },
    ])
  }

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${figtree.className}`}>
      <Navbar
        isStreaming={isStreaming}
        onStartStreaming={startStreaming}
        onStopStreaming={stopStreaming}
      />

      <div className="mainscreen flex flex-1 flex-col lg:flex-row px-4 sm:px-6 py-5 gap-6">
        {/* Left Backstage Sidebar */}
        <div className="sidebar w-full lg:w-[240px] shrink-0">
          <div className="flex justify-between items-center">
            <p className="text-lg">Backstage</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleInviteGuest}
              title="Copy invite link"
              className="rounded-full bg-transparent h-10 w-10 cursor-pointer"
            >
              <UserPlus />
            </Button>
          </div>

          <div className="mt-6">
            <div
              className={
                isCameraEnabled
                  ? 'box border-4 rounded border-green-400 relative overflow-hidden'
                  : 'box border-4 rounded border-red-400 relative overflow-hidden'
              }
            >
              <video
                ref={videoRef}
                className={`w-full aspect-video object-cover ${
                  isCameraMirrored ? '-scale-x-100' : ''
                }`}
                autoPlay
                muted
                playsInline
              />

              <div
                className={
                  isCameraEnabled
                    ? 'absolute top-0 left-0 bg-green-400 px-2 rounded-br py-0.5'
                    : 'hidden'
                }
              >
                <p className="text-xs font-medium text-white">On-stage</p>
              </div>

              <div className="absolute bottom-1.5 left-2 flex gap-1.5 items-center bg-black/50 px-2 py-0.5 rounded">
                {isMicEnabled ? (
                  <Mic size={16} className="font-semibold" />
                ) : (
                  <MicOff size={16} className="font-semibold text-red-500" />
                )}
                <p className="text-sm">{hostName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Main Stage */}
        <div className="viewbar flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="canvas rounded-2xl w-full max-w-[820px]">
            <canvas className="rounded-2xl w-full h-auto block" ref={canvasRef} />
            <video ref={screenVideoRef} className="hidden" autoPlay muted playsInline />
          </div>

          {/* Layout Selection */}
          <div className="mt-4 layoutselection flex justify-center gap-2">
            <div
              className={`options-single flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer ${
                currentLayout === 'single' ? 'border-white' : 'border-[#2d2d2d]'
              }`}
              onClick={() => selectLayout('single')}
              title="Single layout"
            >
              <div
                className={`icon border w-8 h-6 ${
                  currentLayout === 'single'
                    ? 'border-white bg-white'
                    : 'border-[#2d2d2d] bg-[#2d2d2d]'
                }`}
              />
            </div>

            <div
              className={`options-duo flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer ${
                currentLayout === 'duo' ? 'border-white' : 'border-[#2d2d2d]'
              }`}
              onClick={() => selectLayout('duo')}
              title="Duo layout"
            >
              <div
                className={`icon border w-4 h-6 ${
                  currentLayout === 'duo'
                    ? 'border-white bg-white'
                    : 'border-[#2d2d2d] bg-[#2d2d2d]'
                }`}
              />
              <div
                className={`icon border w-4 h-6 ${
                  currentLayout === 'duo'
                    ? 'border-white bg-white'
                    : 'border-[#2d2d2d] bg-[#2d2d2d]'
                }`}
              />
            </div>

            <div
              className={`options-screen flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer relative ${
                currentLayout === 'screen' ? 'border-white' : 'border-[#2d2d2d]'
              }`}
              onClick={() => selectLayout('screen')}
              title="Screen share layout"
            >
              <div
                className={`icon border w-8 h-6 relative ${
                  currentLayout === 'screen'
                    ? 'border-white bg-white'
                    : 'border-[#2d2d2d] bg-[#2d2d2d]'
                }`}
              >
                <div
                  className={`absolute w-3.5 h-2.5 top-1 right-1 border border-[#171717] ${
                    currentLayout === 'screen' ? 'bg-white' : 'bg-[#2d2d2d]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex justify-center">
            <div className="controls flex gap-2">
              <Button
                type="button"
                className={`rounded-[100%] h-10 w-10 cursor-pointer ${
                  !isMicEnabled ? 'bg-red-500 hover:bg-red-600' : ''
                }`}
                variant="outline"
                onClick={toggleMic}
              >
                {isMicEnabled ? <Mic /> : <MicOff />}
              </Button>

              <Button
                type="button"
                className={`rounded-[100%] h-10 w-10 cursor-pointer ${
                  !isCameraEnabled ? 'bg-red-500 hover:bg-red-600' : ''
                }`}
                variant="outline"
                onClick={toggleCamera}
              >
                {isCameraEnabled ? <Video /> : <VideoOff />}
              </Button>

              <Button
                type="button"
                className={`rounded-[100%] h-10 w-10 cursor-pointer ${
                  isScreenShareEnabled ? 'bg-blue-500 hover:bg-blue-600' : ''
                }`}
                variant="outline"
                onClick={toggleScreenShare}
              >
                <MonitorUp />
              </Button>

              <Button
                type="button"
                className="rounded-[100%] h-10 w-10 cursor-pointer"
                variant="outline"
                onClick={() => {
                  setDraftStreamKey(streamKey)
                  setDraftDestination(streamDestination)
                  setDraftRtmpUrl(customRtmpUrl)
                  setDraftQuality(streamQuality)
                  setShowKeyModal(true)
                }}
              >
                <Settings />
              </Button>
            </div>
          </div>

          {isStreaming && streamStats ? (
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              {streamStats.fps} fps · {streamStats.bitrateKbps} kbps · {streamStats.health}
            </p>
          ) : null}
        </div>

        {/* Collapsible Panel for Brand / Chat / Polls / Overlays */}
        {activePanel ? (
          <div
            className={`w-full shrink-0 rounded-xl border border-border bg-card flex flex-col max-h-[580px] ${
              activePanel === 'overlays' ? 'lg:w-[360px]' : 'lg:w-[320px]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">{PANEL_TITLES[activePanel]}</h2>
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => setActivePanel(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activePanel === 'brand' ? (
                <BrandPanel brand={brand} onChange={setBrand} />
              ) : null}

              {activePanel === 'chat' ? (
                <ChatPanel
                  messages={chatMessages}
                  pinnedMessageId={pinnedChatId}
                  onSendMessage={handleSendChat}
                  onTogglePin={(id) => setPinnedChatId((prev) => (prev === id ? null : id))}
                  onClearMessages={() => {
                    setChatMessages([])
                    setPinnedChatId(null)
                  }}
                />
              ) : null}

              {activePanel === 'polls' ? (
                <PollsPanel
                  poll={activePoll}
                  showPollOnStream={showPollOnStream}
                  onCreatePoll={(newPoll) => {
                    setActivePoll(newPoll)
                    setShowPollOnStream(true)
                  }}
                  onVoteOption={(optionId) =>
                    setActivePoll((prev) =>
                      prev
                        ? {
                            ...prev,
                            options: prev.options.map((opt) =>
                              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
                            ),
                          }
                        : prev,
                    )
                  }
                  onToggleShowOnStream={setShowPollOnStream}
                  onEndPoll={() => {
                    setActivePoll(null)
                    setShowPollOnStream(false)
                  }}
                />
              ) : null}

              {activePanel === 'overlays' ? (
                <OverlaysPanel overlays={overlays} onChange={setOverlays} />
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Right Toolbar */}
        <Toolbar activePanel={activePanel} onSelectPanel={setActivePanel} />
      </div>

      {/* Stream Key Settings Modal */}
      {showKeyModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowKeyModal(false)}
        >
          <form
            onSubmit={handleSaveStreamKey}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Studio Settings</h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 p-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Mirror Flip Camera</p>
                  <p className="text-xs text-muted-foreground">
                    Horizontally flip your camera feed on backstage and stage
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isCameraMirrored}
                  onChange={(e) => setIsCameraMirrored(e.target.checked)}
                  className="size-4 rounded border-border accent-white cursor-pointer"
                />
              </label>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Stream Quality</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '720p30', label: '720p 30fps' },
                    { id: '1080p30', label: '1080p 30fps' },
                    { id: '720p60', label: '720p 60fps' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setDraftQuality(q.id)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer ${
                        draftQuality === q.id
                          ? 'border-white bg-white text-black'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Destination</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'youtube', label: 'YouTube' },
                    { id: 'custom_rtmp', label: 'Custom RTMP' },
                  ].map((dest) => (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => setDraftDestination(dest.id)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer ${
                        draftDestination === dest.id
                          ? 'border-white bg-white text-black'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {dest.label}
                    </button>
                  ))}
                </div>
              </div>

              {draftDestination === 'custom_rtmp' ? (
                <div className="space-y-2">
                  <Label htmlFor="studio-rtmp-url" className="text-xs text-muted-foreground">
                    RTMP Server URL
                  </Label>
                  <Input
                    id="studio-rtmp-url"
                    type="text"
                    value={draftRtmpUrl}
                    onChange={(e) => setDraftRtmpUrl(e.target.value)}
                    placeholder="rtmp://your-server-url/live"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="studio-stream-key" className="text-xs text-muted-foreground">
                  {draftDestination === 'youtube' ? 'YouTube Stream Key' : 'Stream Key'}
                </Label>
                <Input
                  id="studio-stream-key"
                  type="password"
                  value={draftStreamKey}
                  onChange={(e) => setDraftStreamKey(e.target.value)}
                  placeholder="Paste your stream key"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowKeyModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer">
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <ToastContainer />
    </div>
  )
}
