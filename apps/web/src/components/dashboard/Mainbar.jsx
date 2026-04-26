"use client"
import React, { useState } from 'react'
import { Figtree } from 'next/font/google'
import { Button } from '../ui/button';
import { Camera, Clock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaYoutube } from 'react-icons/fa';
import StreamDestinationModel from './StreamDestinationModel';
import { UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes'

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


            <div className={`px-16 py-8 ${figtree.className}`}>

                <div className="float-end text-white">
                    <UserButton showName={true} appearance={{
                        baseTheme: dark,
                        variables: { fontSize: "15px" },
                        layout: { shimmer: false }
                    }} />
                </div>

                <p className="text-2xl mt-15 font-bold">Stream</p>

                <div className="mt-6 flex gap-6">

                    <Button className="flex py-7 px-6 w-64 gap-4 cursor-pointer bg-gradient-to-br from-red-600/90 to-red-700/90 hover:from-red-500/90 hover:to-red-600/90 border-red-500/50 text-white transition-all duration-300 shadow-lg hover:shadow-red-500/25" variant={"outline"} onClick={navToYTStream}>
                        <FaYoutube size={32} className="text-white" />
                        <p className="text-lg font-semibold">Stream to YouTube</p>
                    </Button>

                    <Button className="flex py-7 px-6 w-64 gap-4 cursor-pointer bg-gradient-to-br from-purple-600/90 to-purple-700/90 hover:from-purple-500/90 hover:to-purple-600/90 border-purple-500/50 text-white transition-all duration-300 shadow-lg hover:shadow-purple-500/25" variant={"outline"} onClick={navToRecord}>
                        <Camera size={32} className="text-white" />
                        <p className="text-lg font-semibold">Record Video</p>
                    </Button>

                </div>

                <div className="mt-12">
                    <p className="text-2xl font-bold">Your stats</p>

                    <div className="flex mt-6 gap-12">
                        <div className="stat-box bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 backdrop-blur-sm px-4 w-60 py-4 rounded-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent"></div>
                            <p className="text-blue-200/80 text-sm uppercase tracking-wide">hours streamed</p>
                            <p className="text-2xl mt-2 font-bold text-blue-100">
                                100 hours
                            </p>
                            <Clock className='absolute top-4 right-4 text-blue-400/40' size={40} />
                        </div>

                        <div className="stat-box bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border border-emerald-700/30 backdrop-blur-sm px-4 w-60 py-4 rounded-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent"></div>
                            <p className="text-emerald-200/80 text-sm uppercase tracking-wide">subscribers gained</p>
                            <p className="text-2xl mt-2 font-bold text-emerald-300">
                                +500
                            </p>
                            <User className='absolute top-4 right-4 text-emerald-400/40' size={40} />
                        </div>
                    </div>


                </div>

            </div>
        </>
    )
}

export default Mainbar