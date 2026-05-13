'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar, DollarSign, Sun, Users, Route, AlertTriangle
} from 'lucide-react'
import type { SeasonMonthStrategy } from '@/lib/analysis/schemas'

interface SeasonMonthStrategyProps {
  strategy?: SeasonMonthStrategy
  onMonthOptionSelected?: (month: number, optionType: string) => void
}

export function SeasonMonthStrategyDisplay({ strategy, onMonthOptionSelected }: SeasonMonthStrategyProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  if (!strategy) return null

  const getOptionIcon = (optionType: string) => {
    switch (optionType) {
      case 'bestValue':
        return <DollarSign className="h-4 w-4" />
      case 'bestExperience':
        return <Sun className="h-4 w-4" />
      case 'lowestFatigue':
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getOptionColor = (optionType: string) => {
    switch (optionType) {
      case 'bestValue':
        return 'border-l-green-500'
      case 'bestExperience':
        return 'border-l-blue-500'
      case 'lowestFatigue':
        return 'border-l-purple-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const getSourceBadge = (label?: string) => {
    const colors: Record<string, string> = {
      live_provider: 'bg-green-100 text-green-800',
      structured_knowledge: 'bg-blue-100 text-blue-800',
      ai_estimate: 'bg-yellow-100 text-yellow-800',
      fallback_estimate: 'bg-gray-100 text-gray-800',
    }
    return colors[label || 'fallback_estimate'] || colors.fallback_estimate
  }

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        Best Months in {strategy.season}
      </h3>

      <Tabs defaultValue={strategy.months?.[0]?.month.toString()} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${strategy.months?.length || 3}, 1fr)` }}>
          {strategy.months?.map((monthData) => (
            <TabsTrigger 
              key={monthData.month} 
              value={monthData.month.toString()}
              onClick={() => setSelectedMonth(monthData.month)}
            >
              {monthData.monthName}
            </TabsTrigger>
          ))}
        </TabsList>

        {strategy.months?.map((monthData) => (
          <TabsContent key={monthData.month} value={monthData.month.toString()} className="space-y-3 mt-4">
            {monthData.options?.map((option, idx) => (
              <Card 
                key={idx} 
                className={`border-l-4 ${getOptionColor(option.optionType)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onMonthOptionSelected?.(option.month, option.optionType)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getOptionIcon(option.optionType)}
                      <CardTitle className="text-sm">{option.title}</CardTitle>
                    </div>
                    <Badge className={getSourceBadge(option.sourceLabel)}>
                      {option.sourceLabel.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Route */}
                  <div className="flex items-start gap-2">
                    <Route className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {option.suggestedRoute?.join(' → ')}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {Object.entries(option.recommendedNights || {}).map(([city, nights]) => (
                          <span key={city} className="mr-3">
                            {city}: {nights}n
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Why Recommended */}
                  <div className="text-sm text-gray-700">
                    {option.whyRecommended}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <strong className="text-gray-600">Budget:</strong>
                      <div className="text-gray-800">{option.budgetNote}</div>
                    </div>
                    <div>
                      <strong className="text-gray-600">Weather:</strong>
                      <div className="text-gray-800">{option.weatherNote}</div>
                    </div>
                    <div>
                      <strong className="text-gray-600">Crowds:</strong>
                      <div className="text-gray-800">{option.crowdNote}</div>
                    </div>
                    <div>
                      <strong className="text-gray-600">Transport:</strong>
                      <div className="text-gray-800">{option.routeLogic}</div>
                    </div>
                  </div>

                  {/* Risk Warnings */}
                  {option.riskWarnings && option.riskWarnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <ul className="list-disc list-inside">
                          {option.riskWarnings.map((warning, wIdx) => (
                            <li key={wIdx}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Confidence Badge */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                      Confidence: {Math.round((option.dataConfidence || 0) * 100)}%
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMonthOptionSelected?.(option.month, option.optionType)
                      }}
                    >
                      Select This Option
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
