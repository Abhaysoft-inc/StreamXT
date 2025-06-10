"use client"
import Navbar from '@/components/dashboard/Navbar'
import LayoutSelection from '@/components/record/LayoutSelection'
import { Button } from '@/components/ui/button'
import React, { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { Video } from 'lucide-react'
import { MonitorUp } from 'lucide-react'
import { UserPlus } from 'lucide-react'


const RecordPage = () => {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const animationRef = useRef(null);


    const startCamera = async () => {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
        });

        if (videoRef.current) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play();
                drawCanvas();
            }
        }
    }

    const drawCanvas = () => {

        if (!canvasRef.current || !videoRef.current || !videoRef.current.videoWidth) return;

        const ctx = canvasRef.current.getContext("2d");
        const canvas = canvasRef.current;

        canvas.width = 1280;
        canvas.height = 720;
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);




        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const video = videoRef.current;

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

        // aspect ration bhi to thik karna hai




        animationRef.current = requestAnimationFrame(drawCanvas);
    }


    useEffect(() => {
        startCamera();

        drawCanvas();


        return () => {

        }
    }, [])






    return (
        <>

            <Navbar />
            {/* Layout */}
            {/* <LayoutSelection /> */}

            <div>
                <div className="flex justify-center mt-10 ">




                    <div className="object-contain rounded h-fit">

                        <canvas
                            ref={canvasRef}
                            className="shadow-[#181818] shadow-xl w-[630px] h-[355px] object-contain rounded ml-10"
                        ></canvas>

                        <video ref={videoRef} autoPlay muted playsInline className='hidden'></video>




                    </div>
                </div>

                <div className=" flex justify-center mt-25">
                    <div className="flex items-center gap-9 bg-[#111111] px-8 py-3 rounded-xl text-white">
                        <div
                            className={`cursor-pointer `}

                        >
                            <Mic size={25} />
                        </div>
                        <div
                            className={`cursor-pointer `}

                        >
                            <Video size={25} />
                        </div>
                        <div
                            className={`cursor-pointer `}

                        >
                            <MonitorUp size={25} />
                        </div>
                        <div className="cursor-pointer">
                            <UserPlus size={25} />
                        </div>
                        <div className="cursor-pointer">
                            <Button
                                className={`px-6 py-2 font-medium transition-colors`}
                            >
                                {'Go Live'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>





        </>
    )
}

export default RecordPage