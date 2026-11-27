"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { Figtree } from 'next/font/google'
import { FaX } from 'react-icons/fa6'
import { CiStreamOn } from 'react-icons/ci'
import { IoMdAdd } from 'react-icons/io'
import { FaYoutube } from 'react-icons/fa'
import { Globe, KeyRound, Link2, Lock, Plus, RefreshCw, Unlink } from 'lucide-react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { Icons } from '../ui/icons'
import { apiFetch } from '@/lib/api-client'

const figtree = Figtree({
  subsets: ['latin'],
})

function maskKey(key) {
  if (!key || key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

const StreamDestinationModel = ({
  setIsVisible,
  initialDestination = '',
  initialYoutubeMode = '',
}) => {
  const router = useRouter()
  const [streamDestination, setstreamDestination] = useState(initialDestination)
  const [youtubeMode, setYoutubeMode] = useState(initialYoutubeMode) // '' | 'manual' | 'google'
  const [youtubeStreamKey, setyoutubeStreamKey] = useState('')
  const [customRtmpUrl, setCustomRtmpUrl] = useState('')
  const [customStreamKey, setCustomStreamKey] = useState('')

  // Google / YouTube OAuth state
  const [ytLoading, setYtLoading] = useState(false)
  const [ytConnection, setYtConnection] = useState(null)
  const [ytStreams, setYtStreams] = useState([])
  const [selectedStreamId, setSelectedStreamId] = useState('')
  const [newStreamTitle, setNewStreamTitle] = useState('')
  const [isCreatingStream, setIsCreatingStream] = useState(false)
  const [ytError, setYtError] = useState('')

  const loadYouTubeStreams = useCallback(async () => {
    setYtError('')
    setYtLoading(true)
    try {
      const conn = await apiFetch('/api/v1/youtube/connection')
      setYtConnection(conn)

      if (conn.connected) {
        const streamsData = await apiFetch('/api/v1/youtube/streams')
        const list = streamsData.streams || []
        setYtStreams(list)
        if (list.length > 0) {
          setSelectedStreamId((prev) => prev || list[0].id)
        }
      } else {
        setYtStreams([])
      }
    } catch (err) {
      setYtError(err?.message || 'Failed to load YouTube account details')
    } finally {
      setYtLoading(false)
    }
  }, [])

  useEffect(() => {
    if (streamDestination === 'youtube' && youtubeMode === 'google') {
      loadYouTubeStreams()
    }
  }, [streamDestination, youtubeMode, loadYouTubeStreams])

  const handleGoLiveWithKey = (key, title) => {
    const trimmed = (key || '').trim()
    if (!trimmed) {
      toast("YouTube Stream Key Can't be blank!", { theme: 'dark' })
      return
    }
    sessionStorage.setItem('YTStreamKey', trimmed)
    sessionStorage.setItem(
      'StreamTarget',
      JSON.stringify({
        destination: 'youtube',
        streamKey: trimmed,
        title: title || 'YouTube Live',
      }),
    )
    router.push('/stream')
  }

  const handleGoLiveCustomRtmp = () => {
    const url = customRtmpUrl.trim()
    const key = customStreamKey.trim()
    if (!url || !/^rtmps?:\/\/.+/i.test(url)) {
      toast('Enter a valid rtmp:// or rtmps:// URL', { theme: 'dark' })
      return
    }
    if (!key) {
      toast("Stream Key can't be blank!", { theme: 'dark' })
      return
    }
    sessionStorage.setItem('YTStreamKey', key)
    sessionStorage.setItem(
      'StreamTarget',
      JSON.stringify({
        destination: 'custom_rtmp',
        rtmpUrl: url,
        streamKey: key,
        title: 'Custom RTMP Live',
      }),
    )
    router.push('/stream')
  }

  const handleCreateYouTubeStream = async (e) => {
    e.preventDefault()
    const title = newStreamTitle.trim()
    if (!title) return
    setIsCreatingStream(true)
    setYtError('')
    try {
      const data = await apiFetch('/api/v1/youtube/streams', {
        method: 'POST',
        body: { title },
      })
      if (data.stream) {
        setYtStreams((prev) => [data.stream, ...prev])
        setSelectedStreamId(data.stream.id)
        setNewStreamTitle('')
        toast.success('Created YouTube stream key!', { theme: 'dark' })
      }
    } catch (err) {
      setYtError(err?.message || 'Could not create YouTube stream key')
    } finally {
      setIsCreatingStream(false)
    }
  }

  const handleDisconnectYouTube = async () => {
    setYtLoading(true)
    try {
      await apiFetch('/api/v1/youtube/connection', { method: 'DELETE' })
      setYtConnection({ connected: false, googleConfigured: ytConnection?.googleConfigured, channel: null })
      setYtStreams([])
      setSelectedStreamId('')
    } catch (err) {
      toast.error(err?.message || 'Failed to disconnect YouTube', { theme: 'dark' })
    } finally {
      setYtLoading(false)
    }
  }

  const selectedStream = ytStreams.find((s) => s.id === selectedStreamId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setIsVisible(false)}
    >
      <div
        className={`relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-800 bg-[#222] p-5 sm:p-6 shadow-2xl ${figtree.className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg font-semibold sm:text-xl">Setup Stream Destination</p>
          <button
            type="button"
            aria-label="Close modal"
            onClick={() => setIsVisible(false)}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white cursor-pointer"
          >
            <FaX size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:flex sm:gap-6">
          <button
            type="button"
            onClick={() => setstreamDestination('customRTMP')}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div
              className={`rounded-2xl border p-3 transition ${
                streamDestination === 'customRTMP'
                  ? 'border-orange-400 bg-gray-700'
                  : 'border-transparent bg-gray-800 group-hover:bg-gray-700'
              }`}
            >
              <CiStreamOn size={28} />
            </div>
            <span className="mt-1.5 text-center text-xs">Custom RTMP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setstreamDestination('youtube')
              setYoutubeMode('')
            }}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div
              className={`rounded-2xl border p-3 transition ${
                streamDestination === 'youtube'
                  ? 'border-red-500 bg-gray-700'
                  : 'border-transparent bg-gray-800 group-hover:bg-gray-700'
              }`}
            >
              <FaYoutube size={28} className="text-red-500" />
            </div>
            <span className="mt-1.5 text-center text-xs">YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => toast('Additional destinations coming soon', { theme: 'dark' })}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="rounded-2xl border border-transparent bg-gray-800 p-3 transition group-hover:bg-gray-700">
              <IoMdAdd size={28} />
            </div>
            <span className="mt-1.5 text-center text-xs">Add new destination</span>
          </button>
        </div>

        <div className="mt-6">
          {streamDestination === 'customRTMP' ? (
            <div className="space-y-4">
              <h3 className="text-base font-semibold sm:text-lg">Custom RTMP Settings</h3>
              <div>
                <label className="mb-1 block text-sm">RTMP URL</label>
                <input
                  type="text"
                  value={customRtmpUrl}
                  onChange={(e) => setCustomRtmpUrl(e.target.value)}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="rtmp://your-server-url/live"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Stream Key</label>
                <input
                  type="password"
                  value={customStreamKey}
                  onChange={(e) => setCustomStreamKey(e.target.value)}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Your stream key"
                />
              </div>
              <Button className="w-full sm:w-auto cursor-pointer" onClick={handleGoLiveCustomRtmp}>
                Go Live!
              </Button>
            </div>
          ) : streamDestination === 'youtube' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold sm:text-lg">YouTube Stream</h3>
                {youtubeMode ? (
                  <button
                    type="button"
                    onClick={() => setYoutubeMode('')}
                    className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Change method
                  </button>
                ) : null}
              </div>

              {/* Two options when clicking YouTube */}
              {!youtubeMode ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setYoutubeMode('manual')}
                    className="flex flex-col items-start gap-2 rounded-xl border border-neutral-700 bg-neutral-900/70 p-4 text-left transition hover:border-neutral-500 hover:bg-neutral-800/80 cursor-pointer"
                  >
                    <div className="rounded-lg bg-neutral-800 p-2">
                      <KeyRound className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Enter Stream Key</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        Paste your YouTube Studio stream key manually
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setYoutubeMode('google')}
                    className="flex flex-col items-start gap-2 rounded-xl border border-neutral-700 bg-neutral-900/70 p-4 text-left transition hover:border-neutral-500 hover:bg-neutral-800/80 cursor-pointer"
                  >
                    <div className="rounded-lg bg-neutral-800 p-2">
                      <Icons.google className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Login with Google</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        Connect your YouTube account &amp; fetch stream keys
                      </p>
                    </div>
                  </button>
                </div>
              ) : null}

              {/* Option 1: Manual Stream Key */}
              {youtubeMode === 'manual' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm">Stream Key</label>
                    <input
                      type="password"
                      value={youtubeStreamKey}
                      className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500"
                      placeholder="Your YouTube stream key"
                      onChange={(e) => setyoutubeStreamKey(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full sm:w-auto cursor-pointer"
                    onClick={() => handleGoLiveWithKey(youtubeStreamKey)}
                  >
                    Go Live!
                  </Button>
                </div>
              ) : null}

              {/* Option 2: Google OAuth -> Fetch YouTube Stream Keys */}
              {youtubeMode === 'google' ? (
                <div className="space-y-4">
                  {ytError ? (
                    <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {ytError}
                    </p>
                  ) : null}

                  {ytLoading ? (
                    <div className="flex items-center justify-center py-8 text-sm text-neutral-400">
                      <Icons.spinner className="mr-2 size-4 animate-spin" />
                      Loading YouTube account...
                    </div>
                  ) : ytConnection?.connected ? (
                    <div className="space-y-4">
                      {/* Connected Channel Header */}
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900/70 px-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {ytConnection.channel?.thumbnail ? (
                            <img
                              src={ytConnection.channel.thumbnail}
                              alt={ytConnection.channel.title || 'YouTube Channel'}
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <FaYoutube className="size-6 shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {ytConnection.channel?.title || 'Connected YouTube Account'}
                            </p>
                            <p className="text-[11px] text-emerald-400">Connected via Google</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={loadYouTubeStreams}
                            title="Refresh stream keys"
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
                          >
                            <RefreshCw className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDisconnectYouTube}
                            title="Disconnect Google account"
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 cursor-pointer"
                          >
                            <Unlink className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Fetched Stream Keys */}
                      {ytStreams.length > 0 ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-neutral-300">
                            Select a YouTube Stream Key
                          </label>
                          <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                            {ytStreams.map((item) => {
                              const active = selectedStreamId === item.id
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setSelectedStreamId(item.id)}
                                  className={`w-full rounded-lg border p-2.5 text-left transition cursor-pointer ${
                                    active
                                      ? 'border-white bg-neutral-800'
                                      : 'border-neutral-700 bg-neutral-900/60 hover:border-neutral-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-medium text-white">
                                      {item.title}
                                    </span>
                                    <span className="font-mono text-xs text-neutral-400">
                                      {maskKey(item.streamKey)}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed border-neutral-700 p-3 text-center text-xs text-neutral-400">
                          No existing YouTube stream keys found. Create one below!
                        </p>
                      )}

                      {/* Create New YouTube Stream Key */}
                      <form onSubmit={handleCreateYouTubeStream} className="flex gap-2">
                        <input
                          type="text"
                          value={newStreamTitle}
                          onChange={(e) => setNewStreamTitle(e.target.value)}
                          placeholder="New stream key name (e.g. StreamXT Live)"
                          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs outline-none focus:border-gray-500"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={isCreatingStream || !newStreamTitle.trim()}
                          className="cursor-pointer"
                        >
                          {isCreatingStream ? (
                            <Icons.spinner className="size-3.5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="mr-1 size-3.5" />
                              Create
                            </>
                          )}
                        </Button>
                      </form>

                      <Button
                        className="w-full cursor-pointer"
                        disabled={!selectedStream}
                        onClick={() =>
                          handleGoLiveWithKey(selectedStream?.streamKey, selectedStream?.title)
                        }
                      >
                        Use Selected Key &amp; Go Live!
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 text-center">
                      <p className="text-sm text-neutral-200">
                        Sign in with Google to automatically fetch or create your YouTube stream key.
                      </p>
                      {ytConnection && !ytConnection.googleConfigured ? (
                        <p className="text-xs text-amber-300">
                          Google OAuth credentials are not set in <code>api/.env</code> yet (
                          <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code>).
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        onClick={() => {
                          window.location.href =
                            '/api/v1/youtube/oauth/start?redirect=/dashboard?yt_modal=1'
                        }}
                      >
                        <Icons.google className="mr-2 size-4" />
                        Continue with Google
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="py-8 text-center text-base text-neutral-400 sm:text-lg">
              <p>Please select a streaming destination</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreamDestinationModel
