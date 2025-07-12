import React from 'react';
import Link from 'next/link';
import { Dot } from 'lucide-react';
import { Figtree } from 'next/font/google';
const figtree = Figtree({
    subsets: ["latin"]
});

const Navbar = () => {

    function sendToHome() {
        window.location = '/'
    }

    return (
        <div className="navbar">
            <div className={`${figtree.className} px-10 py-2 items-center bg-transparent `}>
                <div className="flex justify-between items-center">
                    <p className="brand text-2xl font-bold flex items-center ml-4 cursor-pointer">Stream<span className='text-orange-400 text-3xl cursor-pointer'>X</span><span className='text-orange-400 text-3xl'>T</span></p>

                    <ul className="nav-menu flex gap-6 items-center">
                        <div className="flex items-center gap-2">
                            
                        </div>
                        
                    </ul>
                </div>
            </div>
            <div className="w-full border-b-[0.5px] opacity-30 bg-white"></div>
        </div>
    );
};

export default Navbar;