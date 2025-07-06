

export default async function toggleCamera ({isCameraEnabled, setIsCameraEnabled, isMicEnabled, videoRef, stream, setStream, animationRef, drawCanvas}) {
        try {
            if (isCameraEnabled) {
                // Stop camera
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    setStream(null);
                }
                setIsCameraEnabled(false);
            } else {
                // Start camera
                const newStream = await navigator.mediaDevices.getUserMedia({
                    audio: isMicEnabled,
                    video: { height: 720, width: 1368 }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                    videoRef.current.onloadedmetadata = async () => {
                        await videoRef.current.play();
                        if (!animationRef.current) {
                            drawCanvas();
                        }
                    }
                }

                setStream(newStream);
                setIsCameraEnabled(true);
            }
        } catch (error) {
            console.error("Camera Error: ", error);
            alert("Failed to access camera. Please check permissions.");
        }
    }