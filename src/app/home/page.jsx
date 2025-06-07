"use client"

import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

const StreamPage = () => {
    const videoRef = useRef(null);
    const ioRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    useEffect(() => {
        ioRef.current = io('http://localhost:3001');

        ioRef.current.on('welcome', (msg) => {
            console.log(msg);
        })


        const startStream = async () => {
            try {

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // const mediaRecorder = new MediaRecorder(stream);

                mediaRecorderRef.current = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp8,opus',
                    videoBitsPerSecond: 2500000 // 2.5 Mbps
                })


                mediaRecorderRef.current.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        const reader = new FileReader();

                        reader.onload = () => {
                            const buffer = Buffer.from(reader.result)
                            ioRef.current.emit('stream', buffer);
                        };
                        reader.readAsArrayBuffer(e.data);
                    }
                };

                mediaRecorderRef.current.start(1000);

                // ioRef.current.emit('stream', stream);

            } catch (error) {
                console.log(error)

            }
        }

        startStream();

        return () => {

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (ioRef.current) {
                ioRef.current.disconnect();
            }

        }
    }, [])


    return (
        <>

            <video ref={videoRef} autoPlay muted></video>


        </>
    )
}

export default StreamPage