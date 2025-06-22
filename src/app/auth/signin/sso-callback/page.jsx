"use client"
import React, { useEffect } from 'react'

const page = () => {
    useEffect(() => {
        window.location.href = '/dashboard'

        return () => {

        }
    }, [])

    return (
        <div>Redirecting......</div>
    )
}

export default page