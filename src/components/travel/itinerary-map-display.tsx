'use client'

import { useEffect, useState } from 'react'
import type { ItineraryMapPlan } from '@/lib/analysis/schemas'
import { ItineraryGoogleMap } from './itinerary-google-map'
import { VisualRouteTimeline } from './visual-route-timeline'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

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
  const [shouldShowMap, setShouldShowMap] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)

  useEffect(() => {
    if (!plan) {
      setShouldShowMap(false)
      return
    }

    // Trigger map opened event
    if (onMapOpened) {
      onMapOpened()
    }

    // Check if we should show Google Maps
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const stopsWithCoords = plan.stops.filter(s => s.lat !== null && s.lng !== null)

    // Determine if map should be shown
    if (!apiKey) {
      setShouldShowMap(false)
      setFallbackReason('Google Maps API key not configured')
    } else if (!plan.mapAvailable) {
      setShouldShowMap(false)
      setFallbackReason('Map marked as unavailable')
    } else if (stopsWithCoords.length < 2) {
      setShouldShowMap(false)
      setFallbackReason(`Only ${stopsWithCoords.length} stop(s) have coordinates`)
    } else {
      setShouldShowMap(true)
      setFallbackReason(null)
    }
  }, [plan, onMapOpened])

  if (!plan) return null

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Smart Route & Itinerary Map
      </h3>
      
      {shouldShowMap ? (
        <div className="space-y-4">
          <ItineraryGoogleMap 
            plan={plan}
            onStopSelected={onStopSelected}
          />
          <VisualRouteTimeline 
            plan={plan}
            onStopSelected={onStopSelected}
            onDayPlanOpened={onDayPlanOpened}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {fallbackReason && (
            <Alert variant="default" className="border-muted bg-muted/30">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-sm text-muted-foreground">
                <div className="font-medium">Interactive map unavailable</div>
                <div className="text-xs mt-1">Showing visual route plan instead.</div>
              </AlertDescription>
            </Alert>
          )}
          <VisualRouteTimeline 
            plan={plan}
            onStopSelected={onStopSelected}
            onDayPlanOpened={onDayPlanOpened}
          />
        </div>
      )}
    </div>
  )
}
