import { useCallback } from "react";

export default function useToggleMic({ stream, setIsMicEnabled }) {

    const toggleMic = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        setIsMicEnabled(newState);
      }
    } else {
      // No stream, just flip the state manually
      setIsMicEnabled(prev => !prev);
    }
  }, [stream, setIsMicEnabled]);

  return toggleMic;
  

}