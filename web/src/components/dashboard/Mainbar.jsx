"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Figtree } from 'next/font/google'
import { Camera, Clock, Menu, User } from 'lucide-react'
import { toast } from 'react-toastify'
import { FaYoutube } from 'react-icons/fa'
import { Button } from '../ui/button'
import StreamDestinationModel from './StreamDestinationModel'
import UserMenu from '@/components/auth/UserMenu'

const figtree = Figtree({
  subsets: ['latin'],
})

const Mainbar = ({ onOpenMobileMenu }) => {
  const [isStreamDestinationModalVisible, setisStreamDestinationModalVisible] = useState(false)

  const navToYTStream = () => {
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
        <StreamDestinationModel setIsVisible={setisStreamDestinationModalVisible} />
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
      </div>
    </>
  )
}

export default Mainbar
