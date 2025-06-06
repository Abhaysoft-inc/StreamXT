"use client"
import React, { useEffect, useRef } from 'react'

const StreamingPage = () => {

    const videoRef = useRef(null);

    useEffect(() => {
        const startStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }



            } catch (error) {
                console.log(error)

            }
        }

        startStream();

        return () => {
            if (videoRef.current?.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        }
    }, []

    );



    return (
        <>

            <video id="user-video" ref={videoRef} autoPlay playsInline muted></video>

            <button className='bg-white text-black'>Helo</button>


        </>
    )
}

export default StreamingPage