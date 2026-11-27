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

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanQuestion = question.trim()
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!cleanQuestion || cleanOptions.length < 2) return

    onCreatePoll({
      question: cleanQuestion,
      options: cleanOptions.map((label, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        label,
        votes: 0,
      })),
    })
    setQuestion('')
    setOptions(['', ''])
  }

  const totalVotes = poll ? poll.options.reduce((sum, opt) => sum + opt.votes, 0) : 0

  return (
    <div className="space-y-4">
      {poll ? (
        <div className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5">
          <div>
            <p className="text-xs text-muted-foreground">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </p>
            <h4 className="mt-1 text-sm font-semibold">{poll.question}</h4>
          </div>

          <div className="space-y-2">
            {poll.options.map((opt) => {
              const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVoteOption(opt.id)}
                  title="Click to simulate +1 vote"
                  className="relative w-full overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-left transition hover:border-white/50 cursor-pointer"
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
            Click any option to simulate live votes.
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

          <Button type="submit" variant="outline" className="w-full cursor-pointer">
            Launch Poll
          </Button>
        </form>
      )}
    </div>
  )
}
