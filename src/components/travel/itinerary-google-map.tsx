'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { ItineraryMapPlan, ItineraryStop } from '@/lib/analysis/schemas'

interface ItineraryGoogleMapProps {
  plan: ItineraryMapPlan
  onStopSelected?: (stopId: string, stopName: string, day: number) => void
}

export function ItineraryGoogleMap({ plan, onStopSelected }: ItineraryGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key not configured')
      setLoading(false)
      return
    }

    // Check if script already loaded
    if (window.google?.maps) {
      initializeMap()
      return
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      initializeMap()
    }

    script.onerror = () => {
      setError('Failed to load Google Maps')
      setLoading(false)
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`)
    if (!existingScript) {
      document.head.appendChild(script)
    } else {
      initializeMap()
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (map && plan) {
      renderItinerary()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, plan])

  const initializeMap = () => {
    if (!mapRef.current) return

    try {
      // Calculate center from plan or stops
      let center = { lat: 20, lng: 0 }
      let zoom = 4

      if (plan.center) {
        center = { lat: plan.center.lat, lng: plan.center.lng }
      } else {
        // Calculate center from stops with coordinates
        const stopsWithCoords = plan.stops.filter(s => s.lat !== null && s.lng !== null)
        if (stopsWithCoords.length > 0) {
          const avgLat = stopsWithCoords.reduce((sum, s) => sum + (s.lat || 0), 0) / stopsWithCoords.length
          const avgLng = stopsWithCoords.reduce((sum, s) => sum + (s.lng || 0), 0) / stopsWithCoords.length
          center = { lat: avgLat, lng: avgLng }
        }
      }

      if (plan.zoomLevel) {
        zoom = plan.zoomLevel
      } else {
        // Auto-calculate zoom based on number of stops
        const stopsWithCoords = plan.stops.filter(s => s.lat !== null && s.lng !== null)
        if (stopsWithCoords.length <= 3) zoom = 10
        else if (stopsWithCoords.length <= 6) zoom = 8
        else zoom = 6
      }

      const newMap = new google.maps.Map(mapRef.current, {
        zoom,
        center,
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
      console.error('Failed to initialize map:', err)
      setError('Failed to initialize map')
      setLoading(false)
    }
  }

  const renderItinerary = () => {
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    try {
      const bounds = new google.maps.LatLngBounds()
      const validStops = plan.stops.filter(s => s.lat !== null && s.lng !== null)

      if (validStops.length === 0) {
        setError('No valid coordinates found for stops')
        return
      }

      // Create markers for each stop
      validStops.forEach((stop, index) => {
        const position = { lat: stop.lat!, lng: stop.lng! }
        bounds.extend(position)

        // Determine marker color based on day
        const dayColors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444']
        const color = dayColors[(stop.day - 1) % dayColors.length]

        const marker = new google.maps.Marker({
          position,
          map,
          label: {
            text: `${index + 1}`,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px',
          },
          title: stop.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          },
        })

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
          content: createInfoWindowContent(stop, index + 1),
        })

        marker.addListener('click', () => {
          // Close all other info windows
          markersRef.current.forEach((m, i) => {
            if (i !== index) {
              const iw = (m as any).infoWindow
              if (iw) iw.close()
            }
          })
          
          infoWindow.open(map, marker)
          
          // Trigger stop selected callback
          if (onStopSelected) {
            onStopSelected(stop.id, stop.name, stop.day)
          }
        })

        // Store info window reference
        ;(marker as any).infoWindow = infoWindow

        markersRef.current.push(marker)
      })

      // Draw polyline connecting stops
      if (validStops.length > 1) {
        const path = validStops.map(s => ({ lat: s.lat!, lng: s.lng! }))
        
        new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.7,
          strokeWeight: 3,
          map,
        })
      }

      // Fit map to bounds with padding
      if (validStops.length > 0) {
        map.fitBounds(bounds, 50)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error rendering itinerary:', err)
      setError('Failed to render itinerary on map')
      setLoading(false)
    }
  }

  const createInfoWindowContent = (stop: ItineraryStop, stopNumber: number): string => {
    const timeEmoji = {
      'morning': '🌅',
      'afternoon': '☀️',
      'evening': '🌆',
      'full-day': '📅',
    }[stop.recommendedTimeOfDay] || '🕐'

    const typeEmoji = {
      'landmark': '🏛️',
      'museum': '🏛️',
      'food': '🍽️',
      'nature': '🌳',
      'market': '🛍️',
      'viewpoint': '👁️',
      'neighborhood': '🏘️',
      'transport': '🚇',
      'hotel_area': '🏨',
      'day_trip': '🚌',
    }[stop.type] || '📍'

    return `
      <div style="padding: 12px; max-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">${typeEmoji}</span>
          <h3 style="margin: 0; font-weight: 600; font-size: 15px; color: #1f2937;">${stop.name}</h3>
        </div>
        
        <div style="margin-bottom: 8px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            <strong>Stop ${stopNumber}</strong> • Day ${stop.day} • ${stop.city}, ${stop.country}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
            ${timeEmoji} ${stop.recommendedTimeOfDay} • ${stop.durationEstimate}
          </p>
        </div>

        <div style="margin-bottom: 8px; padding: 8px; background: #f3f4f6; border-radius: 6px;">
          <p style="margin: 0; font-size: 12px; color: #374151; line-height: 1.4;">
            <strong>Why visit:</strong> ${stop.whyVisit}
          </p>
        </div>

        <div style="margin-bottom: 8px;">
          <p style="margin: 0; font-size: 12px; color: #374151; line-height: 1.4;">
            <strong>What to do:</strong> ${stop.whatToDo}
          </p>
        </div>

        ${stop.practicalTip ? `
          <div style="margin-top: 8px; padding: 6px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.3;">
              💡 <strong>Tip:</strong> ${stop.practicalTip}
            </p>
          </div>
        ` : ''}

        ${stop.costLevel !== 'unknown' ? `
          <div style="margin-top: 8px;">
            <span style="display: inline-block; padding: 2px 8px; background: ${getCostColor(stop.costLevel)}; color: white; border-radius: 12px; font-size: 10px; font-weight: 600;">
              ${stop.costLevel.toUpperCase()}
            </span>
          </div>
        ` : ''}
      </div>
    `
  }

  const getCostColor = (level: string): string => {
    switch (level) {
      case 'free': return '#10b981'
      case 'low': return '#3b82f6'
      case 'moderate': return '#f59e0b'
      case 'high': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (error) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6">
          <Alert variant="default" className="border-muted bg-muted/30">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm text-muted-foreground">
              <div className="font-medium mb-1">Interactive map unavailable</div>
              <div className="text-xs">{error}</div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-muted">
      <CardContent className="p-0">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading map...</span>
              </div>
            </div>
          )}
          <div 
            ref={mapRef} 
            className="w-full h-[500px] rounded-lg"
            style={{ minHeight: '500px' }}
          />
        </div>
        
        {!loading && (
          <div className="p-4 border-t border-muted">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{plan.stops.filter(s => s.lat && s.lng).length} stops on map</span>
              <span className="mx-2">•</span>
              <span>{plan.routeTitle}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
