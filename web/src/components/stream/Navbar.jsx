'use client'

import React from 'react'
import { Dot, ExternalLink } from 'lucide-react'
import { Figtree } from 'next/font/google'

const figtree = Figtree({
  subsets: ['latin'],
})

const Navbar = ({ isStreaming, watchUrl, onStartStreaming, onStopStreaming }) => {
  const handleGoLiveClick = () => {
    if (isStreaming) {
      onStopStreaming()
    } else {
      onStartStreaming()
    }
  }

  function sendToHome() {
    window.location = '/dashboard'
  }

  return (
    <div className="navbar">
      <div className={`${figtree.className} px-4 sm:px-10 py-2 items-center bg-transparent`}>
        <div className="flex justify-between items-center">
          <p
            className="brand text-2xl font-bold flex items-center sm:ml-4 cursor-pointer"
            onClick={sendToHome}
          >
            Stream<span className="text-orange-400 text-3xl cursor-pointer">X</span>
            <span className="text-orange-400 text-3xl">T</span>
          </p>

          <ul className="nav-menu flex gap-4 sm:gap-6 items-center">
            {watchUrl ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs sm:text-sm text-neutral-300 hover:text-white"
              >
                <span>YouTube Link</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}

            <button
              type="button"
              data-ripple-dark="true"
              className={`flex items-center ${
                isStreaming ? 'bg-gray-500' : 'bg-red-500'
              } pr-3 pl-1 py-1 rounded-full font-semibold cursor-pointer text-white`}
              onClick={handleGoLiveClick}
            >
              <Dot className="scale-[250%]" /> {isStreaming ? 'Stop Live' : 'Go Live'}
            </button>
          </ul>
        </div>
      </div>
      <div className="w-full border-b-[0.5px] opacity-30 bg-white"></div>
    </div>
  )
}

export default Navbar
