'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MapPin, Clock, DollarSign, AlertTriangle, Info, ChevronDown, ChevronUp,
  Utensils, Train, Sun, Moon, Coffee
} from 'lucide-react'
import type { ItineraryMapPlan } from '@/lib/analysis/schemas'
import { useState } from 'react'

interface VisualRouteTimelineProps {
  plan: ItineraryMapPlan
  onStopSelected?: (stopId: string, stopName: string, day: number) => void
  onDayPlanOpened?: (day: number) => void
}

export function VisualRouteTimeline({ plan, onStopSelected, onDayPlanOpened }: VisualRouteTimelineProps) {
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({})

  const toggleDay = (day: number) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))
    if (!expandedDays[day]) {
      onDayPlanOpened?.(day)
    }
  }

  const getCostBadgeColor = (level: string) => {
    switch (level) {
      case 'free': return 'bg-green-100 text-green-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTimeIcon = (time: string) => {
    switch (time) {
      case 'morning': return <Coffee className="h-4 w-4" />
      case 'afternoon': return <Sun className="h-4 w-4" />
      case 'evening': return <Moon className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStopIcon = (type: string) => {
    switch (type) {
      case 'food': return <Utensils className="h-4 w-4" />
      case 'transport': return <Train className="h-4 w-4" />
      default: return <MapPin className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Message */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Interactive map unavailable. Showing visual route plan instead.
        </AlertDescription>
      </Alert>

      {/* Route Title and Reasoning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {plan.routeTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div>
              <strong>Why this route:</strong>
              <p className="text-gray-700 mt-1">{plan.routeReasoning.whyThisRoute}</p>
            </div>
            <div>
              <strong>Why this order:</strong>
              <p className="text-gray-700 mt-1">{plan.routeReasoning.whyThisOrder}</p>
            </div>
            <div>
              <strong>Why these areas:</strong>
              <p className="text-gray-700 mt-1">{plan.routeReasoning.whyTheseAreas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day-by-Day Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Day-by-Day Itinerary</h3>
        
        {plan.dayPlans?.map((dayPlan) => (
          <Card key={dayPlan.day} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleDay(dayPlan.day)}
              >
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600 text-white">Day {dayPlan.day}</Badge>
                  <CardTitle className="text-base">{dayPlan.title}</CardTitle>
                </div>
                {expandedDays[dayPlan.day] ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>

            {expandedDays[dayPlan.day] && (
              <CardContent className="space-y-4">
                {/* Area Focus */}
                <div className="bg-blue-50 p-3 rounded">
                  <strong className="text-sm">Focus Area: {dayPlan.areaFocus}</strong>
                  <p className="text-sm text-gray-700 mt-1">{dayPlan.whyThisArea}</p>
                </div>

                {/* Time Blocks */}
                <div className="grid gap-3">
                  <div className="flex gap-3">
                    {getTimeIcon('morning')}
                    <div className="flex-1">
                      <strong className="text-sm">Morning</strong>
                      <p className="text-sm text-gray-700">{dayPlan.morning}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {getTimeIcon('afternoon')}
                    <div className="flex-1">
                      <strong className="text-sm">Afternoon</strong>
                      <p className="text-sm text-gray-700">{dayPlan.afternoon}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {getTimeIcon('evening')}
                    <div className="flex-1">
                      <strong className="text-sm">Evening</strong>
                      <p className="text-sm text-gray-700">{dayPlan.evening}</p>
                    </div>
                  </div>
                </div>

                {/* Food & Transport */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <strong className="flex items-center gap-1">
                      <Utensils className="h-4 w-4" /> Food
                    </strong>
                    <p className="text-gray-700 mt-1">{dayPlan.foodSuggestion}</p>
                  </div>
                  <div>
                    <strong className="flex items-center gap-1">
                      <Train className="h-4 w-4" /> Transport
                    </strong>
                    <p className="text-gray-700 mt-1">{dayPlan.transportTip}</p>
                  </div>
                </div>

                {/* Walking Intensity */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Walking: {dayPlan.walkingIntensity}
                  </Badge>
                </div>

                {/* Warnings */}
                {dayPlan.warnings && dayPlan.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {dayPlan.warnings.join('. ')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Stops for this day */}
                <div className="mt-4 pt-4 border-t">
                  <strong className="text-sm">Places to Visit:</strong>
                  <div className="mt-2 space-y-2">
                    {plan.stops
                      ?.filter(stop => stop.day === dayPlan.day)
                      .map((stop) => (
                        <div
                          key={stop.id}
                          className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => onStopSelected?.(stop.id, stop.name, stop.day)}
                        >
                          <div className="flex items-start gap-2">
                            {getStopIcon(stop.type)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <strong className="text-sm">{stop.name}</strong>
                                <Badge className={getCostBadgeColor(stop.costLevel)}>
                                  {stop.costLevel}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {stop.city}, {stop.country} • {stop.durationEstimate}
                              </p>
                              <div className="mt-2 text-xs space-y-1">
                                <p><strong>Why visit:</strong> {stop.whyVisit}</p>
                                <p><strong>What to do:</strong> {stop.whatToDo}</p>
                                <p><strong>What to see:</strong> {stop.whatToSee}</p>
                                {stop.practicalTip && (
                                  <p className="text-blue-600"><strong>Tip:</strong> {stop.practicalTip}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Route Reasoning Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">Route Planning Insights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div>
            <strong>Fatigue Consideration:</strong>
            <p className="text-gray-700">{plan.routeReasoning.fatigueReasoning}</p>
          </div>
          <div>
            <strong>Transport Logic:</strong>
            <p className="text-gray-700">{plan.routeReasoning.transportReasoning}</p>
          </div>
          <div>
            <strong>Budget Consideration:</strong>
            <p className="text-gray-700">{plan.routeReasoning.budgetReasoning}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
