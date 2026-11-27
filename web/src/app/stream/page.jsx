'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Crop,
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
import CameraCropModal from '@/components/stream/CameraCropModal'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api-client'
import useToggleMic from '../hooks/useToggleMic'
import useToggleScreenShare from '../hooks/useToggleScreenShare'
import useCameraToggle from '../hooks/useCameraToggle'
import useP2PCall from '../hooks/useP2PCall'

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
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const animationRef = useRef(null)
  const loadedImagesRef = useRef(new Map())
  const socketRef = useRef(null)
  const recorderRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audioDestRef = useRef(null)
  const connectedAudioTrackIdsRef = useRef(new Set())
  const streamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)

  const [roomId, setRoomId] = useState('')
  const [isGuestOnStage, setIsGuestOnStage] = useState(true)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [encodingMode, setEncodingMode] = useState('cloud') // 'cloud' | 'browser'
  const [draftEncodingMode, setDraftEncodingMode] = useState('cloud')
  const [streamDestination, setStreamDestination] = useState('youtube')
  const [customRtmpUrl, setCustomRtmpUrl] = useState('')
  const [streamKey, setStreamKey] = useState('')
  const [extraTargets, setExtraTargets] = useState([]) // [{ id, rtmpUrl, streamKey, label }]
  const [draftExtraTargets, setDraftExtraTargets] = useState([])
  const [streamTitle, setStreamTitle] = useState('StreamXT Live')
  const [streamWatchUrl, setStreamWatchUrl] = useState('')
  const [streamBroadcastId, setStreamBroadcastId] = useState('')
  const [ytConnected, setYtConnected] = useState(false)
  const [ytLiveChatId, setYtLiveChatId] = useState(null)
  const [chatSending, setChatSending] = useState(false)
  const [pollBusy, setPollBusy] = useState(false)
  const ytPageTokenRef = useRef(null)
  const seenChatIdsRef = useRef(new Set(['welcome-1']))
  const [streamQuality, setStreamQuality] = useState('720p30')
  const [streamStats, setStreamStats] = useState(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [draftStreamKey, setDraftStreamKey] = useState('')
  const [draftRtmpUrl, setDraftRtmpUrl] = useState('')
  const [draftDestination, setDraftDestination] = useState('youtube')
  const [draftQuality, setDraftQuality] = useState('720p30')

  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isCameraMirrored, setIsCameraMirrored] = useState(false)
  const [cameraCrop, setCameraCrop] = useState({ zoom: 1, panX: 0, panY: 0, fit: 'cover' })
  const [showCropModal, setShowCropModal] = useState(false)
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

  const {
    connectionState: p2pState,
    remotePeer,
    remoteStream,
    roomChatMessages,
    roomPoll,
    p2pError,
    syncLocalTracks,
    emitMediaState,
    emitStudioState,
    sendRoomChat,
    createRoomPoll,
    voteRoomPoll,
    endRoomPoll,
  } = useP2PCall({
    roomId,
    role: 'host',
    name: hostName,
    enabled: Boolean(roomId),
    initialMediaState: {
      micEnabled: isMicEnabled,
      videoEnabled: isCameraEnabled,
      screenSharing: isScreenShareEnabled,
    },
  })

  // Initialize roomId in URL (?room=...) so invite link stays stable across reloads
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let currentRoom = params.get('room')
    if (!currentRoom) {
      currentRoom = crypto.randomUUID().slice(0, 8)
      params.set('room', currentRoom)
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }
    setRoomId(currentRoom)
  }, [])

  // Attach guest remote video/audio & auto-switch to duo when guest connects
  useEffect(() => {
    remoteStreamRef.current = remoteStream
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null
      if (remoteStream) {
        remoteVideoRef.current.play().catch(() => {})
      }
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null
      if (remoteStream) {
        remoteAudioRef.current.play().catch(() => {})
      }
    }
  }, [remoteStream])

  useEffect(() => {
    if (remotePeer) {
      setIsGuestOnStage(true)
      setCurrentLayout((prev) => (prev === 'single' ? 'duo' : prev))
      toast(`${remotePeer.name} joined backstage`, { theme: 'dark' })
    } else {
      setCurrentLayout((prev) => (prev === 'duo' || prev === 'guest' ? 'single' : prev))
    }
  }, [remotePeer?.peerId])

  useEffect(() => {
    if (p2pError) {
      toast.error(p2pError, { theme: 'dark' })
    }
  }, [p2pError])

  // Merge P2P room chat messages into the unified Studio chat feed
  useEffect(() => {
    if (!roomChatMessages?.length) return
    setChatMessages((prev) => {
      const next = [...prev]
      let changed = false
      for (const msg of roomChatMessages) {
        if (!msg?.id || seenChatIdsRef.current.has(msg.id)) continue
        seenChatIdsRef.current.add(msg.id)
        next.push(msg)
        changed = true
      }
      return changed ? next.slice(-150) : prev
    })
  }, [roomChatMessages])

  // Sync P2P room poll updates (including guest votes) into activePoll
  useEffect(() => {
    if (!roomPoll) {
      setActivePoll((prev) => (prev && prev.source !== 'youtube' ? null : prev))
      return
    }
    setActivePoll(roomPoll)
  }, [roomPoll])

  // Resolve YouTube liveChatId for real YouTube chat & poll sync
  useEffect(() => {
    if (!user || streamDestination !== 'youtube') {
      setYtConnected(false)
      setYtLiveChatId(null)
      return
    }

    let cancelled = false
    const checkSession = async () => {
      try {
        const qs = streamBroadcastId
          ? `?broadcastId=${encodeURIComponent(streamBroadcastId)}`
          : ''
        const res = await apiFetch(`/api/v1/youtube/chat/session${qs}`)
        if (cancelled) return
        setYtConnected(Boolean(res?.connected))
        if (res?.liveChatId) {
          setYtLiveChatId((prev) => {
            if (prev !== res.liveChatId) {
              ytPageTokenRef.current = null
            }
            return res.liveChatId
          })
        } else {
          setYtLiveChatId(null)
        }
      } catch {
        if (!cancelled) {
          setYtConnected(false)
          setYtLiveChatId(null)
        }
      }
    }

    checkSession()
    const timer = setInterval(checkSession, isStreaming ? 12000 : 25000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [user, streamDestination, streamBroadcastId, isStreaming])

  // Poll YouTube Live Chat messages & live poll tallies using YouTube's pollingIntervalMillis
  useEffect(() => {
    if (!ytLiveChatId) return

    let cancelled = false
    let timerId = null

    const pollChat = async () => {
      let nextDelay = 5000
      try {
        const params = new URLSearchParams({ liveChatId: ytLiveChatId })
        if (ytPageTokenRef.current) {
          params.set('pageToken', ytPageTokenRef.current)
        }
        const res = await apiFetch(`/api/v1/youtube/chat/messages?${params.toString()}`)
        if (cancelled) return

        if (res?.nextPageToken) {
          ytPageTokenRef.current = res.nextPageToken
        }
        if (typeof res?.pollingIntervalMillis === 'number') {
          nextDelay = res.pollingIntervalMillis
        }

        if (Array.isArray(res?.messages) && res.messages.length > 0) {
          setChatMessages((prev) => {
            const next = [...prev]
            let changed = false
            for (const m of res.messages) {
              if (!m?.id || seenChatIdsRef.current.has(m.id)) continue
              seenChatIdsRef.current.add(m.id)
              const timeStr = m.publishedAt
                ? new Date(m.publishedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Now'
              next.push({
                id: m.id,
                author: m.author,
                text: m.text,
                time: timeStr,
                source: 'youtube',
                isOwner: m.isOwner,
                isModerator: m.isModerator,
              })
              changed = true
            }
            return changed ? next.slice(-150) : prev
          })
        }

        if (res?.pollUpdate) {
          setActivePoll(res.pollUpdate)
          if (res.pollUpdate.status === 'active') {
            createRoomPoll(res.pollUpdate)
          }
        }
      } catch (err) {
        console.warn('YouTube chat poll warning:', err?.message || err)
        nextDelay = 10000
      } finally {
        if (!cancelled) {
          timerId = setTimeout(pollChat, nextDelay)
        }
      }
    }

    pollChat()

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
    }
  }, [ytLiveChatId, createRoomPoll])

  // Sync host local audio + camera + screen tracks to guest and cloud compositor over WebRTC
  useEffect(() => {
    const audioTrack =
      stream?.getAudioTracks().find((t) => t.readyState === 'live') || null
    const camTrack = isCameraEnabled
      ? stream?.getVideoTracks().find((t) => t.readyState === 'live') || null
      : null
    const screenTrack = isScreenShareEnabled
      ? screenStream?.getVideoTracks().find((t) => t.readyState === 'live') || null
      : null

    void syncLocalTracks({
      audioTrack,
      videoTrack: camTrack || screenTrack,
      screenTrack,
    })
    emitMediaState({
      micEnabled: isMicEnabled,
      videoEnabled: isCameraEnabled || isScreenShareEnabled,
      screenSharing: isScreenShareEnabled,
    })
  }, [
    stream,
    screenStream,
    isMicEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    syncLocalTracks,
    emitMediaState,
  ])

  // Broadcast Studio overlays, brand, polls, layout & chat state to the cloud compositor
  useEffect(() => {
    if (!roomId) return
    emitStudioState({
      currentLayout,
      isCameraEnabled,
      isCameraMirrored,
      cameraCrop,
      isScreenShareEnabled,
      isGuestOnStage,
      hostName,
      brand,
      overlays,
      pinnedChat,
      activePoll,
      showPollOnStream,
      elapsedSeconds,
    })
  }, [
    roomId,
    currentLayout,
    isCameraEnabled,
    isCameraMirrored,
    cameraCrop,
    isScreenShareEnabled,
    isGuestOnStage,
    hostName,
    brand,
    overlays,
    pinnedChat,
    activePoll,
    showPollOnStream,
    elapsedSeconds,
    emitStudioState,
  ])

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
    cameraCrop,
    isScreenShareEnabled,
    isGuestOnStage,
    remotePeer,
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
        remoteVideo: remoteVideoRef.current,
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
        audio: true,
        video: { height: 720, width: 1280 },
      })

      newStream.getAudioTracks().forEach((track) => {
        track.enabled = isMicEnabled
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

      // Fallback: try acquiring microphone audio even if camera failed
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioOnly.getAudioTracks().forEach((track) => {
          track.enabled = isMicEnabled
        })
        setStream(audioOnly)
      } catch {}
    }
  }

  const cleanupBroadcastResources = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {}
    }
    recorderRef.current = null
    audioDestRef.current = null
    connectedAudioTrackIdsRef.current.clear()

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

  const attachAudioTracksToMixer = useCallback((mediaStream) => {
    const audioCtx = audioCtxRef.current
    const destination = audioDestRef.current
    if (!audioCtx || !destination || !mediaStream) return

    for (const track of mediaStream.getAudioTracks()) {
      if (track.readyState !== 'live') continue
      if (connectedAudioTrackIdsRef.current.has(track.id)) continue
      try {
        const source = audioCtx.createMediaStreamSource(new MediaStream([track]))
        source.connect(destination)
        connectedAudioTrackIdsRef.current.add(track.id)
      } catch (err) {
        console.warn('Failed to attach audio track to mixer:', err)
      }
    }
  }, [])

  useEffect(() => {
    streamRef.current = stream
    if (isStreaming) {
      attachAudioTracksToMixer(stream)
    }
  }, [stream, isStreaming, attachAudioTracksToMixer])

  useEffect(() => {
    screenStreamRef.current = screenStream
    if (isStreaming && currentLayout === 'screen') {
      attachAudioTracksToMixer(screenStream)
    }
  }, [screenStream, currentLayout, isStreaming, attachAudioTracksToMixer])

  useEffect(() => {
    if (isStreaming && isGuestOnStage && remoteStream) {
      attachAudioTracksToMixer(remoteStream)
    }
  }, [remoteStream, isGuestOnStage, isStreaming, attachAudioTracksToMixer])

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
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    audioCtxRef.current = audioCtx
    const destination = audioCtx.createMediaStreamDestination()
    audioDestRef.current = destination
    connectedAudioTrackIdsRef.current.clear()

    // Keep an active silent audio bed so RTMP/YouTube never rejects a video-only stream
    const silentOsc = audioCtx.createOscillator()
    const silentGain = audioCtx.createGain()
    silentGain.gain.value = 0
    silentOsc.connect(silentGain)
    silentGain.connect(destination)
    silentOsc.start()

    attachAudioTracksToMixer(streamRef.current)
    if (currentLayout === 'screen') {
      attachAudioTracksToMixer(screenStreamRef.current)
    }
    if (isGuestOnStage) {
      attachAudioTracksToMixer(remoteStreamRef.current)
    }

    destination.stream.getAudioTracks().forEach((track) => {
      canvasStream.addTrack(track)
    })

    return canvasStream
  }

  const startStreaming = async () => {
    if (isConnecting || isStreaming) return

    const primaryValid =
      Boolean(streamKey) &&
      (streamDestination === 'youtube' || /^rtmps?:\/\/.+/i.test(customRtmpUrl))
    const validExtraTargets = extraTargets.filter(
      (t) => t.streamKey?.trim() && /^rtmps?:\/\/.+/i.test(t.rtmpUrl || ''),
    )

    if (!primaryValid && validExtraTargets.length === 0) {
      toast('Add a stream key first', { theme: 'dark' })
      setDraftStreamKey('')
      setDraftDestination(streamDestination)
      setDraftRtmpUrl(customRtmpUrl)
      setDraftQuality(streamQuality)
      setDraftEncodingMode(encodingMode)
      setDraftExtraTargets(extraTargets)
      setShowKeyModal(true)
      return
    }

    const targets = [
      ...(primaryValid
        ? [
            {
              destination: streamDestination,
              streamKey,
              ...(streamDestination === 'custom_rtmp' ? { rtmpUrl: customRtmpUrl } : {}),
              label: streamDestination === 'youtube' ? 'YouTube' : 'Custom RTMP',
            },
          ]
        : []),
      ...validExtraTargets.map((t) => ({
        destination: 'custom_rtmp',
        streamKey: t.streamKey.trim(),
        rtmpUrl: t.rtmpUrl.trim(),
        label: t.label || 'Multistream RTMP',
      })),
    ]

    const canvas = canvasRef.current
    if (!canvas) return

    setIsConnecting(true)

    try {
      const session = await apiFetch('/api/v1/streams/sessions', {
        method: 'POST',
        body: {
          targets,
          mode: encodingMode,
          roomId,
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
        if (encodingMode === 'cloud') {
          newSocket.emit('stream:start-cloud', {
            roomId,
            studioState: studioStateRef.current,
          })
        } else {
          newSocket.emit('stream:start')
        }
      })

      newSocket.on('stream:ready', () => {
        if (encodingMode === 'cloud') {
          // Headless cloud compositor handles canvas rendering & MediaRecorder
          setElapsedSeconds(0)
          setIsConnecting(false)
          setIsStreaming(true)
          toast.success(
            `Cloud broadcast started (${targets.length} ${
              targets.length === 1 ? 'target' : 'targets'
            })!`,
            { theme: 'dark' },
          )
          return
        }

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
    const storedWatchUrl = parsedTarget?.watchUrl || ''
    const storedBroadcastId = parsedTarget?.broadcastId || ''

    let parsedExtra = []
    try {
      const rawExtras = sessionStorage.getItem('StreamExtraTargets')
      if (rawExtras) parsedExtra = JSON.parse(rawExtras)
    } catch {}

    setStreamKey(storedKey)
    setDraftStreamKey(storedKey)
    setStreamDestination(storedDestination)
    setDraftDestination(storedDestination)
    setCustomRtmpUrl(storedRtmp)
    setDraftRtmpUrl(storedRtmp)
    setExtraTargets(Array.isArray(parsedExtra) ? parsedExtra : [])
    setDraftExtraTargets(Array.isArray(parsedExtra) ? parsedExtra : [])
    setStreamTitle(storedTitle)
    setStreamWatchUrl(storedWatchUrl)
    setStreamBroadcastId(storedBroadcastId)

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
    setEncodingMode(draftEncodingMode)
    setExtraTargets(draftExtraTargets)
    sessionStorage.setItem('StreamExtraTargets', JSON.stringify(draftExtraTargets))

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
    if (!roomId) return
    const inviteUrl = `${window.location.origin}/guest/${roomId}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast('Guest invite link copied!', { theme: 'dark' })
    } catch {
      toast(`Share this guest link: ${inviteUrl}`, { theme: 'dark' })
    }
  }

  const handleSendChat = async (text) => {
    const clean = text.trim()
    if (!clean) return false

    if (ytLiveChatId) {
      setChatSending(true)
      try {
        const res = await apiFetch('/api/v1/youtube/chat/messages', {
          method: 'POST',
          body: { liveChatId: ytLiveChatId, message: clean },
        })
        const sent = res?.message
        if (sent?.id && !seenChatIdsRef.current.has(sent.id)) {
          seenChatIdsRef.current.add(sent.id)
          const timeStr = sent.publishedAt
            ? new Date(sent.publishedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Now'
          setChatMessages((prev) => [
            ...prev.slice(-149),
            {
              id: sent.id,
              author: sent.author,
              text: sent.text,
              time: timeStr,
              source: 'youtube',
              isOwner: sent.isOwner,
              isModerator: sent.isModerator,
            },
          ])
        }
        return true
      } catch (err) {
        toast.error(err?.message || 'Could not send YouTube chat message', { theme: 'dark' })
        return false
      } finally {
        setChatSending(false)
      }
    }

    if (sendRoomChat(clean)) {
      return true
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const localMsg = {
      id: `local-${Date.now()}`,
      author: hostName,
      text: clean,
      time,
      source: 'room',
    }
    seenChatIdsRef.current.add(localMsg.id)
    setChatMessages((prev) => [...prev.slice(-149), localMsg])
    return true
  }

  const handleCreatePoll = async (newPoll) => {
    if (ytLiveChatId) {
      setPollBusy(true)
      try {
        const res = await apiFetch('/api/v1/youtube/polls', {
          method: 'POST',
          body: {
            liveChatId: ytLiveChatId,
            question: newPoll.question,
            options: newPoll.options.map((o) => o.label),
          },
        })
        const ytPoll = res?.poll
        if (ytPoll) {
          setActivePoll(ytPoll)
          setShowPollOnStream(true)
          createRoomPoll(ytPoll)
          toast.success('YouTube live poll launched!', { theme: 'dark' })
          return true
        }
      } catch (err) {
        toast.info(
          err?.message
            ? `${err.message}. Launched as Room Poll instead.`
            : 'Launched as Room Poll.',
          { theme: 'dark' },
        )
      } finally {
        setPollBusy(false)
      }
    }

    const roomPollObj = { ...newPoll, source: 'room' }
    setActivePoll(roomPollObj)
    setShowPollOnStream(true)
    createRoomPoll(roomPollObj)
    return true
  }

  const handleVotePoll = (optionId) => {
    if (!activePoll || activePoll.source === 'youtube') return
    if (voteRoomPoll(optionId)) return
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

  const handleEndPoll = async () => {
    if (activePoll?.source === 'youtube' && activePoll?.id) {
      setPollBusy(true)
      try {
        await apiFetch(`/api/v1/youtube/polls/${encodeURIComponent(activePoll.id)}/close`, {
          method: 'POST',
        })
      } catch (err) {
        console.warn('Could not close YouTube poll remotely:', err?.message || err)
      } finally {
        setPollBusy(false)
      }
    }
    endRoomPoll()
    setActivePoll(null)
    setShowPollOnStream(false)
  }

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${figtree.className}`}>
      <Navbar
        isStreaming={isStreaming}
        watchUrl={streamWatchUrl}
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

            {/* Guest Backstage Tile */}
            <audio ref={remoteAudioRef} autoPlay />
            {remotePeer ? (
              <div
                className={`mt-4 box border-4 rounded relative overflow-hidden ${
                  isGuestOnStage ? 'border-green-400' : 'border-neutral-600'
                }`}
              >
                <video
                  ref={remoteVideoRef}
                  className={`w-full aspect-video object-cover bg-black ${
                    remotePeer.videoEnabled || remotePeer.screenSharing ? 'block' : 'hidden'
                  }`}
                  autoPlay
                  muted
                  playsInline
                />
                {!remotePeer.videoEnabled && !remotePeer.screenSharing ? (
                  <div className="w-full aspect-video bg-neutral-900 flex items-center justify-center text-xs text-neutral-400">
                    Audio Only ({p2pState})
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsGuestOnStage((prev) => !prev)}
                  className={`absolute top-0 left-0 px-2 rounded-br py-0.5 text-xs font-medium text-white cursor-pointer ${
                    isGuestOnStage ? 'bg-green-400' : 'bg-neutral-700'
                  }`}
                >
                  {isGuestOnStage ? 'On-stage' : 'Backstage'}
                </button>

                <div className="absolute bottom-1.5 left-2 flex gap-1.5 items-center bg-black/50 px-2 py-0.5 rounded">
                  {remotePeer.micEnabled ? (
                    <Mic size={16} className="font-semibold" />
                  ) : (
                    <MicOff size={16} className="font-semibold text-red-500" />
                  )}
                  <p className="text-sm">{remotePeer.name}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Click + above to copy guest P2P invite link
              </div>
            )}
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

            {remotePeer ? (
              <div
                className={`flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer ${
                  currentLayout === 'guest' ? 'border-white' : 'border-[#2d2d2d]'
                }`}
                onClick={() => selectLayout('guest')}
                title="Guest fullscreen layout"
              >
                <div
                  className={`icon border w-8 h-6 flex items-center justify-center text-[9px] font-bold ${
                    currentLayout === 'guest'
                      ? 'border-white bg-white text-black'
                      : 'border-[#2d2d2d] bg-[#2d2d2d] text-neutral-300'
                  }`}
                >
                  G
                </div>
              </div>
            ) : null}
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
                className={`rounded-[100%] h-10 w-10 cursor-pointer ${
                  cameraCrop.zoom > 1 || cameraCrop.fit === 'contain' ? 'border-white' : ''
                }`}
                variant="outline"
                title="Crop & frame camera"
                onClick={() => setShowCropModal(true)}
              >
                <Crop />
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
                  setDraftEncodingMode(encodingMode)
                  setDraftExtraTargets(extraTargets)
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
                    seenChatIdsRef.current.clear()
                    setChatMessages([])
                    setPinnedChatId(null)
                  }}
                  youtubeChatStatus={
                    ytLiveChatId ? 'connected' : ytConnected ? 'inactive' : 'idle'
                  }
                  isSending={chatSending}
                />
              ) : null}

              {activePanel === 'polls' ? (
                <PollsPanel
                  poll={activePoll}
                  showPollOnStream={showPollOnStream}
                  onCreatePoll={handleCreatePoll}
                  onVoteOption={handleVotePoll}
                  onToggleShowOnStream={setShowPollOnStream}
                  onEndPoll={handleEndPoll}
                  youtubeConnected={Boolean(ytLiveChatId)}
                  isBusy={pollBusy}
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
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
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
                <Label className="text-xs text-muted-foreground">Encoding Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cloud', label: 'Cloud Compositor' },
                    { id: 'browser', label: 'Browser Local' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDraftEncodingMode(m.id)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer ${
                        draftEncodingMode === m.id
                          ? 'border-white bg-white text-black'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cloud mode offloads canvas compositing, encoding, and multistreaming to the server.
                </p>
              </div>

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

              {/* Extra Multistream RTMP Targets */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Multistream Destinations ({draftExtraTargets.length})
                  </Label>
                  {draftExtraTargets.length < 4 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftExtraTargets((prev) => [
                          ...prev,
                          { id: `t-${Date.now()}`, label: '', rtmpUrl: '', streamKey: '' },
                        ])
                      }
                      className="text-xs font-medium text-foreground hover:underline cursor-pointer"
                    >
                      + Add RTMP
                    </button>
                  ) : null}
                </div>

                {draftExtraTargets.map((target, idx) => (
                  <div
                    key={target.id}
                    className="space-y-2 rounded-lg border border-border bg-background/50 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={target.label}
                        onChange={(e) =>
                          setDraftExtraTargets((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, label: e.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Label (e.g. Twitch)"
                        className="h-7 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraftExtraTargets((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <Input
                      value={target.rtmpUrl}
                      onChange={(e) =>
                        setDraftExtraTargets((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, rtmpUrl: e.target.value } : item,
                          ),
                        )
                      }
                      placeholder="rtmp://live.twitch.tv/app"
                      className="h-7 text-xs"
                    />
                    <Input
                      type="password"
                      value={target.streamKey}
                      onChange={(e) =>
                        setDraftExtraTargets((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, streamKey: e.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Stream key"
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
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

      {showCropModal ? (
        <CameraCropModal
          stream={stream}
          isMirrored={isCameraMirrored}
          currentLayout={currentLayout}
          overlays={overlays}
          crop={cameraCrop}
          onChange={setCameraCrop}
          onClose={() => setShowCropModal(false)}
        />
      ) : null}

      <ToastContainer />
    </div>
  )
}
