'use client'

import { useEffect, useState } from 'react'
import { Plane, Compass, Sparkles, Brain, Shield, Route } from 'lucide-react'

const loadingMessages = [
  'Analyzing route realism...',
  'Matching your budget...',
  'Reviewing passport requirements...',
  'Building your itinerary...',
  'Scoring travel fatigue...',
  'Checking seasonal timing...',
  'Optimizing connections...',
  'Finalizing recommendations...',
]

export function TravelLoading() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      {/* Animated route with plane */}
      <div className="relative w-full max-w-md h-24">
        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 100">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="hsl(174 84% 40%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Dotted route line */}
          <path
            d="M 20 50 Q 100 30, 200 50 T 380 50"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="2"
            strokeDasharray="8 4"
            className="opacity-60"
          />
          
          {/* Waypoint dots */}
          <circle cx="20" cy="50" r="4" fill="hsl(217 91% 60%)" className="animate-pulse" />
          <circle cx="200" cy="50" r="4" fill="hsl(174 84% 40%)" className="animate-pulse delay-100" />
          <circle cx="380" cy="50" r="4" fill="hsl(217 91% 60%)" className="animate-pulse delay-200" />
        </svg>
        
        {/* Animated plane */}
        <div className="absolute top-1/2 -translate-y-1/2 animate-plane-travel">
          <Plane className="h-6 w-6 text-primary rotate-45" />
        </div>
      </div>

      {/* Rotating icons */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 animate-pulse">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 animate-pulse delay-100">
          <Compass className="h-6 w-6 text-accent animate-spin-slow" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 animate-pulse delay-200">
          <Sparkles className="h-6 w-6 text-warning" />
        </div>
      </div>

      {/* Loading message */}
      <div className="text-center space-y-3">
        <p className="text-lg font-semibold text-foreground animate-fade-in">
          {loadingMessages[messageIndex]}
        </p>
        <p className="text-sm text-muted-foreground">
          This may take a few moments
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-100" />
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-200" />
      </div>
    </div>
  )
}
