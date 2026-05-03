'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react'
import type { RecommendedRoute } from '@/lib/analysis/schemas'

interface GoogleRouteMapProps {
  route: RecommendedRoute
}

interface RouteSegment {
  origin: string
  destination: string
  distance: string
  duration: string
}

export function GoogleRouteMap({ route }: GoogleRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const [totalDistance, setTotalDistance] = useState<string>('')
  const [totalDuration, setTotalDuration] = useState<string>('')

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key not configured')
      setLoading(false)
      return
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,routes&loading=async`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      initializeMap()
    }

    script.onerror = () => {
      setError('Failed to load Google Maps')
      setLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    if (map && route) {
      renderRoute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, route])

  const initializeMap = () => {
    if (!mapRef.current) return

    try {
      const newMap = new google.maps.Map(mapRef.current, {
        zoom: 4,
        center: { lat: 20, lng: 0 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      })

      setMap(newMap)
      setLoading(false)
    } catch (err) {
      setError('Failed to initialize map')
      setLoading(false)
    }
  }

  const renderRoute = async () => {
    if (!map || route.orderedStops.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const bounds = new google.maps.LatLngBounds()
      const markers: google.maps.Marker[] = []
      const segments: RouteSegment[] = []
      let totalDistanceMeters = 0
      let totalDurationSeconds = 0

      // Geocode all stops first
      const geocoder = new google.maps.Geocoder()
      const locations: google.maps.LatLng[] = []

      for (const stop of route.orderedStops) {
        try {
          const result = await geocoder.geocode({ address: stop.destinationName })
          if (result.results[0]) {
            const location = result.results[0].geometry.location
            locations.push(location)
            bounds.extend(location)

            // Create marker
            const marker = new google.maps.Marker({
              position: location,
              map,
              label: {
                text: `${stop.orderInRoute}`,
                color: 'white',
                fontWeight: 'bold',
              },
              title: stop.destinationName,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 20,
                fillColor: stop.orderInRoute === 1 ? '#10b981' : stop.orderInRoute === route.orderedStops.length ? '#ef4444' : '#3b82f6',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 3,
              },
            })

            // Info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                <div style="padding: 8px; min-width: 150px;">
                  <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${stop.destinationName}</h3>
                  <p style="margin: 0; font-size: 12px; color: #666;">Stop ${stop.orderInRoute} • ${stop.daysRecommended} days</p>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">Score: ${stop.totalScore.toFixed(1)}/100</p>
                </div>
              `,
            })

            marker.addListener('click', () => {
              infoWindow.open(map, marker)
            })

            markers.push(marker)
          }
        } catch (err) {
          console.error(`Failed to geocode ${stop.destinationName}:`, err)
        }
      }

      // Draw routes between consecutive stops using Directions Service
      const directionsService = new google.maps.DirectionsService()
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We're using custom markers
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.7,
        },
      })

      for (let i = 0; i < locations.length - 1; i++) {
        try {
          const result = await directionsService.route({
            origin: locations[i],
            destination: locations[i + 1],
            travelMode: google.maps.TravelMode.DRIVING,
          })

          if (result.routes[0]) {
            const leg = result.routes[0].legs[0]
            
            segments.push({
              origin: route.orderedStops[i].destinationName,
              destination: route.orderedStops[i + 1].destinationName,
              distance: leg.distance?.text || 'N/A',
              duration: leg.duration?.text || 'N/A',
            })

            totalDistanceMeters += leg.distance?.value || 0
            totalDurationSeconds += leg.duration?.value || 0

            // Draw polyline for this segment
            if (i === 0) {
              directionsRenderer.setDirections(result)
            } else {
              // For additional segments, create new renderers
              const renderer = new google.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#3b82f6',
                  strokeWeight: 4,
                  strokeOpacity: 0.7,
                },
              })
              renderer.setDirections(result)
            }
          }
        } catch (err) {
          console.error(`Failed to get directions between stops ${i} and ${i + 1}:`, err)
        }
      }

      // Fit map to bounds
      if (locations.length > 0) {
        map.fitBounds(bounds)
      }

      // Set route segments and totals
      setRouteSegments(segments)
      setTotalDistance(formatDistance(totalDistanceMeters))
      setTotalDuration(formatDuration(totalDurationSeconds))
      setLoading(false)
    } catch (err) {
      console.error('Error rendering route:', err)
      setError('Failed to render route on map')
      setLoading(false)
    }
  }

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`
    }
    const km = meters / 1000
    return `${km.toFixed(1)} km`
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Map Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Route Map
          </CardTitle>
          {loading && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading map...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Container */}
        <div 
          ref={mapRef} 
          className="w-full h-[400px] rounded-lg border-2 border-muted bg-muted/20"
          style={{ minHeight: '400px' }}
        />

        {/* Route Summary */}
        {!loading && routeSegments.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground mb-1">Total Distance</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalDistance}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-muted-foreground mb-1">Travel Time</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{totalDuration}</p>
            </div>
          </div>
        )}

        {/* Route Segments */}
        {!loading && routeSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Route Segments:</p>
            <div className="space-y-2">
              {routeSegments.map((segment, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{segment.origin}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium truncate">{segment.destination}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
                    <span>{segment.distance}</span>
                    <span>•</span>
                    <span>{segment.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
