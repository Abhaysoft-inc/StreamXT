'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { ApiError, apiFetch } from '@/lib/api-client'
import { useAuth } from '@/context/AuthContext'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setIsLoading(true)

    try {
      const data = await apiFetch('/api/v1/auth/profile', {
        method: 'PATCH',
        body: { username },
      })
      setUser(data.user)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fields || {})
        if (!err.fields || Object.keys(err.fields).length === 0) {
          setError(err.message)
        }
      } else {
        setError('Could not save username. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center mt-30">
      <form onSubmit={handleSubmit}>
        <Card className="w-full sm:w-96">
          <CardHeader>
            <CardTitle>Choose a username</CardTitle>
            <CardDescription>
              Finish setting up your StreamXT account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="complete-username">Username</Label>
              <Input
                id="complete-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
              {fieldErrors.username?.[0] ? (
                <p className="block text-sm text-destructive">{fieldErrors.username[0]}</p>
              ) : null}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Icons.spinner className="size-4 animate-spin" /> : 'Continue'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
