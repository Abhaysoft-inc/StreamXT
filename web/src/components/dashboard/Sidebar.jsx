"use client"

import React from 'react'
import Link from 'next/link'
import { Figtree } from 'next/font/google'
import { Settings, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { FaHistory, FaHome } from 'react-icons/fa'

const figtree = Figtree({
  subsets: ['latin'],
})

const Sidebar = ({ onClose }) => {
  const handleUnavailable = (label) => {
    toast(`${label} is currently unavailable`, { theme: 'dark' })
    onClose?.()
  }

  const scrollToRecentStreams = () => {
    document.getElementById('past-streams')?.scrollIntoView({ behavior: 'smooth' })
    onClose?.()
  }

  return (
    <div
      className={`flex h-full w-full flex-col justify-between border-r border-border bg-background px-4 py-6 lg:py-8 ${figtree.className}`}
    >
      <div>
        <div className="flex items-center justify-between px-2">
          <Link
            href="/"
            onClick={() => onClose?.()}
            className="brand flex items-center text-2xl font-bold cursor-pointer"
          >
            Stream<span className="text-3xl text-orange-400">X</span>
            <span className="text-3xl text-orange-400">T</span>
          </Link>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <ul className="mt-8 space-y-3 list-none">
          <li>
            <Link
              href="/dashboard"
              onClick={() => onClose?.()}
              className="flex items-center gap-3 rounded-full bg-[#141212] px-4 py-3 text-base font-medium transition hover:bg-[#292626] cursor-pointer"
            >
              <FaHome />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={scrollToRecentStreams}
              className="flex w-full items-center gap-3 rounded-full bg-[#141212] px-4 py-3 text-left text-base font-medium transition hover:bg-[#292626] cursor-pointer"
            >
              <FaHistory />
              <span>Recent Streams</span>
            </button>
          </li>
        </ul>
      </div>

      <div className="pt-6">
        <button
          type="button"
          onClick={() => handleUnavailable('Settings')}
          className="flex w-full items-center gap-3 rounded-full bg-[#141212] px-4 py-3 text-left text-base font-medium transition hover:bg-[#292626] cursor-pointer"
        >
          <Settings className="size-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
