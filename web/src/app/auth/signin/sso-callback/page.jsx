'use client'

import { useEffect } from 'react'

export default function SignInSsoCallbackPage() {
  useEffect(() => {
    window.location.href = '/dashboard'
  }, [])

  return <div>Redirecting...</div>
}
