"use client"


import Navbar from '@/components/podcast/Navbar'
import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client';

const page = () => {

    // refs 

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const startCam = async () => {


        const localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { height: 720, width: 1368 }
        });

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.onloadedmetadata = async () => {
                await localVideoRef.current.play();
            }
        }

    }




    useEffect(() => {
        const socket = io('http://localhost:3001');
        socket.on('welcome', (data) => {
            console.log(data);

        });
        startCam()
        return () => {
        }
    }, [])

    return (
        <>
            <Navbar />

            {/* <canvas ref={canvasRef}></canvas> */}

            <div className="flex justify-center gap-10 mt-35">
                <video ref={localVideoRef} autoPlay muted className='w-120'></video>
                <video ref={remoteVideoRef} autoPlay muted className='w-120 bg-white'></video>
            </div>



        </>
    )
}

export default page