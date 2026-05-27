'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SafeItineraryMapProps {
  route?: string[] | null
  itineraryMapPlan?: any
  destinationName?: string
}

export function SafeItineraryMap({ route, itineraryMapPlan, destinationName }: SafeItineraryMapProps) {
  const [mapError, setMapError] = useState(false)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  useEffect(() => {
    // Check if API key exists
    if (typeof window !== 'undefined') {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        setApiKeyMissing(true)
      }
    }
  }, [])

  // If no route data, show fallback
  if (!route || route.length === 0) {
    return <RouteListFallback route={[]} destinationName={destinationName} />
  }

  // If API key missing, show fallback
  if (apiKeyMissing) {
    return <RouteListFallback route={route} destinationName={destinationName} />
  }

  // If map error occurred, show fallback
  if (mapError) {
    return <RouteListFallback route={route} destinationName={destinationName} />
  }

  // If no map plan data, show route list
  if (!itineraryMapPlan) {
    return <RouteListFallback route={route} destinationName={destinationName} />
  }

  // For now, show route list (actual Google Maps integration would go here)
  // This prevents crashes while allowing future map integration
  return <RouteListFallback route={route} destinationName={destinationName} showMapNote />
}

interface RouteListFallbackProps {
  route: string[]
  destinationName?: string
  showMapNote?: boolean
}

function RouteListFallback({ route, destinationName, showMapNote }: RouteListFallbackProps) {
  return (
    <Card className="border-2">
      <CardContent className="p-6">
        {showMapNote && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              Interactive map is unavailable right now. You can still use the route plan below.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {destinationName ? `${destinationName} Route` : 'Suggested Route'}
            </h4>
          </div>

          {route.length > 0 ? (
            <div className="space-y-3">
              {route.map((city, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="text-sm">
                      {city}
                    </Badge>
                  </div>
                  {index < route.length - 1 && (
                    <div className="text-muted-foreground">→</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Route details are not available for this destination.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
