"use client"

import { Button } from '@/components/ui/button'
import { ChartBar, MessageCircle, Mic, MicOff, MonitorUp, Pencil, Settings, Sticker, User, UserPlus, Video, VideoOff } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Figtree } from 'next/font/google'
import Navbar from '@/components/stream/Navbar';
import io from 'socket.io-client';
import { ToastContainer, toast, Bounce } from 'react-toastify';
import {
    useRouter
} from "next/navigation"

const figtree = Figtree({
    subsets: ["latin"]
});

const page = () => {
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const animationRef = useRef(null);
    const screenVideoRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamKey, setStreamKey] = useState("");

    // toast

    const showAddedSoonToast = async () => {
        await toast('We are woking on this feature', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
            transition: Bounce,
        });

    }

    // State management
    const [isCameraEnabled, setIsCameraEnabled] = useState(true); // Default camera ON
    const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [currentLayout, setCurrentLayout] = useState('single'); // 'single', 'duo', 'screen'
    const [stream, setStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);

    // Start/Stop Camera
    const toggleCamera = async () => {
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

    // Start/Stop Screen Share
    const toggleScreenShare = async () => {
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
    }

    // Toggle Microphone
    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isMicEnabled;
                setIsMicEnabled(!isMicEnabled);
            }
        } else {
            setIsMicEnabled(!isMicEnabled);
        }
    }

    // Layout selection handlers
    const selectLayout = async (layout) => {
        setCurrentLayout(layout);

        // Auto-enable screen share when switching to screen layout
        if (layout === 'screen' && !isScreenShareEnabled) {
            await toggleScreenShare();
        }
    }

    // Canvas drawing function
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const camVideo = videoRef.current;
        const screenVideo = screenVideoRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        canvas.width = 756;
        canvas.height = 424;

        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        try {
            if (currentLayout === 'screen' && isScreenShareEnabled && screenVideo && screenVideo.readyState >= 2) {
                // Screen share with camera overlay
                ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

                if (isCameraEnabled && camVideo && camVideo.readyState >= 2) {
                    // Draw camera in bottom right corner
                    const camWidth = 252;
                    const camHeight = 142;
                    const camX = canvas.width - camWidth - 10;
                    const camY = canvas.height - camHeight - 10;

                    ctx.drawImage(camVideo, camX, camY, camWidth, camHeight);

                    // Add border to camera overlay
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(camX, camY, camWidth, camHeight);
                }
            } else if (currentLayout === 'duo' && isCameraEnabled && camVideo && camVideo.readyState >= 2) {
                // Side by side layout (placeholder for second participant)
                const halfWidth = canvas.width / 2;
                ctx.drawImage(camVideo, 0, 0, halfWidth, canvas.height);

                // Placeholder for second participant
                ctx.fillStyle = '#333333';
                ctx.fillRect(halfWidth, 0, halfWidth, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Waiting for participant...', halfWidth + halfWidth / 2, canvas.height / 2);
            } else if (currentLayout === 'single' && isCameraEnabled && camVideo && camVideo.readyState >= 2) {
                // Full screen camera
                ctx.drawImage(camVideo, 0, 0, canvas.width, canvas.height);
            } else {
                // No video sources available - show placeholder
                ctx.fillStyle = '#333333';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('No video source active', canvas.width / 2, canvas.height / 2);
            }
        } catch (error) {
            console.error("Canvas drawing error:", error);
        }

        animationRef.current = requestAnimationFrame(drawCanvas);
    }

    // Initialize camera on component mount
    const initializeCamera = async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: isMicEnabled,
                video: { height: 720, width: 1368 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                videoRef.current.onloadedmetadata = async () => {
                    await videoRef.current.play();
                    drawCanvas();
                }
            }

            setStream(newStream);
        } catch (error) {
            console.error("Failed to initialize camera: ", error);
            setIsCameraEnabled(false);
        }
    };

    // Start streaming 

    const startStreaming = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Capture canvas stream
        const canvasStream = canvas.captureStream(30); // Capture at 30 FPS

        // Add audio tracks based on the layout
        if (currentLayout === 'single' && stream) {
            // Add camera audio
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track) => {
                canvasStream.addTrack(track);
            });
        } else if (currentLayout === 'screen' && screenStream) {
            // Add screen share audio
            const audioTracks = screenStream.getAudioTracks();
            audioTracks.forEach((track) => {
                canvasStream.addTrack(track);
            });
        } else if (currentLayout === 'duo' && stream) {
            // Add camera audio (for duo layout)
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track) => {
                canvasStream.addTrack(track);
            });
        }

        // Initialize MediaRecorder
        const recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm; codecs=vp8' });
        setMediaRecorder(recorder);

        // Notify backend to start streaming
        socket.emit('start-stream');

        // Send recorded chunks to backend
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket) {
                socket.emit('stream-data', event.data);
            }
        };

        recorder.start(100); // Send data every 100ms
        setIsStreaming(true);
    };

    // Stop streaming

    const stopStreaming = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setMediaRecorder(null);
        }

        // Notify backend to stop streaming
        if (socket) {
            socket.emit('stop-stream');
            socket.emit('stream-stopped'); // <-- Explicitly notify server
        }
        setIsStreaming(false);

        window.location.href = '/dashboard';
    };


    // streaming

    useEffect(() => {
        // Initialize WebSocket connection
        const newSocket = io('http://34.58.28.209:3001'); // 
        setSocket(newSocket);

        // Send stream key to the backend after connection
        newSocket.on('connect', () => {
            if (streamKey) {
                newSocket.emit('set-stream-key', streamKey);
            } else {
                console.error('Stream key is missing');
            }
        });

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [streamKey]);

    // Initialize on component mount
    useEffect(() => {
        // Start camera on component mount
        initializeCamera();

        return () => {
            // Cleanup resources when the component unmounts or navigates away
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current); // Stop canvas animation
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop()); // Stop camera tracks
            }
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop()); // Stop screen share tracks
            }
            if (socket) {
                socket.disconnect(); // Disconnect WebSocket connection
            }
            setStream(null);
            setScreenStream(null);
            setSocket(null);
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            // Cleanup resources when navigating away or closing the tab
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
            if (socket) {
                socket.disconnect();
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    const handleNavigation = (path) => {
        // Cleanup resources before navigating to another page
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }

        if (socket) {
            socket.disconnect();
        }
        router.push(path); // Navigate to the specified path
    };

    // Restart drawing when layout changes
    useEffect(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        drawCanvas();
    }, [currentLayout, isCameraEnabled, isScreenShareEnabled]);

    const router = useRouter();

    const getStreamKey = async () => {
        const key = sessionStorage.getItem("YTStreamKey");
        if (key) {
            setStreamKey(key);
        } else {
            await toast("Stream key not found. Redirecting.....", {
                theme: "dark"
            });

            // router.push('/dashboard/stream-to-youtube');
            window.location.href = '/stream-to-youtube'
            // handleNavigation();



        }


    }

    useEffect(() => {
        getStreamKey();


        return () => {

        }
    }, [])

    return (
        <>
            <Navbar
                isStreaming={isStreaming}
                onStartStreaming={startStreaming}
                onStopStreaming={stopStreaming}
            />

            <div className="mainscreen flex w-full h-[500px] px-3 mt-6">
                {/* Sidebar */}
                <div className="sidebar w-[250px] px-3 py-2">
                    <div className="flex justify-between items-center">
                        <p className={`${figtree.className} text-lg`}>Backstage</p>
                        <Button variant={'outline'} className={'rounded-full bg-transparent h-10'} onClick={showAddedSoonToast}>
                            <UserPlus />
                        </Button>
                    </div>

                    <div className={`mt-8 ${figtree.className}`}>
                        <div className="box border-4 rounded border-green-400 relative">
                            <video ref={videoRef} className="" autoPlay muted playsInline></video>
                            <div className="absolute bottom-1 flex gap-2 items-center">
                                {isMicEnabled ? <Mic size={19} className='font-semibold' /> : <MicOff size={19} className='font-semibold text-red-500' />}
                                <p className="font">Abhay</p>
                            </div>
                            <div className="absolute top-0 bg-green-400 px-2 rounded-br py-0.5">
                                <p className="text-white">On-stage</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main View */}
                <div className="viewbar w-[900px] ml-8 mt-2">
                    <div className="flex justify-center">
                        <div className="canvas bg-white rounded-2xl w-[755px]">
                            <canvas className="rounded-2xl w-full h-auto" ref={canvasRef}></canvas>

                            <video ref={screenVideoRef} className="hidden" autoPlay muted playsInline></video>
                        </div>
                    </div>

                    {/* Layout Selection */}
                    <div className="mt-3 layoutselection flex justify-center gap-2">
                        {/* Single Layout */}
                        <div
                            className={`options-single flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer ${currentLayout === 'single' ? 'border-white' : 'border-[#2d2d2d]'
                                }`}
                            onClick={() => selectLayout('single')}
                        >
                            <div className={`icon border w-8 h-6 ${currentLayout === 'single' ? 'border-white bg-white' : 'border-[#2d2d2d] bg-[#2d2d2d]'
                                }`}></div>
                        </div>

                        {/* Duo Layout */}
                        <div
                            className={`options-duo flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer ${currentLayout === 'duo' ? 'border-white' : 'border-[#2d2d2d]'
                                }`}
                            onClick={() => selectLayout('duo')}
                        >
                            <div className={`icon border w-4 h-6 ${currentLayout === 'duo' ? 'border-white bg-white' : 'border-[#2d2d2d] bg-[#2d2d2d]'
                                }`}></div>
                            <div className={`icon border w-4 h-6 ${currentLayout === 'duo' ? 'border-white bg-white' : 'border-[#2d2d2d] bg-[#2d2d2d]'
                                }`}></div>
                        </div>

                        {/* Screen Share Layout */}
                        <div
                            className={`options-screen flex gap-0.5 border w-fit p-0.5 rounded cursor-pointer relative ${currentLayout === 'screen' ? 'border-white' : 'border-[#2d2d2d]'
                                }`}
                            onClick={() => selectLayout('screen')}
                        >
                            <div className={`icon border w-8 h-6 relative ${currentLayout === 'screen' ? 'border-white bg-white' : 'border-[#2d2d2d] bg-[#2d2d2d]'
                                }`}>
                                <div className={`absolute w-3.5 h-2.5 top-1 right-1 border border-[#171717] ${currentLayout === 'screen' ? 'bg-white' : 'bg-[#2d2d2d]'
                                    }`}></div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-9 flex justify-center">
                        <div className="controls flex gap-2">
                            <Button
                                className={`rounded-[100%] h-10 ${!isMicEnabled ? 'bg-red-500 hover:bg-red-600' : ''}`}
                                variant={'outline'}
                                onClick={toggleMic}
                            >
                                {isMicEnabled ? <Mic /> : <MicOff />}
                            </Button>

                            <Button
                                className={`rounded-[100%] h-10 ${!isCameraEnabled ? 'bg-red-500 hover:bg-red-600' : ''}`}
                                variant={'outline'}
                                onClick={toggleCamera}
                            >
                                {isCameraEnabled ? <Video /> : <VideoOff />}
                            </Button>

                            {/* <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <User />
                            </Button> */}

                            <Button
                                className={`rounded-[100%] h-10 ${isScreenShareEnabled ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                                variant={'outline'}
                                onClick={toggleScreenShare}
                            >
                                <MonitorUp />
                            </Button>

                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <Settings />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="toolbar w-[100px] ml-10 space-y-4 mt-3">
                    <div className="option-1">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                                <Pencil />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Brand</p>
                    </div>

                    <div className="option-2">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                                <MessageCircle />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Chat</p>
                    </div>

                    <div className="option-3">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                                <ChartBar />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Polls</p>
                    </div>

                    <div className="option-4">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                                <Sticker />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Overlays</p>
                    </div>
                </div>
            </div>
            <ToastContainer />
        </>
    )
}

export default page