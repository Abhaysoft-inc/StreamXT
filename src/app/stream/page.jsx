import Navbar from '@/components/dashboard/Navbar'
import Link from 'next/link';
import { Button } from '@/components/ui/button'
import { ChartBar, Dot, MessageCircle, Mic, MonitorUp, Pencil, Settings, Sticker, User, UserPlus, Video } from 'lucide-react'
import React from 'react'
import { Figtree } from 'next/font/google'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const figtree = Figtree({
    subsets: ["latin"]
})

const page = () => {
    return (
        <>

            {/* Navbar */}

            <div className="navbar">
                <div className={`${figtree.className} px-10 py-2 items-center bg-transparent `}>

                    <div className="flex justify-between items-center">
                        <Link className="brand text-2xl cursor-pointer" href={'/'}>StreamXT</Link>

                        <ul className="nav-menu flex gap-6 items-center">

                            <div className="flex items-center gap-2" >


                                <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
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
                                </div>

                                <div className="bg-[#252525] px-2 rounded-full">
                                    <p className="text-sm">365 Viewers</p>
                                </div>
                            </div>
                            <button data-ripple-dark="true" className='flex bg-red-500 pr-3 pl-1 py-1 rounded-full font-semibold cursor-pointer'><Dot className='scale-[250%]' /> Go Live</button>



                        </ul>
                    </div>


                </div>
                <div className="w-full border-b-[0.5px] opacity-30 bg-white  "></div>
            </div>

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