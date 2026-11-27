import { useCallback } from 'react'

export default function useToggleMic({ stream, setIsMicEnabled }) {
  const toggleMic = useCallback(() => {
    const audioTracks = stream?.getAudioTracks() || []
    if (audioTracks.length > 0) {
      const nextEnabled = !audioTracks[0].enabled
      audioTracks.forEach((track) => {
        track.enabled = nextEnabled
      })
      setIsMicEnabled(nextEnabled)
      return
    }

    setIsMicEnabled((prev) => !prev)
  }, [stream, setIsMicEnabled])

  return toggleMic
}
