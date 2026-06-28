'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plane, Sparkles, Star, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TravelAnalysisResponse, RankedDestination } from '@/lib/analysis/schemas'

const OPENING_MESSAGE =
  "Hi! I'm your AI travel consultant ✈️\n\nTell me about your dream trip — where are you thinking, how long, what's your budget, and what do you love doing?"

const QUICK_REPLIES = [
  { label: '💎 Hidden gems', diversityMode: 'hidden_gems' },
  { label: '💰 Cheaper alternatives', diversityMode: 'cheaper_options' },
  { label: '😌 Low fatigue routes', diversityMode: 'low_fatigue' },
]

type AnalyzeParams = {
  query: string
  departureCity?: string
  budget: string
  tripLength?: number
  travelMonths: number[]
  interests: string[]
  tripStructure: 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'
  diversityMode?: string
}

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  analysisResult?: TravelAnalysisResponse
}

export interface ChatAnalysisProps {
  onAnalysisComplete?: (analysis: TravelAnalysisResponse) => void
}

export function ChatAnalysis({ onAnalysisComplete }: ChatAnalysisProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'open', role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastParams, setLastParams] = useState<AnalyzeParams | null>(null)
  const [hasResults, setHasResults] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMsg = useCallback((msg: Omit<ChatMsg, 'id'>) => {
    setMessages(prev => [
      ...prev,
      { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ])
  }, [])

  const runAnalysis = useCallback(
    async (params: AnalyzeParams, isVariant = false) => {
      setLastParams(params)
      setIsProcessing(true)

      if (!isVariant) {
        addMsg({ role: 'assistant', content: 'Great! Analyzing 20+ destinations for you... 🔍' })
      } else {
        addMsg({ role: 'assistant', content: 'Searching for alternatives... 🔍' })
      }

      try {
        const res = await fetch('/api/travel/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: params.query,
            departureCity: params.departureCity,
            budget: params.budget,
            tripLength: params.tripLength,
            travelMonths: params.travelMonths,
            interests: params.interests,
            tripStructure: params.tripStructure,
            diversityMode: params.diversityMode,
            forceFresh: true,
            freshRunId: `chat-${Date.now()}`,
          }),
        })

        if (res.status === 429) {
          const data = await res.json()
          if (data.code === 'LIMIT_REACHED') {
            addMsg({
              role: 'assistant',
              content: `You've used all your free analyses this month. Upgrade to Pro for unlimited analyses! 🚀\n\n👉 [Go to Pricing](/dashboard/pricing)`,
            })
            return
          }
        }

        if (!res.ok) throw new Error('Analysis failed')

        const result = await res.json()
        const analysis = result.analysis as TravelAnalysisResponse

        addMsg({ role: 'assistant', content: '', analysisResult: analysis })
        addMsg({
          role: 'assistant',
          content:
            'Want me to try different options? I can look for hidden gems, cheaper alternatives, or lower fatigue routes.',
        })

        setHasResults(true)
        onAnalysisComplete?.(analysis)
      } catch {
        addMsg({
          role: 'assistant',
          content: "Sorry, I couldn't complete that analysis. Please try again.",
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [addMsg, onAnalysisComplete],
  )

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isProcessing) return

    setInput('')
    addMsg({ role: 'user', content: text })
    setIsProcessing(true)

    // Build history for the chat API (text messages only)
    const history = messages
      .filter(m => m.content && !m.analysisResult)
      .map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: text })

    try {
      const res = await fetch('/api/chat/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) throw new Error('Chat API error')

      const data = await res.json()

      if (data.action === 'analyze' && data.params) {
        await runAnalysis(data.params as AnalyzeParams)
      } else if (data.action === 'ask' && data.message) {
        addMsg({ role: 'assistant', content: data.message })
      } else {
        addMsg({
          role: 'assistant',
          content: "I'm not sure I understood that. Could you rephrase?",
        })
      }
    } catch {
      addMsg({ role: 'assistant', content: "Something went wrong. Could you rephrase that?" })
    } finally {
      setIsProcessing(false)
    }
  }, [input, isProcessing, messages, addMsg, runAnalysis])

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden"
      style={{ minHeight: 520, maxHeight: 640 }}>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex items-end gap-2">
            <BotAvatar />
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="block h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Quick-reply buttons — shown after results */}
      {!isProcessing && hasResults && lastParams && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {QUICK_REPLIES.map(qr => (
            <button
              key={qr.diversityMode}
              onClick={() =>
                runAnalysis({ ...lastParams, diversityMode: qr.diversityMode }, true)
              }
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="p-4 border-t border-border bg-background/50">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Tell me about your dream trip…"
            disabled={isProcessing}
            className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 transition-all"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="h-10 w-10 p-0 rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function BotAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Plane className="h-4 w-4 text-primary" />
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMsg }) {
  if (message.analysisResult) {
    return <AnalysisResultCard analysis={message.analysisResult} />
  }

  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-end gap-2', isUser && 'flex-row-reverse')}>
      {!isUser && <BotAvatar />}
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function AnalysisResultCard({ analysis }: { analysis: TravelAnalysisResponse }) {
  const top3: RankedDestination[] = (analysis.rankedDestinations ?? []).slice(0, 3)

  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="flex-1 max-w-[88%]">
        <div className="rounded-2xl rounded-bl-sm bg-muted p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">Here are your top matches:</span>
          </div>

          <div className="space-y-2">
            {top3.length > 0 ? (
              top3.map((dest, i) => (
                <div
                  key={dest.destinationId ?? i}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/70 p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{dest.destinationName}</p>
                    {dest.suggestedRoute && dest.suggestedRoute.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {dest.suggestedRoute.slice(0, 3).join(' → ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold">{dest.totalMatchScore}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {(analysis.topRecommendations ?? []).slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            Scroll down to see the full analysis ↓
          </p>
        </div>
      </div>
    </div>
  )
}
