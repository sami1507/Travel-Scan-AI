'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Info, TrendingUp, AlertCircle } from 'lucide-react'
import type { TravelAnalysisResponse } from '@/lib/analysis/schemas'

interface ConsultantBriefCardProps {
  analysis: TravelAnalysisResponse
  queryContext?: {
    query: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
  }
  confidence: number
}

export function ConsultantBriefCard({ analysis, queryContext, confidence }: ConsultantBriefCardProps) {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600'
    if (conf >= 0.6) return 'text-blue-600'
    return 'text-yellow-600'
  }

  const getDataSourceLabel = () => {
    // Check metadata from backend
    const metadata = (analysis as any)
    
    if (metadata.fallbackUsed) {
      return {
        label: 'Conservative Fallback Estimate',
        variant: 'secondary' as const,
        description: 'Live AI took too long. Showing a conservative route-based estimate.'
      }
    }
    
    if (metadata.openAIUsed) {
      return {
        label: 'Live AI Analysis',
        variant: 'default' as const,
        description: 'Fresh analysis using current travel knowledge and AI reasoning.'
      }
    }
    
    return {
      label: 'Knowledge-Based Estimate',
      variant: 'outline' as const,
      description: 'Based on structured travel knowledge and route patterns.'
    }
  }

  const dataSource = getDataSourceLabel()

  const getTripStructureExplanation = () => {
    const structure = queryContext?.query || ''
    
    if (structure.includes('single') && structure.includes('one')) {
      return 'single-city stay'
    }
    if (structure.includes('single') && structure.includes('multi')) {
      return 'single-country multi-city route'
    }
    if (structure.includes('multi')) {
      return 'multi-country route'
    }
    return 'travel route'
  }

  const getInterestsText = () => {
    if (!queryContext?.interests || queryContext.interests.length === 0) {
      return 'general travel'
    }
    return queryContext.interests.slice(0, 3).join(', ')
  }

  const getTripLengthText = () => {
    if (queryContext?.travel_months && queryContext.travel_months.length > 0) {
      return `${queryContext.travel_months.length}-day`
    }
    return '7-day'
  }

  const consultantExplanation = `Because you want a ${getTripLengthText()} ${getTripStructureExplanation()} with ${getInterestsText()} interests, TravelScan compared routes that are realistic to reach, easy to connect, and not too exhausting. These are planning recommendations before booking, not final live prices.`

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 shadow-xl">
      <CardHeader className="pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-bold">AI Travel Consultant Brief</CardTitle>
            </div>
            <CardDescription className="text-base leading-relaxed mb-4">
              {consultantExplanation}
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant={dataSource.variant} className="text-xs">
                {dataSource.label}
              </Badge>
              {analysis.personalization?.isPersonalized && (
                <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                  Personalized
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getConfidenceColor(confidence)}`}>
              {Math.round(confidence * 100)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1 font-medium">Confidence</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Source Explanation */}
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {dataSource.description}
          </p>
        </div>

        {/* Top Recommendations with Routes */}
        {analysis.rankedDestinations && analysis.rankedDestinations.length > 0 && (
          <div>
            <h4 className="font-bold text-base mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Routes Compared
            </h4>
            <div className="space-y-3">
              {analysis.rankedDestinations.slice(0, 3).map((dest, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  {dest.diversityLabel && (
                    <Badge variant="secondary" className="text-xs px-2 py-1 shrink-0">
                      {dest.diversityLabel}
                    </Badge>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{dest.destinationName}</div>
                    {dest.suggestedRoute && dest.suggestedRoute.length > 1 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {dest.suggestedRoute.join(' → ')}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Score: {dest.totalMatchScore}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insights */}
        {analysis.reasons && analysis.reasons.length > 0 && (
          <div>
            <h4 className="font-bold text-base mb-3">Why These Routes</h4>
            <ul className="space-y-2">
              {analysis.reasons.slice(0, 3).map((reason, i) => (
                <li key={i} className="text-sm flex items-start gap-3">
                  <span className="text-primary mt-0.5 font-bold">•</span>
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Honest Limitation */}
        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-orange-900 mb-1">Honest Limitation</p>
            <p className="text-xs text-orange-800 leading-relaxed">
              These are planning recommendations to help you decide where and when to go. 
              Final prices, availability, and booking details must be verified with providers before purchasing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
