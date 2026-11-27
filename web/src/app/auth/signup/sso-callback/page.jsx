'use client'

import { useEffect } from 'react'

export default function SignUpSsoCallbackPage() {
  useEffect(() => {
    window.location.href = '/dashboard'
  }, [])

  return <div>Redirecting...</div>
}
