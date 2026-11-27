'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function shouldInitiateOffer(selfRole, targetRole) {
  if (selfRole === 'host') return targetRole === 'guest' || targetRole === 'compositor'
  if (selfRole === 'guest') return targetRole === 'compositor'
  return false
}

export default function useP2PCall({
  roomId,
  role,
  name,
  enabled = true,
  initialMediaState = { micEnabled: true, videoEnabled: true, screenSharing: false },
}) {
  const socketRef = useRef(null)
  const peersRef = useRef(new Map()) // peerId -> { peer, pc, audioSender, camSender, screenSender, pendingIce, tracksByMid }
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null, screenTrack: null })
  const mediaStateRef = useRef(initialMediaState)

  const [hostPeer, setHostPeer] = useState(null)
  const [guestPeer, setGuestPeer] = useState(null)
  const [hostCamStream, setHostCamStream] = useState(null)
  const [hostScreenStream, setHostScreenStream] = useState(null)
  const [hostAudioStream, setHostAudioStream] = useState(null)
  const [guestStream, setGuestStream] = useState(null)
  const [studioState, setStudioState] = useState(null)
  const [connectionState, setConnectionState] = useState('idle')
  const [p2pError, setP2pError] = useState('')

  const syncStreamsForPeer = useCallback((entry) => {
    const { peer, tracksByMid } = entry
    const allTracks = Array.from(tracksByMid.values())
    const audioTracks = allTracks.filter((t) => t.kind === 'audio')

    if (peer.role === 'host') {
      const camTrack = tracksByMid.get('1') || allTracks.find((t) => t.kind === 'video')
      const screenTrack = tracksByMid.get('2') || null

      setHostAudioStream(audioTracks.length > 0 ? new MediaStream(audioTracks) : null)
      setHostCamStream(camTrack ? new MediaStream([...audioTracks, camTrack]) : audioTracks.length > 0 ? new MediaStream(audioTracks) : null)
      setHostScreenStream(screenTrack ? new MediaStream([screenTrack]) : null)
    } else if (peer.role === 'guest') {
      setGuestStream(allTracks.length > 0 ? new MediaStream(allTracks) : null)
    }
  }, [])

  const applyLocalTracksToEntry = useCallback(async (entry) => {
    const { audioTrack, videoTrack, screenTrack } = localTracksRef.current
    try {
      if (entry.audioSender) {
        await entry.audioSender.replaceTrack(audioTrack || null)
      }
      if (entry.camSender) {
        await entry.camSender.replaceTrack(videoTrack || null)
      }
      if (entry.screenSender) {
        await entry.screenSender.replaceTrack(screenTrack || null)
      }
    } catch (err) {
      console.warn('replaceTrack error:', err)
    }
  }, [])

  const closePeerEntry = useCallback((peerId) => {
    const entry = peersRef.current.get(peerId)
    if (!entry) return
    peersRef.current.delete(peerId)

    try {
      entry.pc.onicecandidate = null
      entry.pc.ontrack = null
      entry.pc.onconnectionstatechange = null
      entry.pc.close()
    } catch {}

    if (entry.peer.role === 'host') {
      setHostPeer(null)
      setHostCamStream(null)
      setHostScreenStream(null)
      setHostAudioStream(null)
    } else if (entry.peer.role === 'guest') {
      setGuestPeer(null)
      setGuestStream(null)
    }
  }, [])

  const cleanupAllPeers = useCallback(() => {
    for (const peerId of Array.from(peersRef.current.keys())) {
      closePeerEntry(peerId)
    }
  }, [closePeerEntry])

  const createPeerEntry = useCallback(
    async (peer) => {
      closePeerEntry(peer.peerId)

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
      const camTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' })
      // Host allocates an extra video transceiver so cloud compositor gets camera & screen simultaneously
      const screenTransceiver =
        role === 'host' && peer.role === 'compositor'
          ? pc.addTransceiver('video', { direction: 'sendrecv' })
          : null

      const entry = {
        peer,
        pc,
        audioSender: audioTransceiver.sender,
        camSender: camTransceiver.sender,
        screenSender: screenTransceiver?.sender || null,
        pendingIce: [],
        tracksByMid: new Map(),
      }
      peersRef.current.set(peer.peerId, entry)

      await applyLocalTracksToEntry(entry)

      pc.ontrack = (event) => {
        const mid = event.transceiver?.mid ?? `${event.track.kind}-${entry.tracksByMid.size}`
        entry.tracksByMid.set(mid, event.track)
        syncStreamsForPeer(entry)
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('p2p:ice-candidate', {
            to: peer.peerId,
            candidate: event.candidate,
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (peer.role === 'compositor') return
        const st = pc.connectionState
        if (st === 'connected') setConnectionState('connected')
        else if (st === 'connecting' || st === 'new') setConnectionState('connecting')
        else if (st === 'failed' || st === 'disconnected') setConnectionState(st)
      }

      return entry
    },
    [applyLocalTracksToEntry, closePeerEntry, role, syncStreamsForPeer],
  )

  const flushPendingIce = useCallback(async (entry) => {
    while (entry.pendingIce.length > 0) {
      const candidate = entry.pendingIce.shift()
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('addIceCandidate error:', err)
      }
    }
  }, [])

  const initiateOfferTo = useCallback(
    async (peer) => {
      try {
        if (peer.role === 'host') setHostPeer(peer)
        if (peer.role === 'guest') setGuestPeer(peer)
        if (peer.role !== 'compositor') setConnectionState('connecting')

        const entry = await createPeerEntry(peer)
        const offer = await entry.pc.createOffer()
        await entry.pc.setLocalDescription(offer)
        socketRef.current?.emit('p2p:offer', {
          to: peer.peerId,
          sdp: entry.pc.localDescription,
        })
      } catch (err) {
        console.error('Failed to initiate P2P offer:', err)
      }
    },
    [createPeerEntry],
  )

  useEffect(() => {
    if (!enabled || !roomId) {
      setConnectionState('idle')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_STREAM_SERVER_URL || 'http://localhost:3001'
    const socket = io(`${baseUrl}/p2p`, {
      transports: ['websocket'],
    })
    socketRef.current = socket
    setP2pError('')
    setConnectionState('waiting')

    socket.on('connect', () => {
      socket.emit('p2p:join', {
        roomId,
        role,
        name,
        ...mediaStateRef.current,
      })
    })

    socket.on('p2p:error', (payload) => {
      setP2pError(payload?.message || 'P2P room error')
      setConnectionState('failed')
    })

    socket.on('p2p:room-peers', async ({ peers }) => {
      for (const peer of peers || []) {
        if (peer.role === 'host') setHostPeer(peer)
        if (peer.role === 'guest') setGuestPeer(peer)

        if (shouldInitiateOffer(role, peer.role)) {
          await initiateOfferTo(peer)
        } else if (peer.role !== 'compositor') {
          setConnectionState('connecting')
        }
      }
    })

    socket.on('p2p:peer-joined', async (peer) => {
      if (peer.role === role) return
      if (peer.role === 'host') setHostPeer(peer)
      if (peer.role === 'guest') setGuestPeer(peer)

      if (shouldInitiateOffer(role, peer.role)) {
        await initiateOfferTo(peer)
      } else if (peer.role !== 'compositor') {
        setConnectionState('connecting')
      }
    })

    socket.on('p2p:peer-state', (updatedPeer) => {
      const existing = peersRef.current.get(updatedPeer.peerId)
      if (existing) {
        existing.peer = { ...existing.peer, ...updatedPeer }
      }
      if (updatedPeer.role === 'host') {
        setHostPeer((prev) => (prev ? { ...prev, ...updatedPeer } : updatedPeer))
      } else if (updatedPeer.role === 'guest') {
        setGuestPeer((prev) => (prev ? { ...prev, ...updatedPeer } : updatedPeer))
      }
    })

    socket.on('p2p:studio-state', (state) => {
      setStudioState(state)
    })

    socket.on('p2p:offer', async ({ from, sdp }) => {
      try {
        const existing = peersRef.current.get(from)
        const peerObj = existing?.peer || {
          peerId: from,
          role: role === 'compositor' ? (sdp?.sdp?.split('m=video').length > 2 ? 'host' : 'guest') : 'host',
          name: role === 'guest' ? 'Host' : 'Peer',
          micEnabled: true,
          videoEnabled: true,
          screenSharing: false,
        }
        if (peerObj.role === 'host') setHostPeer(peerObj)
        if (peerObj.role === 'guest') setGuestPeer(peerObj)

        const entry = await createPeerEntry(peerObj)
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp))
        await flushPendingIce(entry)
        const answer = await entry.pc.createAnswer()
        await entry.pc.setLocalDescription(answer)
        socket.emit('p2p:answer', {
          to: from,
          sdp: entry.pc.localDescription,
        })
      } catch (err) {
        console.error('Failed to handle P2P offer:', err)
      }
    })

    socket.on('p2p:answer', async ({ from, sdp }) => {
      const entry = peersRef.current.get(from)
      if (!entry) return
      try {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp))
        await flushPendingIce(entry)
      } catch (err) {
        console.error('Failed to handle P2P answer:', err)
      }
    })

    socket.on('p2p:ice-candidate', async ({ from, candidate }) => {
      const entry = peersRef.current.get(from)
      if (!entry) return
      if (!entry.pc.remoteDescription) {
        entry.pendingIce.push(candidate)
        return
      }
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('ICE candidate error:', err)
      }
    })

    socket.on('p2p:peer-left', ({ peerId }) => {
      closePeerEntry(peerId)
      if (role !== 'compositor') {
        setConnectionState('waiting')
      }
    })

    return () => {
      socket.emit('p2p:leave')
      socket.disconnect()
      socketRef.current = null
      cleanupAllPeers()
      setConnectionState('idle')
    }
  }, [
    enabled,
    roomId,
    role,
    name,
    createPeerEntry,
    flushPendingIce,
    initiateOfferTo,
    closePeerEntry,
    cleanupAllPeers,
  ])

  const syncLocalTracks = useCallback(
    async ({ audioTrack, videoTrack, screenTrack = null }) => {
      localTracksRef.current = {
        audioTrack: audioTrack || null,
        videoTrack: videoTrack || null,
        screenTrack: screenTrack || null,
      }
      for (const entry of peersRef.current.values()) {
        await applyLocalTracksToEntry(entry)
      }
    },
    [applyLocalTracksToEntry],
  )

  const emitMediaState = useCallback((patch) => {
    mediaStateRef.current = { ...mediaStateRef.current, ...patch }
    socketRef.current?.emit('p2p:peer-state', patch)
  }, [])

  const emitStudioState = useCallback((state) => {
    socketRef.current?.emit('p2p:studio-state', state)
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('p2p:leave')
    socketRef.current?.disconnect()
    socketRef.current = null
    cleanupAllPeers()
    setConnectionState('idle')
  }, [cleanupAllPeers])

  const remotePeer = role === 'guest' ? hostPeer : guestPeer
  const remoteStream = role === 'guest' ? hostCamStream : guestStream

  return {
    connectionState,
    remotePeer,
    remoteStream,
    hostPeer,
    guestPeer,
    hostCamStream,
    hostScreenStream,
    hostAudioStream,
    guestStream,
    studioState,
    p2pError,
    syncLocalTracks,
    emitMediaState,
    emitStudioState,
    leaveRoom,
  }
}
