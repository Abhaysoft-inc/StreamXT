'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: () => {},
  refreshUser: async () => null,
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/auth/me')
      setUser(data.user)
      return data.user
    } catch {
      setUser(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const signOut = useCallback(async () => {
    try {
      await apiFetch('/api/v1/auth/signout', {
        method: 'POST',
        retryOnUnauthorized: false,
      })
    } finally {
      setUser(null)
      window.location.href = '/auth/signin'
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        setUser,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
