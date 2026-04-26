import React from 'react'
import { Figtree } from 'next/font/google'
import { Button } from '../ui/button';
import Link from 'next/link';
import { HistoryIcon, Home, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import { FaHistory, FaHome } from 'react-icons/fa';
const figtree = Figtree({
    subsets: ['latin']
});


const Sidebar = () => {

    function sendToHome() {
        window.location = '/'
    }

    const recentStreams = () => {
        toast('currently unavailable', { theme: 'dark' })
    }
    return (
        <>
            <div className={`w-full ${figtree.className} px-4 py-8 border-r h-screen  `}>

                <p className="brand text-2xl font-bold flex items-center ml-4" onClick={sendToHome}>Stream<span className='text-orange-400 text-3xl cursor-pointer'>X</span><span className='text-orange-400 text-3xl'>T</span></p>

                <div className="navigaintions list-none mt-10
                ">
                    <li className='flex gap-3 items-center bg-[#141212] px-4 py-3 rounded-full text-md font-[500] cursor-pointer hover:bg-[#292626]'><FaHome /> Home</li>
                    <li className='flex gap-3 items-center bg-[#141212] px-4 py-3 rounded-full mt-4 text-md font-[500] cursor-pointer hover:bg-[#292626]'><FaHistory /> Recent Streams</li>
                </div>

                <div className="top-85 relative">
                    <li className='flex gap-3 items-center bg-[#141212] px-4 py-3 rounded-full mt-4 text-md font-[500] cursor-pointer hover:bg-[#292626]'><Settings /> Settings</li>

                </div>



            </div>

        </>
    )
}

export default Sidebar