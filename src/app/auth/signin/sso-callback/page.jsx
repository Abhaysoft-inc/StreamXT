import React from 'react'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'


const page = () => {
    return <AuthenticateWithRedirectCallback />
}

export default page