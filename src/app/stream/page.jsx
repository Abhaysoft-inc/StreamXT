"use client"

import React from 'react'

import dynamic from 'next/dynamic';

const WebcamCanvas = dynamic(() => import('@/components/stream/Main'), {
    ssr: false, // required!
});

const page = () => {
    return (
        <>
            <WebcamCanvas />
        </>)
}

export default page