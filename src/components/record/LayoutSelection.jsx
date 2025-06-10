"use client"
import { Button } from '@/components/ui/button'
import React, { useState } from 'react'

const LayoutSelection = () => {

    const [isLayoutSelected, setisLayoutSelected] = useState(true);
    return (
        <>
            <div className={isLayoutSelected ? "flex justify-center gap-10 mt-10" : "hidden"}>
                <div className="box1">
                    <Button onClick={() => {
                        console.log("Live Cam Mode");
                        setisLayoutSelected(false);

                    }}>Live Cam</Button>

                </div>
                <div className="box2"  >
                    <Button onClick={() => {
                        console.log("Live Cam Mode");
                        setisLayoutSelected(false);

                    }}>Podcast Mode</Button>

                </div>
                <div className="box3">
                    <Button onClick={() => {
                        console.log("Live Cam Mode");
                        setisLayoutSelected(false);

                    }}>Tutorials</Button>

                </div>

            </div>
        </>
    )
}

export default LayoutSelection