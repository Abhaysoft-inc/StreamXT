import React from 'react'

import { ChartBar, MessageCircle, Pencil, Sticker } from 'lucide-react'
import { Button } from '@/components/ui/button'
import showAddedSoonToast from '@/app/controllers/showToast'
import { Figtree } from 'next/font/google'

const figtree = Figtree({
    subsets: ["latin"]
});


const Toolbar = () => {
    return (
        <>
            <div className="toolbar w-[100px] ml-10 space-y-4 mt-3">
                <div className="option-1">
                    <div className="flex justify-center">
                        <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                            <Pencil />
                        </Button>
                    </div>
                    <p className={`${figtree.className} text-center mt-2 text-sm`}>Brand</p>
                </div>

                <div className="option-2">
                    <div className="flex justify-center">
                        <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                            <MessageCircle />
                        </Button>
                    </div>
                    <p className={`${figtree.className} text-center mt-2 text-sm`}>Chat</p>
                </div>

                <div className="option-3">
                    <div className="flex justify-center">
                        <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                            <ChartBar />
                        </Button>
                    </div>
                    <p className={`${figtree.className} text-center mt-2 text-sm`}>Polls</p>
                </div>

                <div className="option-4">
                    <div className="flex justify-center">
                        <Button className={'rounded-[100%] h-10'} variant={'outline'} onClick={showAddedSoonToast}>
                            <Sticker />
                        </Button>
                    </div>
                    <p className={`${figtree.className} text-center mt-2 text-sm`}>Overlays</p>
                </div>
            </div>
        </>
    )
}

export default Toolbar