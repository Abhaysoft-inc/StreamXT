
import { Camera, CircleX, Mic, MonitorUp, UserPlus, Video } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'

const Studio = () => {

    const videoRef = useRef(null);
    const [isCameraEnabled, setisCameraEnabled] = useState(true);
    const [isAudioEnabled, setisAudioEnabled] = useState(true)

    useEffect(() => {

        const startStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: isAudioEnabled,
                    video: isCameraEnabled
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
    }, [isCameraEnabled, isAudioEnabled])

    const toggleCamera = () => {
        setisCameraEnabled(prev => !prev);
    }

    const toggleAudio = () => {
        setisAudioEnabled(prev => !prev);
    }



    return (
        <div>

            <div className="flex justify-center mt-10 ">

                <div className='w-120 object-contain shadow-lg rounded' >
                    <video ref={videoRef} className='w-120 h-80 object-cover rounded' autoPlay muted playsInline></video>
                </div>




            </div>

            <div className="bottombar flex justify-center mt-30 ">

                <div className="flex items-center gap-9 bg-gray-900 px-16 py-4 rounded-full text-white">
                    <div className="cursor-pointer"><Mic size={29} onClick={toggleAudio} /></div>
                    <div className="cursor-pointer"><Video size={29} onClick={toggleCamera} /></div>
                    <div className="cursor-pointer"><MonitorUp size={29} /></div>
                    <div className="cursor-pointer"><UserPlus size={29} /></div>
                    <div className="cursor-pointer"><CircleX size={29} color='red' /></div>
                </div>

            </div>



        </div>
    )
}

export default Studio