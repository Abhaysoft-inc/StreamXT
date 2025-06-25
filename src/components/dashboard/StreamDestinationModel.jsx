"use client"
import React, { useState } from 'react'
import { Figtree } from 'next/font/google'
import { FaX } from 'react-icons/fa6'
import { CiStreamOn } from "react-icons/ci";
import { IoMdAdd } from "react-icons/io";
import { FaYoutube } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import {
    useRouter
} from "next/navigation" // Import useRouter

const figtree = Figtree({
    subsets: ['latin']
});



const StreamDestinationModel = ({ setIsVisible }) => {

    const router = useRouter();
    const [streamDestination, setstreamDestination] = useState("");
    const [youtubeStreamKey, setyoutubeStreamKey] = useState("");

    const handleGoLive = async () => {
        if (streamDestination == "youtube") {
            if (youtubeStreamKey == "") {
                toast("YouTube Stream Key Can't be blank!")
                return
            }
            await sessionStorage.setItem("YTStreamKey", youtubeStreamKey);
            router.push("/stream");
        }
    }



    return (
        <div className='modal-contaier fixed flex justify-center items-center backdrop-blur-sm '>
            <div className="modal w-[600px] h-[400px] relative bg-[#222] rounded left-[40%] top-20 shadow-2xl shadow-white px-4 py-3">
                <div className="closeBtn float-end" onClick={() => {
                    setIsVisible(false)

                }}><FaX size={25} className='cursor-pointer' /></div>

                <div className="mt-4 ml-6">
                    <p className={`${figtree.className} font-[600] text-xl`}>
                        Setup Stream Destination
                    </p>
                </div>

                <div className="mx-6 flex mt-6 gap-6">

                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center" onClick={() => {
                            setstreamDestination("customRTMP")
                        }}>
                            <div className="bg-gray-800 rounded-2xl p-2 w-fit">
                                <CiStreamOn size={30} className="cursor-pointer" />
                            </div>
                            <span className="text-xs mt-1">Custom RTMP</span>
                        </div>
                    </div>

                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center" onClick={() => {
                            setstreamDestination("youtube")
                        }}>
                            <div className="bg-gray-800 rounded-2xl p-2 w-fit">
                                <FaYoutube size={30} className="cursor-pointer" />
                            </div>
                            <span className="text-xs mt-1">YouTube</span>
                        </div>
                    </div>

                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="bg-gray-800 rounded-2xl p-2 w-fit">
                                <IoMdAdd size={30} className="cursor-pointer" />
                            </div>
                            <span className="text-xs mt-1">Add new destination</span>
                        </div>
                    </div>




                </div>

                <div className="details-section">
                    {
                        streamDestination === "customRTMP" ? (
                            <div className='mx-6 mt-8'>
                                <h3 className="text-lg font-semibold mb-4">Custom RTMP Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm mb-1">RTMP URL</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                                            placeholder="rtmp://your-server-url/live"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Stream Key</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                                            placeholder="Your stream key"
                                        />
                                    </div>
                                </div>
                            </div>)

                            : streamDestination === "youtube" ? (
                                <div className='mx-6 mt-8'>
                                    <h3 className="text-lg font-semibold mb-4">YouTube Stream Settings</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm mb-1">Stream Key</label>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                                                placeholder="Your YouTube stream key"
                                                onChange={(e) => {
                                                    setyoutubeStreamKey(e.target.value);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <Button className={"mt-6 cursor-pointer"} onClick={handleGoLive}>Go Live!</Button>
                                </div>
                            ) : (
                                (
                                    <div className='mt-16 text-center text-xl mx-6'>
                                        <p>Please select a streaming destination</p>
                                    </div>
                                )

                            )

                    }



                </div>



            </div>
        </div>
    )
}

export default StreamDestinationModel