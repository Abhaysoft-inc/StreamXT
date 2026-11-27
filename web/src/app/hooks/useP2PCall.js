'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export default function useP2PCall({
  roomId,
  role,
  name,
  enabled = true,
  initialMediaState = { micEnabled: true, videoEnabled: true, screenSharing: false },
}) {
  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const audioSenderRef = useRef(null)
  const videoSenderRef = useRef(null)
  const remotePeerIdRef = useRef(null)
  const pendingIceRef = useRef([])
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null })
  const mediaStateRef = useRef(initialMediaState)

  const [remotePeer, setRemotePeer] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState('idle')
  const [p2pError, setP2pError] = useState('')

  const cleanupPeerConnection = useCallback(() => {
    pendingIceRef.current = []
    remotePeerIdRef.current = null
    audioSenderRef.current = null
    videoSenderRef.current = null

    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null
        pcRef.current.ontrack = null
        pcRef.current.onconnectionstatechange = null
        pcRef.current.close()
      } catch {}
      pcRef.current = null
    }

    setRemoteStream(null)
  }, [])

  const applyLocalTracksToSenders = useCallback(async () => {
    const { audioTrack, videoTrack } = localTracksRef.current
    try {
      if (audioSenderRef.current) {
        await audioSenderRef.current.replaceTrack(audioTrack || null)
      }
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(videoTrack || null)
      }
    } catch (err) {
      console.warn('replaceTrack failed:', err)
    }
  }, [])

  const createPeerConnection = useCallback(
    async (targetPeerId) => {
      cleanupPeerConnection()
      remotePeerIdRef.current = targetPeerId
      setConnectionState('connecting')

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      // Pre-allocate sendrecv transceivers so switching audio-only <-> video <-> screen share requires no SDP renegotiation
      const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
      const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' })
      audioSenderRef.current = audioTransceiver.sender
      videoSenderRef.current = videoTransceiver.sender

      await applyLocalTracksToSenders()

      const inboundStream = new MediaStream()
      pc.ontrack = (event) => {
        const track = event.track
        const alreadyAdded = inboundStream.getTracks().some((t) => t.id === track.id)
        if (!alreadyAdded) {
          inboundStream.addTrack(track)
        }
        // Create a fresh MediaStream wrapper so React hooks detect track additions reliably
        setRemoteStream(new MediaStream(inboundStream.getTracks()))
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && remotePeerIdRef.current) {
          socketRef.current.emit('p2p:ice-candidate', {
            to: remotePeerIdRef.current,
            candidate: event.candidate,
          })
        }
      }

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState
        if (st === 'connected') setConnectionState('connected')
        else if (st === 'connecting' || st === 'new') setConnectionState('connecting')
        else if (st === 'failed' || st === 'disconnected') setConnectionState(st)
      }

      return pc
    },
    [applyLocalTracksToSenders, cleanupPeerConnection],
  )

  const flushPendingIce = useCallback(async (pc) => {
    while (pendingIceRef.current.length > 0) {
      const candidate = pendingIceRef.current.shift()
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('addIceCandidate error:', err)
      }
    }
  }, [])

  const initiateOfferTo = useCallback(
    async (peer) => {
      try {
        setRemotePeer(peer)
        const pc = await createPeerConnection(peer.peerId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socketRef.current?.emit('p2p:offer', {
          to: peer.peerId,
          sdp: pc.localDescription,
        })
      } catch (err) {
        console.error('Failed to initiate P2P offer:', err)
        setConnectionState('failed')
      }
    },
    [createPeerConnection],
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
      const target = (peers || []).find((p) => p.role !== role)
      if (!target) {
        setRemotePeer(null)
        setConnectionState('waiting')
        return
      }

      setRemotePeer(target)
      // Host always initiates the WebRTC offer to avoid offer glare
      if (role === 'host') {
        await initiateOfferTo(target)
      } else {
        setConnectionState('connecting')
      }
    })

    socket.on('p2p:peer-joined', async (peer) => {
      if (peer.role === role) return
      setRemotePeer(peer)
      if (role === 'host') {
        await initiateOfferTo(peer)
      } else {
        setConnectionState('connecting')
      }
    })

    socket.on('p2p:peer-state', (updatedPeer) => {
      setRemotePeer((prev) =>
        prev && prev.peerId === updatedPeer.peerId ? { ...prev, ...updatedPeer } : prev,
      )
    })

    socket.on('p2p:offer', async ({ from, sdp }) => {
      try {
        const pc = await createPeerConnection(from)
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        await flushPendingIce(pc)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('p2p:answer', {
          to: from,
          sdp: pc.localDescription,
        })
      } catch (err) {
        console.error('Failed to handle P2P offer:', err)
        setConnectionState('failed')
      }
    })

    socket.on('p2p:answer', async ({ sdp }) => {
      const pc = pcRef.current
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        await flushPendingIce(pc)
      } catch (err) {
        console.error('Failed to handle P2P answer:', err)
      }
    })

    socket.on('p2p:ice-candidate', async ({ candidate }) => {
      const pc = pcRef.current
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(candidate)
        return
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('ICE candidate error:', err)
      }
    })

    socket.on('p2p:peer-left', ({ peerId }) => {
      if (remotePeerIdRef.current === peerId || !remotePeerIdRef.current) {
        cleanupPeerConnection()
        setRemotePeer(null)
        setConnectionState('waiting')
      }
    })

    return () => {
      socket.emit('p2p:leave')
      socket.disconnect()
      socketRef.current = null
      cleanupPeerConnection()
      setRemotePeer(null)
      setConnectionState('idle')
    }
  }, [enabled, roomId, role, name, createPeerConnection, flushPendingIce, initiateOfferTo, cleanupPeerConnection])

  const syncLocalTracks = useCallback(
    async ({ audioTrack, videoTrack }) => {
      localTracksRef.current = { audioTrack: audioTrack || null, videoTrack: videoTrack || null }
      await applyLocalTracksToSenders()
    },
    [applyLocalTracksToSenders],
  )

  const emitMediaState = useCallback((patch) => {
    mediaStateRef.current = { ...mediaStateRef.current, ...patch }
    socketRef.current?.emit('p2p:peer-state', patch)
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('p2p:leave')
    socketRef.current?.disconnect()
    socketRef.current = null
    cleanupPeerConnection()
    setRemotePeer(null)
    setConnectionState('idle')
  }, [cleanupPeerConnection])

  return {
    connectionState,
    remotePeer,
    remoteStream,
    p2pError,
    syncLocalTracks,
    emitMediaState,
    leaveRoom,
  }
}
