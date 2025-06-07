import React from 'react'
import { Figtree } from 'next/font/google'
import { Button } from '../ui/button';
import Link from 'next/link';
import { HistoryIcon, Home } from 'lucide-react';
const figtree = Figtree({
    subsets: ['latin']
});


const Sidebar = () => {
    return (
        <>
            <div className={`w-full ${figtree.className}`}>
                <ul className="">
                    <li className='flex px-4 py-3.5 gap-3 bg-gray-900 cursor-pointer' ><Home /> Home</li>
                    <li className='flex px-4 py-3.5 gap-3 cursor-pointer'><HistoryIcon /> Recent streams</li>
                </ul>
            </div>

        </>
    )
}

export default Sidebar