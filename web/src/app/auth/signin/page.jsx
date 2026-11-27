'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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

function OtpInputs({ value, onChange, disabled }) {
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
      const focusIdx = Math.min(pasted.length, 5)
      inputRefs.current[focusIdx]?.focus()
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
          className="h-9 w-9 border-y border-r border-input bg-transparent text-center text-sm shadow-sm outline-none transition-all first:rounded-l-md first:border-l last:rounded-r-md focus:z-10 focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
      ))}
    </div>
  )
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()

  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const oauthError = searchParams.get('oauth_error')

  const [step, setStep] = useState('start') // 'start' | 'password' | 'email_code' | 'choose-strategy'
  const [previousStep, setPreviousStep] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [strategies, setStrategies] = useState(['password', 'email_code'])
  const [resendAfter, setResendAfter] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [generalError, setGeneralError] = useState(oauthError || '')
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
      setFieldErrors(err.fields || {})
      if (!err.fields || Object.keys(err.fields).length === 0) {
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
    window.location.href = `/api/v1/auth/oauth/${provider}?redirect=${encodeURIComponent(redirectTo)}`
  }

  const handleIdentify = async (e) => {
    e.preventDefault()
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/signin/identify', {
        method: 'POST',
        body: { email },
      })
      setEmail(data.email)
      setStrategies(data.strategies || ['password', 'email_code'])
      if (data.strategies?.includes('password')) {
        setPreviousStep('password')
        setStep('password')
      } else {
        await apiFetch('/api/v1/auth/signin/otp/send', {
          method: 'POST',
          body: { email: data.email },
        })
        setResendAfter(60)
        setPreviousStep('email_code')
        setStep('email_code')
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/signin/password', {
        method: 'POST',
        body: { email, password },
      })
      setUser(data.user)
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchToEmailCode = async () => {
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/signin/otp/send', {
        method: 'POST',
        body: { email },
      })
      setResendAfter(data.resendAfterSeconds || 60)
      setPreviousStep('email_code')
      setStep('email_code')
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/otp/resend', {
        method: 'POST',
        body: { email, purpose: 'signin_otp' },
      })
      setResendAfter(data.resendAfterSeconds || 60)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOtpCode = async (otpValue) => {
    clearErrors()
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/v1/auth/signin/otp/verify', {
        method: 'POST',
        body: { email, code: otpValue },
      })
      setUser(data.user)
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    await verifyOtpCode(code)
  }

  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center mt-30">
      {step === 'start' && (
        <form onSubmit={handleIdentify}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Sign in to StreamXT</CardTitle>
              <CardDescription>Welcome back! Please sign in to continue</CardDescription>
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
                <Label htmlFor="signin-email">Email address</Label>
                <Input
                  id="signin-email"
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
            </CardContent>
            <CardFooter>
              <div className="grid w-full gap-y-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Icons.spinner className="size-4 animate-spin" /> : 'Continue'}
                </Button>
                <Button variant="link" size="sm" asChild>
                  <Link href="/auth/signup">Don&apos;t have an account? Sign up</Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}

      {step === 'choose-strategy' && (
        <Card className="w-full sm:w-96">
          <CardHeader>
            <CardTitle>Use another method</CardTitle>
            <CardDescription>
              Facing issues? You can use any of these methods to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-y-4">
            {generalError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {generalError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="link"
              disabled={isLoading}
              onClick={handleSwitchToEmailCode}
            >
              Email code
            </Button>
            {strategies.includes('password') ? (
              <Button
                type="button"
                variant="link"
                disabled={isLoading}
                onClick={() => {
                  clearErrors()
                  setPreviousStep('password')
                  setStep('password')
                }}
              >
                Password
              </Button>
            ) : null}
          </CardContent>
          <CardFooter>
            <div className="grid w-full gap-y-4">
              <Button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  clearErrors()
                  setStep(previousStep)
                }}
              >
                Go back
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Enter your password</CardTitle>
              <p className="text-sm text-muted-foreground">Welcome back {email}</p>
            </CardHeader>
            <CardContent className="grid gap-y-4">
              {generalError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {generalError}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
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
                  {isLoading ? <Icons.spinner className="size-4 animate-spin" /> : 'Continue'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={() => {
                    clearErrors()
                    setPreviousStep('password')
                    setStep('choose-strategy')
                  }}
                >
                  Use another method
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}

      {step === 'email_code' && (
        <form onSubmit={handleOtpSubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>Enter the verification code sent to your email</CardDescription>
              <p className="text-sm text-muted-foreground">Welcome back {email}</p>
            </CardHeader>
            <CardContent className="grid gap-y-4">
              {generalError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {generalError}
                </p>
              ) : null}
              <div className="grid items-center justify-center gap-y-2">
                <OtpInputs
                  value={code}
                  disabled={isLoading}
                  onChange={(val) => {
                    setCode(val)
                    if (val.length === 6) {
                      void verifyOtpCode(val)
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
                  onClick={handleResendCode}
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
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={() => {
                    clearErrors()
                    setPreviousStep('email_code')
                    setStep('choose-strategy')
                  }}
                >
                  Use another method
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}
