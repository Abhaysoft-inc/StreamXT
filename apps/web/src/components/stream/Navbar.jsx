import React from 'react';
import Link from 'next/link';
import { Dot } from 'lucide-react';
import { Figtree } from 'next/font/google';
const figtree = Figtree({
    subsets: ["latin"]
});
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navbar = ({ isStreaming, onStartStreaming, onStopStreaming }) => {
    const handleGoLiveClick = () => {
        if (isStreaming) {
            onStopStreaming();
        } else {
            onStartStreaming();
        }
    };

    function sendToHome() {
        window.location = '/'
    }

    return (
        <div className="navbar">
            <div className={`${figtree.className} px-10 py-2 items-center bg-transparent `}>
                <div className="flex justify-between items-center">
                    <p className="brand text-2xl font-bold flex items-center ml-4 cursor-pointer" onClick={sendToHome}>Stream<span className='text-orange-400 text-3xl cursor-pointer'>X</span><span className='text-orange-400 text-3xl'>T</span></p>

                    <ul className="nav-menu flex gap-6 items-center">
                        <div className="flex items-center gap-2">
                            {/* <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
                                <Avatar>
                                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                                <Avatar>
                                    <AvatarImage src="https://github.com/leerob.png" alt="@leerob" />
                                    <AvatarFallback>LR</AvatarFallback>
                                </Avatar>
                                <Avatar>
                                    <AvatarImage
                                        src="https://github.com/evilrabbit.png"
                                        alt="@evilrabbit"
                                    />
                                    <AvatarFallback>ER</AvatarFallback>
                                </Avatar>
                            </div> */}

                            {/* <div className="bg-[#252525] px-2 rounded-full">
                                <p className="text-sm">365 Viewers</p>
                            </div> */}
                        </div>
                        <button
                            data-ripple-dark="true"
                            className={`flex ${isStreaming ? 'bg-gray-500' : 'bg-red-500'} pr-3 pl-1 py-1 rounded-full font-semibold cursor-pointer`}
                            onClick={handleGoLiveClick}
                        >
                            <Dot className='scale-[250%]' /> {isStreaming ? 'Stop Live' : 'Go Live'}
                        </button>
                    </ul>
                </div>
            </div>
            <div className="w-full border-b-[0.5px] opacity-30 bg-white"></div>
        </div>
    );
};

export default Navbar;