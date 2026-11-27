"use client"

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Figtree } from 'next/font/google'
import { Camera, Clock, ExternalLink, Eye, Menu, RefreshCw, User } from 'lucide-react'
import { toast } from 'react-toastify'
import { FaYoutube } from 'react-icons/fa'
import { Button } from '../ui/button'
import { Icons } from '../ui/icons'
import StreamDestinationModel from './StreamDestinationModel'
import UserMenu from '@/components/auth/UserMenu'
import { apiFetch } from '@/lib/api-client'

const figtree = Figtree({
  subsets: ['latin'],
})

function formatIsoDuration(iso) {
  if (!iso) return null
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!match) return null
  const hours = Number(match[1] || 0)
  const mins = Number(match[2] || 0)
  const secs = Number(match[3] || 0)
  const pad = (n) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`
}

function formatStreamDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const Mainbar = ({ onOpenMobileMenu }) => {
  const [isStreamDestinationModalVisible, setisStreamDestinationModalVisible] = useState(false)
  const [modalDefaults, setModalDefaults] = useState({
    destination: '',
    youtubeMode: '',
  })

  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyData, setHistoryData] = useState({
    connected: false,
    channel: null,
    broadcasts: [],
  })
  const [historyError, setHistoryError] = useState('')

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await apiFetch('/api/v1/youtube/history')
      setHistoryData({
        connected: Boolean(data.connected),
        channel: data.channel || null,
        broadcasts: data.broadcasts || [],
      })
    } catch (err) {
      setHistoryError(err?.message || 'Could not load past YouTube streams')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('yt_modal') === '1') {
      setModalDefaults({ destination: 'youtube', youtubeMode: 'google' })
      setisStreamDestinationModalVisible(true)

      const ytError = params.get('yt_error')
      if (ytError) {
        toast.error(ytError, { theme: 'dark' })
      } else if (params.get('yt_connected') === '1') {
        toast.success('Google / YouTube connected!', { theme: 'dark' })
        loadHistory()
      }

      window.history.replaceState({}, '', '/dashboard')
    }
  }, [loadHistory])

  const navToYTStream = () => {
    setModalDefaults({ destination: '', youtubeMode: '' })
    setisStreamDestinationModalVisible(true)
  }

  const navToRecord = async () => {
    await toast('Recording is currently unavailable', {
      theme: 'dark',
    })
  }

  return (
    <>
      {isStreamDestinationModalVisible ? (
        <StreamDestinationModel
          setIsVisible={(visible) => {
            setisStreamDestinationModalVisible(visible)
            if (!visible) {
              loadHistory()
            }
          }}
          initialDestination={modalDefaults.destination}
          initialYoutubeMode={modalDefaults.youtubeMode}
        />
      ) : null}

      <div className={`px-4 py-5 sm:px-8 sm:py-7 lg:px-14 lg:py-8 ${figtree.className}`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="rounded-lg border border-border bg-neutral-900/80 p-2 text-white transition hover:bg-neutral-800 cursor-pointer"
            >
              <Menu className="size-5" />
            </button>
            <Link href="/" className="flex items-center text-xl font-bold">
              Stream<span className="text-2xl text-orange-400">X</span>
              <span className="text-2xl text-orange-400">T</span>
            </Link>
          </div>

          <div className="ml-auto text-white">
            <UserMenu />
          </div>
        </div>

        {/* Stream Actions */}
        <section className="mt-8 sm:mt-10">
          <h1 className="text-xl font-bold sm:text-2xl">Stream</h1>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-6">
            <Button
              className="flex h-auto w-full items-center justify-start gap-4 border-red-500/50 bg-gradient-to-br from-red-600/90 to-red-700/90 px-6 py-5 text-white shadow-lg transition-all duration-300 hover:from-red-500/90 hover:to-red-600/90 hover:shadow-red-500/25 lg:w-64 lg:justify-center lg:py-6 cursor-pointer"
              variant="outline"
              onClick={navToYTStream}
            >
              <FaYoutube size={30} className="shrink-0 text-white" />
              <span className="text-base font-semibold sm:text-lg">Stream to YouTube</span>
            </Button>

            <Button
              className="flex h-auto w-full items-center justify-start gap-4 border-purple-500/50 bg-gradient-to-br from-purple-600/90 to-purple-700/90 px-6 py-5 text-white shadow-lg transition-all duration-300 hover:from-purple-500/90 hover:to-purple-600/90 hover:shadow-purple-500/25 lg:w-64 lg:justify-center lg:py-6 cursor-pointer"
              variant="outline"
              onClick={navToRecord}
            >
              <Camera size={30} className="shrink-0 text-white" />
              <span className="text-base font-semibold sm:text-lg">Record Video</span>
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-10 sm:mt-12">
          <h2 className="text-xl font-bold sm:text-2xl">Your stats</h2>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-8">
            <div className="stat-box relative w-full overflow-hidden rounded-lg border border-blue-700/30 bg-gradient-to-br from-blue-900/20 to-blue-800/10 px-5 py-4 backdrop-blur-sm lg:w-60">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
              <p className="text-xs uppercase tracking-wide text-blue-200/80 sm:text-sm">
                hours streamed
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-100">100 hours</p>
              <Clock className="absolute right-4 top-4 text-blue-400/40" size={36} />
            </div>

            <div className="stat-box relative w-full overflow-hidden rounded-lg border border-emerald-700/30 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 px-5 py-4 backdrop-blur-sm lg:w-60">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent" />
              <p className="text-xs uppercase tracking-wide text-emerald-200/80 sm:text-sm">
                subscribers gained
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">+500</p>
              <User className="absolute right-4 top-4 text-emerald-400/40" size={36} />
            </div>
          </div>
        </section>

        {/* Past YouTube Streams */}
        <section id="past-streams" className="mt-10 sm:mt-12 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold sm:text-2xl">Past YouTube Streams</h2>
              {historyData.connected && historyData.channel?.title ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 text-xs text-neutral-300">
                  <FaYoutube className="size-3.5 text-red-500" />
                  {historyData.channel.title}
                </span>
              ) : null}
            </div>

            {historyData.connected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={historyLoading}
                className="cursor-pointer"
              >
                <RefreshCw className={`mr-1.5 size-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            ) : null}
          </div>

          {historyError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {historyError}
            </div>
          ) : null}

          {historyLoading ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-56 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50"
                />
              ))}
            </div>
          ) : !historyData.connected ? (
            <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-white">
                  Connect your YouTube account to view past broadcasts
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Sign in with Google to display your completed YouTube live streams here.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.location.href =
                    '/api/v1/youtube/oauth/start?redirect=/dashboard?yt_modal=1'
                }}
                className="shrink-0 cursor-pointer"
              >
                <Icons.google className="mr-2 size-4" />
                Connect with Google
              </Button>
            </div>
          ) : historyData.broadcasts.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-400">
              No completed YouTube live broadcasts found on this channel yet.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {historyData.broadcasts.map((item) => {
                const duration = formatIsoDuration(item.duration)
                const dateLabel = formatStreamDate(item.endedAt || item.publishedAt)

                return (
                  <a
                    key={item.id}
                    href={item.watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 transition hover:border-neutral-600 hover:bg-neutral-900"
                  >
                    <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-600">
                          <FaYoutube size={40} />
                        </div>
                      )}

                      {duration ? (
                        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
                          {duration}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-orange-300 transition">
                          {item.title}
                        </h3>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-neutral-400">
                        <div className="flex items-center gap-3">
                          {dateLabel ? <span>{dateLabel}</span> : null}
                          {item.viewCount !== null ? (
                            <span className="inline-flex items-center gap-1">
                              <Eye className="size-3.5" />
                              {item.viewCount.toLocaleString()}
                            </span>
                          ) : null}
                        </div>

                        <span className="inline-flex items-center gap-1 text-neutral-300 group-hover:text-white">
                          Watch
                          <ExternalLink className="size-3" />
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export default Mainbar
