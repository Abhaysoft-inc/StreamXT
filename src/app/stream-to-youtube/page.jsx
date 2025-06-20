"use client"

import Navbar from '@/components/dashboard/Navbar'
import StreamKeyForm from '@/components/dashboard/stream-to-youtube/StreamKeyForm'
import Studio from '@/components/dashboard/stream-to-youtube/Studio'
import React, { useState } from 'react'

const StreamYTpage = () => {

    const [isStreamKeyAvailable, setisStreamKeyAvailable] = useState(false)
    return (
        <>

            <Navbar />


            {/* stream key setup */}

            <StreamKeyForm />


            {/* <Studio /> */}






        </>
    )
}

export default StreamYTpage