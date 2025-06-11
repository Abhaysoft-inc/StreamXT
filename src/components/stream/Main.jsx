"use client"

import { Button } from '@/components/ui/button'
import { ChartBar, Dot, MessageCircle, Mic, MonitorUp, Pencil, Settings, Sticker, User, UserPlus, Video } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Figtree } from 'next/font/google'
import { Stage, Layer, Image as KonvaImage } from 'react-konva';


import Navbar from '@/components/stream/Navbar';

const figtree = Figtree({
    subsets: ["latin"]
});

const page = () => {

    const [video, setvideo] = useState(null);
    const imgRef = useRef(null);

    const setupWebcam = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { height: 720, width: 1366 }, audio: true });

        const vid = document.createElement('video');
        vid.srcObject = stream;
        vid.playsInline = true;
        vid.muted = true;

        await vid.play();
        setvideo(vid);

    };


    useEffect(() => {
        setupWebcam();
        return () => {
        }
    }, []);

    useEffect(() => {
        let animId;

        const render = () => {
            if (imgRef.current) {
                imgRef.current.get
            }
        }

        return () => {

        }
    }, [])



    return (
        <>

            {/* Navbar */}

            <Navbar />

            <div className="mainscreen flex w-full h-[500px] px-3 mt-6">

                <div className="sidebar  w-[250px] px-3 py-2">
                    <div className="flex justify-between items-center">

                        <p className={`${figtree.className} text-lg`}>Backstage</p>
                        <Button variant={'outline'} className={'rounded-full bg-transparent h-10'}>

                            <UserPlus />
                        </Button>

                    </div>

                    <div className={`mt-8 ${figtree.className}`}>

                        <div className="box border-4 rounded border-green-400 relative">
                            <img src="/photo.jpg" alt="" className='' />
                            <div className="absolute bottom-1 flex gap-2 items-center">
                                <Mic size={19} className='font-semibold' />
                                <p className="font">Abhay</p>
                            </div>
                            <div className="absolute top-0 bg-green-400 px-2 rounded-br py-0.5">
                                <p className="text-white">On-stage</p>
                            </div>
                        </div>


                    </div>

                </div>

                <div className="viewbar  w-[900px] ml-8 mt-2">
                    <div className="flex justify-center">

                        <div className="canvas bg-white rounded-2xl w-[755px]">
                            <img src="/photo.jpg" className='rounded-2xl' alt="" />
                        </div>
                    </div>

                    <div className="mt-3 layoutselection flex  justify-center gap-2">
                        <div className="options-single flex gap-0.5 border border-white w-fit p-0.5 rounded">
                            <div className="icon border border-white w-8 h-6 bg-white"></div>

                        </div>


                        <div className="options-duo flex gap-0.5 border border-[#2d2d2d] w-fit p-0.5 rounded">
                            <div className="icon border border-[#2d2d2d] w-4 h-6 bg-[#2d2d2d]"></div>
                            <div className="icon border border-[#2d2d2d] w-4 h-6 bg-[#2d2d2d]"></div>
                        </div>




                    </div>


                    <div className="mt-9 flex justify-center">

                        <div className="controls flex gap-2 ">

                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <Mic />
                            </Button>
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <Video />
                            </Button>
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <User />
                            </Button>
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <MonitorUp />
                            </Button>
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <Settings />
                            </Button>

                        </div>

                    </div>
                </div>

                <div className="toolbar  w-[100px] ml-10 space-y-4 mt-3">

                    <div className="option-1">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <Pencil />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Brand</p>
                    </div>

                    <div className="option-2">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <MessageCircle />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Chat</p>
                    </div>

                    <div className="option-3">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <ChartBar />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Polls</p>
                    </div>


                    <div className="option-4">
                        <div className="flex justify-center">
                            <Button className={'rounded-[100%] h-10'} variant={'outline'}>
                                <Sticker />
                            </Button>
                        </div>
                        <p className={`${figtree.className} text-center mt-2 text-sm`}>Overlays</p>
                    </div>





                </div>



            </div>







        </>
    )
}

export default page