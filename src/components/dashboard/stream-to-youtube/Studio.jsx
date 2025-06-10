import { Button } from '@/components/ui/button';
import { CircleX, Mic, MonitorUp, Presentation, UserPlus, Video } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client'

const Studio = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const screenVideoRef = useRef(null);
    const animationFrameRef = useRef(null);
    const ioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [isCameraEnabled, setisCameraEnabled] = useState(true);
    const [isAudioEnabled, setisAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [isChatLive, setisChatLive] = useState(false)


    // Function to start camera 

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                facingMode: 'user',
                video: { width: 1280, height: 720 },

                audio: true,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (error) {
            console.log(error);

        }
    };


    // start screen share

    const startScreenShare = async () => {
        try {
            if (isScreenSharing) {
                // If already sharing, stop it
                if (screenVideoRef.current && screenVideoRef.current.srcObject) {
                    screenVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
                    screenVideoRef.current.srcObject = null;
                }
                setIsScreenSharing(false);
            } else {
                // Start new screen share
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: 1920, height: 1080 },
                    audio: true
                });

                if (screenVideoRef.current) {
                    screenVideoRef.current.srcObject = screenStream;
                    await screenVideoRef.current.play();
                    setIsScreenSharing(true);

                    // Handle screen share end
                    screenStream.getVideoTracks()[0].onended = () => {
                        setIsScreenSharing(false);
                        if (screenVideoRef.current) {
                            screenVideoRef.current.srcObject = null;
                        }
                    };
                }
            }
        } catch (error) {
            console.log(error);
            setIsScreenSharing(false);
        }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const screenVideo = screenVideoRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (isScreenSharing && screenVideo && screenVideo.videoWidth > 0) {
            // Draw screen share as main content
            const screenAspect = screenVideo.videoWidth / screenVideo.videoHeight;
            const canvasAspect = canvasWidth / canvasHeight;

            let drawWidth, drawHeight;
            if (screenAspect > canvasAspect) {
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / screenAspect;
            } else {
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * screenAspect;
            }

            const x = (canvasWidth - drawWidth) / 2;
            const y = (canvasHeight - drawHeight) / 2;

            ctx.drawImage(screenVideo, x, y, drawWidth, drawHeight);

            // Draw camera as picture-in-picture in bottom right
            if (isCameraEnabled && video && video.videoWidth > 0) {
                const pipWidth = 160;
                const pipHeight = 90;
                const pipX = canvasWidth - pipWidth - 20;
                const pipY = canvasHeight - pipHeight - 20;

                // Add border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4);

                ctx.drawImage(video, pipX, pipY, pipWidth, pipHeight);
            }
        } else if (isCameraEnabled && video && video.videoWidth > 0) {
            // Draw camera as main content
            const videoAspect = video.videoWidth / video.videoHeight;
            const canvasAspect = canvasWidth / canvasHeight;

            let drawWidth, drawHeight;
            if (videoAspect > canvasAspect) {
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / videoAspect;
            } else {
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * videoAspect;
            }

            const x = (canvasWidth - drawWidth) / 2;
            const y = (canvasHeight - drawHeight) / 2;

            ctx.drawImage(video, x, y, drawWidth, drawHeight);
        }

        animationFrameRef.current = requestAnimationFrame(drawCanvas);

    }

    const startStreaming = async () => {
        if (!canvasRef.current || !ioRef.current) return;

        try {
            // getting stream from the canvas
            const canvasStream = canvasRef.current.captureStream(30);

            // adding audio from camera
            if (isAudioEnabled && videoRef.current && videoRef.current.srcObject) {
                const audioTracks = videoRef.current.srcObject.getAudioTracks();
                audioTracks.forEach(track => canvasStream.addTrack(track));
            }

            // adding audio from screenshare 
            if (isScreenSharing && screenVideoRef.current && screenVideoRef.current.srcObject) {
                const screenAudioTracks = screenVideoRef.current.srcObject.getAudioTracks();
                screenAudioTracks.forEach(track => canvasStream.addTrack(track));
            }

            // Initialize socket connection first
            ioRef.current.emit('start-stream');

            // capturing stream data
            mediaRecorderRef.current = new MediaRecorder(canvasStream, {
                mimeType: 'video/webm;codecs=vp8,opus',
                videoBitsPerSecond: 3000000, // 3 Mbps
                audioBitsPerSecond: 128000   // 128 kbps
            });

            mediaRecorderRef.current.ondataavailable = async (event) => {
                if (event.data.size > 0 && ioRef.current && ioRef.current.connected) {
                    try {
                        const buffer = await event.data.arrayBuffer();
                        ioRef.current.emit('stream-data', buffer);
                        console.log('Sent chunk:', buffer.byteLength, 'bytes');
                    } catch (error) {
                        console.error('Error sending chunk:', error);
                    }
                }
            };

            mediaRecorderRef.current.start(1000); // Send data every 1000ms (1 second)
            setIsLive(true);

            // Add error handler
            mediaRecorderRef.current.onerror = (error) => {
                console.error('MediaRecorder error:', error);
                stopStreaming();
            };

        } catch (err) {
            console.error('Streaming error:', err);
            setIsLive(false);
        }
    };

    // stopping stream

    const stopStreaming = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (ioRef.current) {
            ioRef.current.emit('stop-stream');
        }

        setIsLive(false);
    };

    // toggle camera

    const toggleCamera = () => {
        setisCameraEnabled(!isCameraEnabled);
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getVideoTracks();
            tracks.forEach(track => track.enabled = !isCameraEnabled);
        }
    };

    //toggle audio

    const toggleAudio = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const audioTracks = videoRef.current.srcObject.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled; // Toggle the current state
            });
            setisAudioEnabled(!isAudioEnabled);
        }
    };



    useEffect(() => {
        // Initialize socket connection
        ioRef.current = io('http://localhost:3001', {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        ioRef.current.on('connect', () => {
            console.log('Connected to streaming server');
            setConnectionStatus('connected');
        });

        ioRef.current.on('disconnect', () => {
            console.log('Disconnected from streaming server');
            setConnectionStatus('disconnected');
            setIsLive(false);
        });

        ioRef.current.on('stream-error', (error) => {
            console.error('Stream error:', error);
            setIsLive(false);
        });

        ioRef.current.on('stream-started', () => {
            console.log('Stream started successfully');
        });

        // start camera

        startCamera();

        // Set canvas dimensions
        if (canvasRef.current) {
            canvasRef.current.width = 1280;
            canvasRef.current.height = 720;
        }

        // Start canvas animation
        drawCanvas();








        return () => {


            // Cleanup
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            if (ioRef.current) {
                ioRef.current.disconnect();
            }

            // Stop all media tracks
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }

            if (screenVideoRef.current && screenVideoRef.current.srcObject) {
                screenVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }

        }
    }, []);


    useEffect(() => {
        // Restart canvas drawing when screen sharing changes
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        drawCanvas();
    }, [isScreenSharing, isCameraEnabled]);





    return (
        <div>
            <div className="flex justify-center mt-10 relative">

                <div className="sidebar w-1/4 px-8 h-fit">

                    <div className="h-[144px] w-[284px] rounded">

                        <p className=" mb-6 text-xl">Video Inputs</p>


                        <video
                            ref={videoRef}
                            style={{ display: 'block' }}
                            autoPlay
                            muted
                            playsInline
                            className='rounded transform scale-x-[-1]'
                        ></video>

                    </div>

                    <p className="text-center mt-18">Camera</p>

                    <div className="h-[144px] w-[284px] mt-6 bg-black">
                        <video ref={screenVideoRef} className='rounded' autoPlay muted ></video></div>

                    <p className="text-center mt-4">Screen Share</p>

                </div>


                <div className="object-contain w-3/4 rounded flex gap-4 h-fit">

                    <canvas
                        ref={canvasRef}
                        className="shadow-[#181818] shadow-xl w-[630px] h-[355px] object-contain rounded ml-10"
                    ></canvas>


                    <div className={isChatLive ? `live-chat bg-[#202020] w-full mx-8 rounded p-3 h-[430px]` : 'hidden'}>
                        hi
                    </div>

                </div>
            </div>

            <div className="absolute flex justify-center left-[35%]">
                <div className="flex items-center gap-9 bg-[#111111] px-8 py-3 rounded-xl text-white">
                    <div
                        className={`cursor-pointer ${!isAudioEnabled ? 'text-red-500' : ''}`}
                        onClick={toggleAudio}
                    >
                        <Mic size={25} />
                    </div>
                    <div
                        className={`cursor-pointer ${!isCameraEnabled ? 'text-red-500' : ''}`}
                        onClick={toggleCamera}
                    >
                        <Video size={25} />
                    </div>
                    <div
                        className={`cursor-pointer ${isScreenSharing ? 'text-green-500' : ''}`}
                        onClick={startScreenShare}
                    >
                        <MonitorUp size={25} />
                    </div>
                    <div className="cursor-pointer">
                        <UserPlus size={25} />
                    </div>
                    <div className="cursor-pointer">
                        <Button
                            className={`px-6 py-2 font-medium transition-colors ${isLive
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            onClick={isLive ? stopStreaming : startStreaming}
                            disabled={connectionStatus !== 'connected'}
                        >
                            {isLive ? 'Stop Stream' : 'Go Live'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Studio;