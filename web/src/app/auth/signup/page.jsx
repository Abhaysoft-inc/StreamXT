'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
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
import { cn } from '@/lib/utils'
import { ApiError, apiFetch } from '@/lib/api-client'
import { useAuth } from '@/context/AuthContext'

function SignUpOtpInputs({ value, onChange, disabled }) {
  const digits = Array.from({ length: 6 }, (_, idx) => value[idx] || '')
  const inputRefs = React.useRef([])

  const handleDigitChange = (index, rawValue) => {
    const cleaned = rawValue.replace(/\D/g, '')
    if (!cleaned) {
      const next = [...digits]
      next[index] = ''
      onChange(next.join(''))
      return
    }

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6)
      onChange(pasted)
      inputRefs.current[Math.min(pasted.length, 5)]?.focus()
      return
    }

    const next = [...digits]
    next[index] = cleaned
    onChange(next.join(''))
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleDigitChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={cn(
            'relative flex size-10 items-center justify-center border-y border-r border-input bg-transparent text-center text-sm outline-none transition-all first:rounded-l-md first:border-l last:rounded-r-md focus:z-10 focus:ring-2 focus:ring-ring focus:ring-offset-background disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}

function SignUpContent() {
  const router = useRouter()
  const { setUser } = useAuth()

  const [step, setStep] = useState('start') // 'start' | 'continue' | 'verifications'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [resendAfter, setResendAfter] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [generalError, setGeneralError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (resendAfter <= 0) return
    const timer = setInterval(() => {
      setResendAfter((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendAfter])

  const clearErrors = () => {
    setGeneralError('')
    setFieldErrors({})
  }

  const handleApiError = (err) => {
    if (err instanceof ApiError) {
      const fields = err.fields || {}
      setFieldErrors(fields)

      // If email or password error occurred during the username step, jump back to start so the user sees it.
      if ((fields.email || fields.password) && step === 'continue') {
        setStep('start')
      }

      if (Object.keys(fields).length === 0) {
        setGeneralError(err.message)
      }
      if (err.details?.retryAfter) {
        setResendAfter(Number(err.details.retryAfter))
      }
      return
    }
    setGeneralError('Something went wrong. Please try again.')
  }

  const handleOAuth = (provider) => {
    setOauthLoading(provider)
    window.location.href = `/api/v1/auth/oauth/${provider}?redirect=/dashboard`
  }

  const handleStartSubmit = (e) => {
    e.preventDefault()
    clearErrors()

    const errors = {}
    if (!email.trim()) {
      errors.email = ['Email address is required']
    }
    if (password.length < 8) {
      errors.password = ['Password must be at least 8 characters']
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setStep('continue')
  }

  const handleUsernameSubmit = async (e) => {
    e.preventDefault()
    clearErrors()
    setIsLoading(true)

    try {
      const data = await apiFetch('/api/v1/auth/signup', {
        method: 'POST',
        body: { email, password, username },
      })

      if (data.requiresVerification) {
        setResendAfter(data.resendAfterSeconds || 60)
        setStep('verifications')
        return
      }

      setUser(data.user)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async (otpValue) => {
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/signup/verify', {
        method: 'POST',
        body: { email, code: otpValue },
      })
      setUser(data.user)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    await verifyCode(code)
  }

  const handleResend = async () => {
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/otp/resend', {
        method: 'POST',
        body: { email, purpose: 'signup_verify' },
      })
      setResendAfter(data.resendAfterSeconds || 60)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center mt-30">
      {step === 'start' && (
        <form onSubmit={handleStartSubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Welcome! Please fill in the details to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-y-4">
              {generalError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {generalError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-x-4">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={isLoading || Boolean(oauthLoading)}
                  onClick={() => handleOAuth('github')}
                >
                  {oauthLoading === 'github' ? (
                    <Icons.spinner className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Icons.gitHub className="mr-2 size-4" />
                      GitHub
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={isLoading || Boolean(oauthLoading)}
                  onClick={() => handleOAuth('google')}
                >
                  {oauthLoading === 'google' ? (
                    <Icons.spinner className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Icons.google className="mr-2 size-4" />
                      Google
                    </>
                  )}
                </Button>
              </div>

              <p className="flex items-center gap-x-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                or
              </p>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                {fieldErrors.email?.[0] ? (
                  <p className="block text-sm text-destructive">{fieldErrors.email[0]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                {fieldErrors.password?.[0] ? (
                  <p className="block text-sm text-destructive">{fieldErrors.password[0]}</p>
                ) : null}
              </div>
            </CardContent>
            <CardFooter>
              <div className="grid w-full gap-y-4">
                <Button type="submit" disabled={isLoading}>
                  Continue
                </Button>
                <Button variant="link" size="sm" asChild>
                  <Link href="/auth/signin">Already have an account? Sign in</Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}

      {step === 'continue' && (
        <form onSubmit={handleUsernameSubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Continue registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generalError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {generalError}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
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
              <div className="grid w-full gap-y-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Icons.spinner className="size-4 animate-spin" /> : 'Continue'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    clearErrors()
                    setStep('start')
                  }}
                >
                  Back
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}

      {step === 'verifications' && (
        <form onSubmit={handleVerifySubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Verify your email</CardTitle>
              <CardDescription>
                Enter the 6-digit verification code sent to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-y-4">
              {generalError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {generalError}
                </p>
              ) : null}
              <div className="grid items-center justify-center gap-y-2">
                <SignUpOtpInputs
                  value={code}
                  disabled={isLoading}
                  onChange={(val) => {
                    setCode(val)
                    if (val.length === 6) {
                      void verifyCode(val)
                    }
                  }}
                />
                {fieldErrors.code?.[0] ? (
                  <p className="block text-center text-sm text-destructive">{fieldErrors.code[0]}</p>
                ) : null}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={isLoading || resendAfter > 0}
                  onClick={handleResend}
                  className="text-muted-foreground"
                >
                  {resendAfter > 0 ? (
                    <>
                      Didn&apos;t receive a code? Resend (
                      <span className="tabular-nums">{resendAfter}</span>)
                    </>
                  ) : (
                    "Didn't receive a code? Resend"
                  )}
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <div className="grid w-full gap-y-4">
                <Button type="submit" disabled={isLoading || code.length !== 6}>
                  {isLoading ? <Icons.spinner className="size-4 animate-spin" /> : 'Continue'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Icons.spinner className="size-6 animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
