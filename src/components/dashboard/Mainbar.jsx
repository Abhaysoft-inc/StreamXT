"use client"
import React, { useState } from 'react'
import { Figtree } from 'next/font/google'
import { Button } from '../ui/button';
import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaYoutube } from 'react-icons/fa';
import StreamDestinationModel from './StreamDestinationModel';

const figtree = Figtree({
    subsets: ['latin']
});

const Mainbar = () => {

    const [isStreamDestinationModalVisible, setisStreamDestinationModalVisible] = useState(false)

    const nav = useRouter();
    const navToYTStream = () => {
        setisStreamDestinationModalVisible(true)


    }
    const navToRecord = async () => {
        // nav.push('/record');
        await toast('Recording is currently unavailable', {
            theme: 'dark'
        })

    }

    return (
        <>


            <div className={isStreamDestinationModalVisible ? 'modal ' : 'hidden'}>

                <StreamDestinationModel
                    setIsVisible={setisStreamDestinationModalVisible} />
            </div>


            <div className={`p-16 ${figtree.className}`}>

                <p className="text-2xl">Stream</p>

                <div className="mt-6 flex gap-6">

                    <Button className="flex py-6 w-60 gap-3 cursor-pointer" variant={"outline"} onClick={navToYTStream}>
                        <FaYoutube size={80} />
                        <p className="text-lg">Stream to YouTube</p>
                    </Button>

                    <Button className="flex py-6 w-60 gap-3 cursor-pointer" variant={"outline"} onClick={navToRecord}>
                        <Camera size={80} />
                        <p className="text-lg">Record video</p>
                    </Button>

                </div>

                <div className="mt-16">
                    <p className="text-2xl">Recent recordings</p>
                </div>

            </div>
        </>
    )
}

export default Mainbar