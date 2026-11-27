'use client'

import React from 'react'
import { ChartBar, MessageCircle, Pencil, Sticker } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Figtree } from 'next/font/google'

const figtree = Figtree({
  subsets: ['latin'],
})

const TOOLS = [
  { id: 'brand', label: 'Brand', icon: Pencil },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'polls', label: 'Polls', icon: ChartBar },
  { id: 'overlays', label: 'Overlays', icon: Sticker },
]

const Toolbar = ({ activePanel, onSelectPanel }) => {
  return (
    <div
      className={`toolbar flex flex-row lg:flex-col justify-center lg:justify-start gap-6 lg:gap-4 lg:w-[88px] shrink-0 pt-2 ${figtree.className}`}
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon
        const isActive = activePanel === tool.id

        return (
          <div key={tool.id} className="flex flex-col items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSelectPanel(isActive ? null : tool.id)}
              className={`rounded-[100%] h-10 w-10 cursor-pointer ${
                isActive ? 'bg-white text-black hover:bg-white/90 hover:text-black border-white' : ''
              }`}
            >
              <Icon />
            </Button>
            <p className="text-center mt-2 text-sm">{tool.label}</p>
          </div>
        )
      })}
    </div>
  )
}

export default Toolbar
