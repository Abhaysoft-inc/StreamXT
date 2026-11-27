import { useCallback } from 'react'

export default function useCameraToggle({
  isCameraEnabled,
  setIsCameraEnabled,
  isMicEnabled,
  videoRef,
  stream,
  setStream,
  animationRef,
  drawCanvas,
}) {
  const toggleCamera = useCallback(async () => {
    try {
      if (isCameraEnabled) {
        // Stop only video tracks so the microphone audio track keeps running
        if (stream) {
          stream.getVideoTracks().forEach((track) => {
            track.stop()
            stream.removeTrack(track)
          })

          const remainingAudio = stream
            .getAudioTracks()
            .filter((track) => track.readyState === 'live')

          if (videoRef.current) {
            videoRef.current.srcObject = null
          }

          setStream(remainingAudio.length > 0 ? new MediaStream(remainingAudio) : null)
        }
        setIsCameraEnabled(false)
      } else {
        const existingAudio =
          stream?.getAudioTracks().filter((track) => track.readyState === 'live') || []

        const needAudio = existingAudio.length === 0
        const camStream = await navigator.mediaDevices.getUserMedia({
          audio: needAudio,
          video: { height: 720, width: 1280 },
        })

        const combinedTracks = [
          ...camStream.getVideoTracks(),
          ...(needAudio ? camStream.getAudioTracks() : existingAudio),
        ]

        combinedTracks
          .filter((track) => track.kind === 'audio')
          .forEach((track) => {
            track.enabled = isMicEnabled
          })

        const nextStream = new MediaStream(combinedTracks)

        if (videoRef.current) {
          videoRef.current.srcObject = nextStream
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play()
            if (!animationRef.current) {
              drawCanvas()
            }
          }
        }

        setStream(nextStream)
        setIsCameraEnabled(true)
      }
    } catch (error) {
      console.error('Camera Error: ', error)
      alert('Failed to access camera. Please check permissions.')
    }
  }, [
    isCameraEnabled,
    setIsCameraEnabled,
    isMicEnabled,
    videoRef,
    stream,
    setStream,
    animationRef,
    drawCanvas,
  ])

  return toggleCamera
}
