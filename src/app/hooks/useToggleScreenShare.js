import { useCallback } from "react";


export default async function useToggleScreenShare({isScreenShareEnabled,screenStream, setScreenStream, setIsScreenShareEnabled,setCurrentLayout, isCameraEnabled, screenVideoRef, animationRef, drawCanvas   }){

    const toggleScreenShare = useCallback(async()=>{

         try {
                    if (isScreenShareEnabled) {
                        // Stop screen share
                        if (screenStream) {
                            screenStream.getTracks().forEach(track => track.stop());
                            setScreenStream(null);
                        }
                        setIsScreenShareEnabled(false);
                        setCurrentLayout(isCameraEnabled ? 'single' : 'single');
                    } else {
                        // Start screen share
                        const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
                            video: { width: 1368, height: 720 },
                            audio: true
                        });
        
                        if (screenVideoRef.current) {
                            screenVideoRef.current.srcObject = newScreenStream;
                            screenVideoRef.current.onloadedmetadata = async () => {
                                await screenVideoRef.current.play();
                                if (!animationRef.current) {
                                    drawCanvas();
                                }
                            }
                        }
        
                        // Handle screen share end event
                        newScreenStream.getVideoTracks()[0].addEventListener('ended', () => {
                            setIsScreenShareEnabled(false);
                            setScreenStream(null);
                            setCurrentLayout(isCameraEnabled ? 'single' : 'single');
                        });
        
                        setScreenStream(newScreenStream);
                        setIsScreenShareEnabled(true);
                        setCurrentLayout('screen');
                    }
                } catch (error) {
                    console.error("Screen Share Error: ", error);
                    toast('Failed to share screen', {
                        theme: 'dark'
                    })
                    setCurrentLayout('single')
                }

    })

}