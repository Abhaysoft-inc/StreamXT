"use client"

import React, { useState } from 'react'
import { Figtree } from 'next/font/google'
import { FaX } from 'react-icons/fa6'
import { CiStreamOn } from 'react-icons/ci'
import { IoMdAdd } from 'react-icons/io'
import { FaYoutube } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'

const figtree = Figtree({
  subsets: ['latin'],
})

const StreamDestinationModel = ({ setIsVisible }) => {
  const router = useRouter()
  const [streamDestination, setstreamDestination] = useState('')
  const [youtubeStreamKey, setyoutubeStreamKey] = useState('')

  const handleGoLive = async () => {
    if (streamDestination === 'youtube') {
      if (youtubeStreamKey.trim() === '') {
        toast("YouTube Stream Key Can't be blank!", { theme: 'dark' })
        return
      }
      sessionStorage.setItem('YTStreamKey', youtubeStreamKey.trim())
      router.push('/stream')
    }
  }

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
            onClick={() => setstreamDestination('youtube')}
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
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="rtmp://your-server-url/live"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Stream Key</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Your stream key"
                />
              </div>
            </div>
          ) : streamDestination === 'youtube' ? (
            <div className="space-y-4">
              <h3 className="text-base font-semibold sm:text-lg">YouTube Stream Settings</h3>
              <div>
                <label className="mb-1 block text-sm">Stream Key</label>
                <input
                  type="text"
                  value={youtubeStreamKey}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Your YouTube stream key"
                  onChange={(e) => setyoutubeStreamKey(e.target.value)}
                />
              </div>
              <Button className="w-full sm:w-auto cursor-pointer" onClick={handleGoLive}>
                Go Live!
              </Button>
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
