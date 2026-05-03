'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Plane, Hotel, Calendar } from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'

interface ExternalActionsProps {
  destination: RankedDestination
  travelMonths?: number[]
}

export function ExternalActions({ destination, travelMonths }: ExternalActionsProps) {
  const getFlightSearchUrl = () => {
    // Generic flight search - users can choose their preferred provider
    const query = encodeURIComponent(destination.destinationName)
    return `https://www.google.com/travel/flights?q=${query}`
  }

  const getHotelSearchUrl = () => {
    // Generic hotel search - users can choose their preferred provider
    const query = encodeURIComponent(destination.destinationName)
    return `https://www.google.com/travel/hotels?q=${query}`
  }

  const getCalendarUrl = () => {
    // Google Calendar to plan the trip
    const title = encodeURIComponent(`Trip to ${destination.destinationName}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Next Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to plan your trip? Explore options with your preferred providers:
        </p>

        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <a href={getFlightSearchUrl()} target="_blank" rel="noopener noreferrer">
            <Plane className="h-4 w-4 mr-2" />
            View Flight Options
            <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <a href={getHotelSearchUrl()} target="_blank" rel="noopener noreferrer">
            <Hotel className="h-4 w-4 mr-2" />
            View Hotel Options
            <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <a href={getCalendarUrl()} target="_blank" rel="noopener noreferrer">
            <Calendar className="h-4 w-4 mr-2" />
            Add to Calendar
            <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        </Button>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            These links open external services where you can compare prices and book directly with your preferred providers.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
