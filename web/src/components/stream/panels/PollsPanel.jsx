'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PollsPanel({
  poll,
  showPollOnStream,
  onCreatePoll,
  onVoteOption,
  onToggleShowOnStream,
  onEndPoll,
  youtubeConnected = false,
  isBusy = false,
}) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)))
  }

  const handleAddOption = () => {
    if (options.length >= 4) return
    setOptions((prev) => [...prev, ''])
  }

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isBusy) return
    const cleanQuestion = question.trim()
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!cleanQuestion || cleanOptions.length < 2) return

    const ok = await onCreatePoll({
      id: `poll-${Date.now()}`,
      question: cleanQuestion,
      options: cleanOptions.map((label, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        label,
        votes: 0,
      })),
    })
    if (ok !== false) {
      setQuestion('')
      setOptions(['', ''])
    }
  }

  const totalVotes = poll ? poll.options.reduce((sum, opt) => sum + opt.votes, 0) : 0
  const isYouTubePoll = poll?.source === 'youtube'

  return (
    <div className="space-y-4">
      {poll ? (
        <div className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </p>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isYouTubePoll
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {isYouTubePoll ? 'YouTube Live Poll' : 'Room Poll'}
            </span>
          </div>
          <h4 className="text-sm font-semibold">{poll.question}</h4>

          <div className="space-y-2">
            {poll.options.map((opt) => {
              const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isYouTubePoll}
                  onClick={() => onVoteOption(opt.id)}
                  title={isYouTubePoll ? 'Viewers vote inside YouTube chat' : 'Vote in room poll'}
                  className={`relative w-full overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-left transition ${
                    isYouTubePoll
                      ? 'cursor-default'
                      : 'hover:border-white/50 cursor-pointer'
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-white/15 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">{opt.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {pct}% ({opt.votes})
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {isYouTubePoll
              ? 'Tallies sync automatically from YouTube Live Chat.'
              : 'Guests in the call can vote live, or click an option above.'}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant={showPollOnStream ? 'default' : 'outline'}
              onClick={() => onToggleShowOnStream(!showPollOnStream)}
              className="flex-1 cursor-pointer"
            >
              {showPollOnStream ? (
                <>
                  <EyeOff className="mr-1.5 size-3.5" />
                  Hide from Stream
                </>
              ) : (
                <>
                  <Eye className="mr-1.5 size-3.5" />
                  Show on Stream
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={onEndPoll}
              className="cursor-pointer"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              End
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="poll-question" className="text-xs text-muted-foreground">
              Poll Question
            </Label>
            <Input
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we build next?"
              maxLength={150}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Options (2–4)</Label>
              {options.length < 4 ? (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Add option
                </button>
              ) : null}
            </div>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={60}
                  required
                  className="h-8 text-sm"
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    aria-label="Remove option"
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {youtubeConnected
              ? 'Launches on YouTube Live Chat when connected (falls back to room poll if broadcast is offline).'
              : 'Launches a real-time poll for everyone in the studio room.'}
          </p>

          <Button type="submit" variant="outline" disabled={isBusy} className="w-full cursor-pointer">
            {isBusy ? 'Launching...' : 'Launch Poll'}
          </Button>
        </form>
      )}
    </div>
  )
}
