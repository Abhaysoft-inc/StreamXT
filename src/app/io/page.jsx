"use client"

import { io } from "socket.io-client";

import React, { useEffect, useRef } from 'react'

const page = () => {
    const videoRef = useRef(null);


    const startCam = async (socket) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
        }

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp8" // or vp9

            // mimeType: "video/mp4",
        });

        mediaRecorder.ondataavailable = async (e) => {
            if (e.data.size > 0) {
                const arrayBuffer = await e.data.arrayBuffer();
                socket.emit("stream-data", new Uint8Array(arrayBuffer)); // ✅ send binary
            }
        };

        mediaRecorder.start(100); // Send data every 100ms
    }

    useEffect(() => {
        const socket = io('http://localhost:3001');

        socket.on('welcome', (data) => {
            console.log("received from server ", data);
        });

        startCam(socket);

        return () => {
        }
    }, [])

    return (
        <div>
            <video ref={videoRef} autoPlay muted></video>
        </div>
    )
}


export default page