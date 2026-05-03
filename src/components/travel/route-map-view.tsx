'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Map } from 'lucide-react'
import { GoogleRouteMap } from './google-route-map'
import type { RecommendedRoute } from '@/lib/analysis/schemas'

interface RouteMapViewProps {
  route: RecommendedRoute
}

export function RouteMapView({ route }: RouteMapViewProps) {
  const [showGoogleMap, setShowGoogleMap] = useState(true)

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowGoogleMap(!showGoogleMap)}
          className="gap-2"
        >
          {showGoogleMap ? <Navigation className="h-4 w-4" /> : <Map className="h-4 w-4" />}
          {showGoogleMap ? 'Show Visual Flow' : 'Show Map View'}
        </Button>
      </div>

      {/* Google Maps View */}
      {showGoogleMap && <GoogleRouteMap route={route} />}

      {/* Visual Flow View */}
      {!showGoogleMap && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Route Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
          {/* Visual Route Flow */}
          <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6">
            <div className="flex items-center justify-between">
              {route.orderedStops.map((stop, index) => (
                <div key={index} className="flex items-center">
                  {/* Stop Marker */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <div className="absolute -top-1 -right-1">
                        <MapPin className="h-4 w-4 text-primary fill-primary" />
                      </div>
                    </div>
                    <div className="mt-2 text-center max-w-[100px]">
                      <p className="text-xs font-semibold truncate">{stop.destinationName}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {stop.daysRecommended}d
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Connection Arrow */}
                  {index < route.orderedStops.length - 1 && (
                    <div className="flex-1 px-4 flex items-center">
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-primary to-primary/50" />
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-primary/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Route Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{route.orderedStops.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Stops</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{route.totalDays}</p>
              <p className="text-xs text-muted-foreground mt-1">Days</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary capitalize">{route.estimatedTripIntensity}</p>
              <p className="text-xs text-muted-foreground mt-1">Intensity</p>
            </div>
          </div>

          {/* Transfer Notes */}
          {route.transferNotes && route.transferNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Transfer Information:</p>
              <ul className="space-y-1">
                {route.transferNotes.map((note, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
      )}
    </div>
  )
}
