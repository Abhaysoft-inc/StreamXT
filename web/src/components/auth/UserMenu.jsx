'use client'

import React, { useEffect, useRef, useState } from 'react'
import { LogOut, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'

function getInitials(user) {
  const source = user?.name || user?.username || user?.email || 'U'
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export default function UserMenu() {
  const { user, isLoading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  if (isLoading) {
    return (
      <div className="h-9 w-28 animate-pulse rounded-full bg-neutral-800/80" />
    )
  }

  if (!user) {
    return null
  }

  const displayName = user.username || user.name || user.email

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-sm font-medium text-white transition hover:border-neutral-700 hover:bg-neutral-800 cursor-pointer"
      >
        <span className="max-w-[140px] truncate">{displayName}</span>
        <Avatar className="size-7 border border-neutral-700">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="bg-orange-600/20 text-xs font-semibold text-orange-300">
            {getInitials(user)}
          </AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-neutral-800 bg-[#171717] p-2 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 px-2 py-2.5">
            <Avatar className="size-9 border border-neutral-700">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-orange-600/20 text-xs font-semibold text-orange-300">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-neutral-400">{user.email}</p>
            </div>
          </div>

          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-neutral-400">
              <UserIcon className="size-3.5" />
              <span className="truncate">@{user.username || 'user'}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-400 transition hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
