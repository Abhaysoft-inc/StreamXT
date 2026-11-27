'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Headphones,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react'
import { Figtree } from 'next/font/google'
import { ToastContainer, toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useP2PCall from '@/app/hooks/useP2PCall'

const figtree = Figtree({
  subsets: ['latin'],
})

export default function GuestCallPage() {
  const params = useParams()
  const roomId = typeof params?.roomId === 'string' ? params.roomId : ''

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  const [guestName, setGuestName] = useState('')
  const [hasJoined, setHasJoined] = useState(false)

  const [micStream, setMicStream] = useState(null)
  const [camStream, setCamStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)

  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const {
    connectionState,
    remotePeer,
    remoteStream,
    p2pError,
    syncLocalTracks,
    emitMediaState,
    leaveRoom,
  } = useP2PCall({
    roomId,
    role: 'guest',
    name: guestName.trim() || 'Guest',
    enabled: hasJoined && Boolean(roomId),
    initialMediaState: {
      micEnabled: isMicEnabled,
      videoEnabled: isVideoEnabled,
      screenSharing: isScreenSharing,
    },
  })

  // Initialize mic + camera preview on mount
  const initDevices = useCallback(async ({ audioOnly = false } = {}) => {
    try {
      const audioMedia = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(audioMedia)
    } catch (err) {
      console.warn('Mic access denied:', err)
      setIsMicEnabled(false)
    }

    if (!audioOnly) {
      try {
        const videoMedia = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        })
        setCamStream(videoMedia)
        setIsVideoEnabled(true)
      } catch (err) {
        console.warn('Camera access failed, falling back to audio-only:', err)
        setIsVideoEnabled(false)
      }
    } else {
      setIsVideoEnabled(false)
    }
  }, [])

  useEffect(() => {
    initDevices()

    return () => {
      // Cleanup tracks on unmount handled below via refs? Keep clean stop here via state updater isn't needed if stopAll runs on leave
    }
  }, [initDevices])

  // Update local preview video element (shows screen share if active, else camera)
  useEffect(() => {
    const activeVideo = isScreenSharing ? screenStream : isVideoEnabled ? camStream : null
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = activeVideo
      if (activeVideo) {
        localVideoRef.current.play().catch(() => {})
      }
    }
  }, [camStream, screenStream, isVideoEnabled, isScreenSharing, hasJoined])

  // Sync active audio + video tracks to WebRTC P2P senders whenever tracks or modes change
  useEffect(() => {
    if (!hasJoined) return

    const audioTrack =
      micStream?.getAudioTracks().find((t) => t.readyState === 'live') || null
    const activeVideoTrack = isScreenSharing
      ? screenStream?.getVideoTracks().find((t) => t.readyState === 'live') || null
      : isVideoEnabled
        ? camStream?.getVideoTracks().find((t) => t.readyState === 'live') || null
        : null

    void syncLocalTracks({
      audioTrack,
      videoTrack: activeVideoTrack,
    })
  }, [hasJoined, micStream, camStream, screenStream, isVideoEnabled, isScreenSharing, syncLocalTracks])

  // Attach incoming Host video & audio streams
  useEffect(() => {
    if (!remoteStream) {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
      return
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch(() => {})
    }
  }, [remoteStream])

  const handleToggleMic = async () => {
    let activeMic = micStream
    if (!activeMic || activeMic.getAudioTracks().length === 0) {
      try {
        activeMic = await navigator.mediaDevices.getUserMedia({ audio: true })
        setMicStream(activeMic)
        setIsMicEnabled(true)
        emitMediaState({ micEnabled: true })
      } catch {
        toast.error('Microphone permission denied', { theme: 'dark' })
      }
      return
    }

    const next = !isMicEnabled
    activeMic.getAudioTracks().forEach((track) => {
      track.enabled = next
    })
    setIsMicEnabled(next)
    emitMediaState({ micEnabled: next })
  }

  const handleToggleCamera = async () => {
    if (isVideoEnabled) {
      camStream?.getVideoTracks().forEach((t) => t.stop())
      setCamStream(null)
      setIsVideoEnabled(false)
      emitMediaState({ videoEnabled: false })
      return
    }

    try {
      const videoMedia = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      })
      setCamStream(videoMedia)
      setIsVideoEnabled(true)
      emitMediaState({ videoEnabled: true })
    } catch {
      toast.error('Camera permission denied or unavailable', { theme: 'dark' })
    }
  }

  const handleSwitchAudioOnly = () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop())
      setScreenStream(null)
      setIsScreenSharing(false)
    }
    if (isVideoEnabled) {
      camStream?.getVideoTracks().forEach((t) => t.stop())
      setCamStream(null)
      setIsVideoEnabled(false)
    }
    emitMediaState({ videoEnabled: false, screenSharing: false })
    toast('Switched to audio-only mode', { theme: 'dark' })
  }

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop())
      setScreenStream(null)
      setIsScreenSharing(false)
      emitMediaState({ screenSharing: false })
      return
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })

      display.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenStream(null)
        setIsScreenSharing(false)
        emitMediaState({ screenSharing: false })
      })

      setScreenStream(display)
      setIsScreenSharing(true)
      emitMediaState({ screenSharing: true })
    } catch {
      toast('Screen share cancelled', { theme: 'dark' })
    }
  }

  const handleLeave = () => {
    leaveRoom()
    micStream?.getTracks().forEach((t) => t.stop())
    camStream?.getTracks().forEach((t) => t.stop())
    screenStream?.getTracks().forEach((t) => t.stop())
    setMicStream(null)
    setCamStream(null)
    setScreenStream(null)
    setHasJoined(false)
  }

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${figtree.className}`}>
      <header className="border-b border-border px-4 sm:px-8 py-3 flex items-center justify-between">
        <p className="brand text-2xl font-bold flex items-center">
          Stream<span className="text-orange-400 text-3xl">X</span>
          <span className="text-orange-400 text-3xl">T</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {hasJoined
            ? connectionState === 'connected'
              ? `Connected to ${remotePeer?.name || 'Host'}`
              : 'Waiting for host...'
            : 'Guest Green Room'}
        </p>
      </header>

      {!hasJoined ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Join Studio Call</CardTitle>
              <CardDescription>
                Choose video + audio or audio-only before joining the stream.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-border bg-black aspect-video flex items-center justify-center">
                {isVideoEnabled && camStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Headphones className="size-8" />
                    <span className="text-xs">Audio-only mode</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleToggleMic}
                  className={`rounded-full h-10 w-10 cursor-pointer ${
                    !isMicEnabled ? 'bg-red-500 text-white hover:bg-red-600' : ''
                  }`}
                >
                  {isMicEnabled ? <Mic /> : <MicOff />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleToggleCamera}
                  className={`rounded-full h-10 w-10 cursor-pointer ${
                    !isVideoEnabled ? 'bg-red-500 text-white hover:bg-red-600' : ''
                  }`}
                >
                  {isVideoEnabled ? <Video /> : <VideoOff />}
                </Button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!guestName.trim()) {
                    toast('Enter your name to join', { theme: 'dark' })
                    return
                  }
                  setHasJoined(true)
                }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name">Your Display Name</Label>
                  <Input
                    id="guest-name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Alex"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button type="submit" className="w-full cursor-pointer">
                    Join Call
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!guestName.trim()) {
                        toast('Enter your name to join', { theme: 'dark' })
                        return
                      }
                      if (isVideoEnabled) {
                        camStream?.getVideoTracks().forEach((t) => t.stop())
                        setCamStream(null)
                        setIsVideoEnabled(false)
                      }
                      setHasJoined(true)
                    }}
                    className="w-full cursor-pointer"
                  >
                    <Headphones className="mr-1.5 size-4" />
                    Audio Only
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 gap-6">
          {p2pError ? (
            <div className="w-full max-w-3xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {p2pError}
            </div>
          ) : null}

          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {/* Remote Host Feed */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black aspect-video flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover ${
                  remoteStream && remotePeer?.videoEnabled !== false ? 'block' : 'hidden'
                }`}
              />
              {!remoteStream || remotePeer?.videoEnabled === false ? (
                <div className="text-center text-sm text-muted-foreground">
                  {remotePeer
                    ? `${remotePeer.name} (Camera off)`
                    : 'Waiting for host to connect...'}
                </div>
              ) : null}
              <audio ref={remoteAudioRef} autoPlay />
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2.5 py-1 text-xs">
                {remotePeer?.name || 'Host'}
              </div>
            </div>

            {/* Guest Self View */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black aspect-video flex items-center justify-center">
              {isScreenSharing || (isVideoEnabled && camStream) ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${
                    !isScreenSharing ? '-scale-x-100' : ''
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Headphones className="size-8" />
                  <span className="text-xs">Audio Only</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2.5 py-1 text-xs">
                {isMicEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5 text-red-400" />}
                <span>{guestName || 'You'}</span>
              </div>
            </div>
          </div>

          {/* Guest Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleMic}
              title={isMicEnabled ? 'Mute mic' : 'Unmute mic'}
              className={`rounded-full h-10 w-10 cursor-pointer ${
                !isMicEnabled ? 'bg-red-500 text-white hover:bg-red-600' : ''
              }`}
            >
              {isMicEnabled ? <Mic /> : <MicOff />}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleToggleCamera}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              className={`rounded-full h-10 w-10 cursor-pointer ${
                !isVideoEnabled ? 'bg-red-500 text-white hover:bg-red-600' : ''
              }`}
            >
              {isVideoEnabled ? <Video /> : <VideoOff />}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleToggleScreenShare}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              className={`rounded-full h-10 w-10 cursor-pointer ${
                isScreenSharing ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
              }`}
            >
              <MonitorUp />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSwitchAudioOnly}
              title="Audio only mode"
              className="rounded-full h-10 px-4 text-xs cursor-pointer"
            >
              <Headphones className="mr-1.5 size-4" />
              Audio Only
            </Button>

            <Button
              type="button"
              onClick={handleLeave}
              title="Leave call"
              className="rounded-full h-10 px-4 bg-red-600 hover:bg-red-500 text-white cursor-pointer"
            >
              <PhoneOff className="mr-1.5 size-4" />
              Leave
            </Button>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
