'use client'

import type { ItineraryMapPlan } from '@/lib/analysis/schemas'
import { VisualRouteTimeline } from './visual-route-timeline'

interface ItineraryMapDisplayProps {
  plan?: ItineraryMapPlan
  onStopSelected?: (stopId: string, stopName: string, day: number) => void
  onDayPlanOpened?: (day: number) => void
  onMapOpened?: () => void
}

export function ItineraryMapDisplay({ 
  plan, 
  onStopSelected, 
  onDayPlanOpened,
  onMapOpened 
}: ItineraryMapDisplayProps) {
  if (!plan) return null

  // Trigger map opened event
  if (onMapOpened) {
    onMapOpened()
  }

  // For now, always show visual timeline
  // TODO: Add Google Maps integration when mapAvailable=true and API key is configured
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Smart Route & Itinerary Map
      </h3>
      <VisualRouteTimeline 
        plan={plan}
        onStopSelected={onStopSelected}
        onDayPlanOpened={onDayPlanOpened}
      />
    </div>
  )
}
