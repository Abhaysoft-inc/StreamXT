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
}) {
  const [draft, setDraft] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSendMessage(text)
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Pin a message to show it on your stream.
        </p>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={onClearMessages}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
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
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold">{msg.author}</span>
                      <span className="text-[11px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="mt-1 break-words text-sm">{msg.text}</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isPinned ? 'default' : 'outline'}
                    onClick={() => onTogglePin(msg.id)}
                    className="h-7 px-2 text-[11px] cursor-pointer"
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
          placeholder="Send a chat message..."
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" className="h-9 px-3 cursor-pointer">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
