'use client'

import React, { useState } from 'react'
import { Pin, PinOff, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ChatPanel({
  messages,
  pinnedMessageId,
  onSendMessage,
  onTogglePin,
  onClearMessages,
  youtubeChatStatus = 'idle', // 'connected' | 'inactive' | 'idle'
  isSending = false,
}) {
  const [draft, setDraft] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || isSending) return
    const ok = await onSendMessage(text)
    if (ok !== false) {
      setDraft('')
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {youtubeChatStatus === 'connected'
            ? 'YouTube Live Chat + Room synced'
            : youtubeChatStatus === 'inactive'
              ? 'Room chat active (start YT broadcast to sync)'
              : 'Pin any message to display it on stream.'}
        </p>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={onClearMessages}
            className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-[200px] max-h-[380px]">
        {messages.length === 0 ? (
          <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
            No chat messages yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isPinned = pinnedMessageId === msg.id
            return (
              <div
                key={msg.id}
                className={`rounded-lg border p-2.5 transition ${
                  isPinned ? 'border-white bg-secondary/70' : 'border-border bg-background/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold">{msg.author}</span>
                      {msg.source === 'youtube' ? (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                          YT
                        </span>
                      ) : msg.source === 'room' ? (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Room
                        </span>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="mt-1 break-words text-sm">{msg.text}</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isPinned ? 'default' : 'outline'}
                    onClick={() => onTogglePin(msg.id)}
                    className="h-7 shrink-0 px-2 text-[11px] cursor-pointer"
                  >
                    {isPinned ? (
                      <>
                        <PinOff className="mr-1 size-3" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Pin className="mr-1 size-3" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            youtubeChatStatus === 'connected'
              ? 'Send to YouTube & room chat...'
              : 'Send a room chat message...'
          }
          maxLength={youtubeChatStatus === 'connected' ? 200 : 300}
          className="h-9 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isSending}
          className="h-9 px-3 cursor-pointer"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
