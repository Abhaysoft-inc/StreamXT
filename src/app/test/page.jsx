"use client"

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

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    };

    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: 1920, height: 1080 },
                audio: true
            });

            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = screenStream;
                screenVideoRef.current.play();
                setIsScreenSharing(true);
            }

            // Handle screen share end
            screenStream.getVideoTracks()[0].onended = () => {
                setIsScreenSharing(false);
                if (screenVideoRef.current) {
                    screenVideoRef.current.srcObject = null;
                }
            };
        } catch (error) {
            console.error('Error accessing screen:', error);
        }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const screenVideo = screenVideoRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Clear canvas
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

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(drawCanvas);
    };

    const startStreaming = async () => {
        if (!canvasRef.current || !ioRef.current) return;

        try {
            // Get canvas stream
            const canvasStream = canvasRef.current.captureStream(30);

            // Add audio from camera if enabled
            if (isAudioEnabled && videoRef.current && videoRef.current.srcObject) {
                const audioTracks = videoRef.current.srcObject.getAudioTracks();
                audioTracks.forEach(track => canvasStream.addTrack(track));
            }

            // Add audio from screen share if available
            if (isScreenSharing && screenVideoRef.current && screenVideoRef.current.srcObject) {
                const screenAudioTracks = screenVideoRef.current.srcObject.getAudioTracks();
                screenAudioTracks.forEach(track => canvasStream.addTrack(track));
            }

            // Create MediaRecorder to capture stream data
            mediaRecorderRef.current = new MediaRecorder(canvasStream, {
                mimeType: 'video/webm;codecs=vp8,opus'
            });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && ioRef.current) {
                    // Convert blob to array buffer and send via socket
                    event.data.arrayBuffer().then(buffer => {
                        ioRef.current.emit('stream-data', buffer);
                    });
                }
            };

            // Start recording in chunks
            mediaRecorderRef.current.start(100); // Send data every 100ms
            setIsLive(true);

            // Notify server about stream start
            ioRef.current.emit('start-stream', {
                title: 'Live Stream',
                description: 'Streaming from browser'
            });

        } catch (error) {
            console.error('Error starting stream:', error);
        }
    };

    const stopStreaming = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (ioRef.current) {
            ioRef.current.emit('stop-stream');
        }

        setIsLive(false);
    };

    const toggleCamera = () => {
        setisCameraEnabled(!isCameraEnabled);
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getVideoTracks();
            tracks.forEach(track => track.enabled = !isCameraEnabled);
        }
    };

    const toggleAudio = () => {
        setisAudioEnabled(!isAudioEnabled);
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getAudioTracks();
            tracks.forEach(track => track.enabled = !isAudioEnabled);
        }
    };

    useEffect(() => {
        // Initialize socket connection
        ioRef.current = io('http://localhost:3001');

        ioRef.current.on('connect', () => {
            setConnectionStatus('connected');
            console.log('Connected to streaming server');
        });

        ioRef.current.on('disconnect', () => {
            setConnectionStatus('disconnected');
            console.log('Disconnected from streaming server');
        });

        ioRef.current.on('welcome', (msg) => {
            console.log(msg);
        });

        ioRef.current.on('stream-started', (data) => {
            console.log('Stream started:', data);
        });

        ioRef.current.on('stream-error', (error) => {
            console.error('Stream error:', error);
            setIsLive(false);
        });

        // Start camera
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
        };
    }, []);

    useEffect(() => {
        // Restart canvas drawing when screen sharing changes
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        drawCanvas();
    }, [isScreenSharing, isCameraEnabled]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Connection Status */}
            <div className="absolute top-4 right-4 z-10">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${connectionStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
                {isLive && (
                    <div className="mt-2 px-3 py-1 bg-red-600 rounded-full text-sm font-medium animate-pulse">
                        🔴 LIVE
                    </div>
                )}
            </div>

            <div className="flex justify-center pt-10">
                <div className="object-contain shadow-lg rounded-lg overflow-hidden">
                    {/* Hidden video elements */}
                    <video
                        ref={videoRef}
                        style={{ display: 'none' }}
                        autoPlay
                        muted
                        playsInline
                    />
                    <video
                        ref={screenVideoRef}
                        style={{ display: 'none' }}
                        autoPlay
                        muted
                        playsInline
                    />

                    {/* Main canvas display */}
                    <canvas
                        ref={canvasRef}
                        className="w-[800px] h-[450px] bg-black rounded-lg"
                        style={{ objectFit: 'contain' }}
                    />
                </div>
            </div>

            {/* Control Bar */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-4 bg-[#171717] px-6 py-3 rounded-xl text-white shadow-lg">
                    <div
                        className={`cursor-pointer p-2 rounded-lg transition-colors ${isAudioEnabled ? 'hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                        onClick={toggleAudio}
                        title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
                    >
                        <Mic size={20} />
                    </div>

                    <div
                        className={`cursor-pointer p-2 rounded-lg transition-colors ${isCameraEnabled ? 'hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                        onClick={toggleCamera}
                        title={isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                    >
                        <Video size={20} />
                    </div>

                    <div
                        className={`cursor-pointer p-2 rounded-lg transition-colors ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-700'
                            }`}
                        onClick={startScreenShare}
                        title="Share Screen"
                    >
                        <MonitorUp size={20} />
                    </div>

                    <div className="cursor-pointer p-2 rounded-lg hover:bg-gray-700" title="Invite Users">
                        <UserPlus size={20} />
                    </div>

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
    );
};

export default Studio;