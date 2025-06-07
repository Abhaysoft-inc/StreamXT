import { Button } from '@/components/ui/button';
import { CircleX, Mic, MonitorUp, Presentation, UserPlus, Video } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const Studio = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [isCameraEnabled, setisCameraEnabled] = useState(true);
    const [isAudioEnabled, setisAudioEnabled] = useState(true);

    const drawCanvas = () => {
        if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext("2d");

            // Set canvas dimensions to match video
            canvasRef.current.width = 630;
            canvasRef.current.height = 355;

            // Clear previous frame
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Draw video frame
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

            // Request next frame
            animationFrameRef.current = requestAnimationFrame(drawCanvas);
        }
    };

    useEffect(() => {
        const startStream = async () => {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({
                    audio: isAudioEnabled,
                    video: isCameraEnabled,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = cameraStream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                    };
                    videoRef.current.onplay = () => {
                        drawCanvas();
                    };
                }
            } catch (error) {
                console.error('Stream error:', error);
            }
        };

        startStream();

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (videoRef.current?.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [isCameraEnabled, isAudioEnabled]);

    const toggleCamera = () => {
        setisCameraEnabled(prev => !prev);
    };

    const toggleAudio = () => {
        setisAudioEnabled(prev => !prev);
    };

    return (
        <div>
            <div className="flex justify-center mt-10">
                <div className="object-contain shadow-lg rounded">
                    <video
                        ref={videoRef}
                        style={{ display: 'none' }}
                        autoPlay
                        muted
                        playsInline
                    ></video>
                    <canvas
                        ref={canvasRef}
                        className="w-[630px] h-[355px] object-contain rounded"
                    ></canvas>
                </div>
            </div>

            <div className="bottombar flex justify-center mt-30">
                <div className="flex items-center gap-9 bg-gray-900 px-16 py-4 rounded-full text-white">
                    <div className="cursor-pointer">
                        <Mic size={29} onClick={toggleAudio} />
                    </div>
                    <div className="cursor-pointer">
                        <Video size={29} onClick={toggleCamera} />
                    </div>
                    <div className="cursor-pointer">
                        <MonitorUp size={29} />
                    </div>
                    <div className="cursor-pointer">
                        <UserPlus size={29} />
                    </div>
                    <div className="cursor-pointer">
                        <Button className={'cursor-pointer'}>Go Live</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Studio;