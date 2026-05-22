'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'

interface BeforeYouBookChecklistProps {
  destination: RankedDestination
  tripLength?: number
}

type CheckStatus = 'ok' | 'check' | 'risk'

interface CheckItem {
  label: string
  status: CheckStatus
  reason: string
}

export function BeforeYouBookChecklist({ destination, tripLength = 7 }: BeforeYouBookChecklistProps) {
  const checks: CheckItem[] = generateChecks(destination, tripLength)

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'check':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'risk':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
    }
  }

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'ok':
        return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">OK</Badge>
      case 'check':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">Check</Badge>
      case 'risk':
        return <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">Risk</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Before You Book Checklist
        </CardTitle>
        <CardDescription>
          Key factors to verify before committing to this route
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="mt-0.5">{getStatusIcon(check.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{check.label}</span>
                  {getStatusBadge(check.status)}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {check.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This checklist is based on route analysis and knowledge estimates. 
            Always verify specific details with providers before booking.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function generateChecks(destination: RankedDestination, tripLength: number): CheckItem[] {
  const checks: CheckItem[] = []

  // Route fatigue check
  if (destination.travelFatigueLevel) {
    const fatigueStatus: CheckStatus = 
      destination.travelFatigueLevel === 'Low' ? 'ok' :
      destination.travelFatigueLevel === 'Medium' ? 'check' : 'risk'
    
    checks.push({
      label: 'Route fatigue acceptable?',
      status: fatigueStatus,
      reason: destination.travelFatigueLevel === 'Low' 
        ? 'Comfortable pacing with reasonable travel times'
        : destination.travelFatigueLevel === 'Medium'
        ? 'Moderate pacing - plan rest days between moves'
        : 'Fast-paced route - consider reducing stops or extending trip'
    })
  }

  // Transport connection check
  if (destination.transportLogic) {
    const hasTrainMention = destination.transportLogic.toLowerCase().includes('train')
    const hasBusMention = destination.transportLogic.toLowerCase().includes('bus')
    
    checks.push({
      label: 'Train/bus connection realistic?',
      status: hasTrainMention ? 'ok' : hasBusMention ? 'check' : 'check',
      reason: destination.transportLogic.substring(0, 120)
    })
  }

  // Season/weather check
  if (destination.seasonality) {
    const weatherRisk = destination.seasonality.weatherReality?.toLowerCase().includes('rain') ||
                       destination.seasonality.weatherReality?.toLowerCase().includes('cold') ||
                       destination.seasonality.weatherReality?.toLowerCase().includes('hot')
    
    checks.push({
      label: 'Weather risk?',
      status: weatherRisk ? 'check' : 'ok',
      reason: destination.seasonality.weatherReality || 'Weather should be suitable for travel'
    })
  }

  // Crowd/peak season check
  if (destination.seasonality?.crowdReality) {
    const crowdRisk = destination.seasonality.crowdReality.toLowerCase().includes('crowd') ||
                     destination.seasonality.crowdReality.toLowerCase().includes('busy') ||
                     destination.seasonality.crowdReality.toLowerCase().includes('peak')
    
    checks.push({
      label: 'Peak season / crowd risk?',
      status: crowdRisk ? 'check' : 'ok',
      reason: destination.seasonality.crowdReality
    })
  }

  // Budget uncertainty check
  if (destination.seasonality?.priceReality) {
    const priceRisk = destination.seasonality.priceReality.toLowerCase().includes('expensive') ||
                     destination.seasonality.priceReality.toLowerCase().includes('high') ||
                     destination.seasonality.priceReality.toLowerCase().includes('peak')
    
    checks.push({
      label: 'Budget uncertainty?',
      status: priceRisk ? 'risk' : 'check',
      reason: destination.seasonality.priceReality
    })
  }

  // Route warnings check
  if (destination.routeWarnings && destination.routeWarnings.length > 0) {
    checks.push({
      label: 'Route considerations?',
      status: 'check',
      reason: destination.routeWarnings[0]
    })
  }

  // Arrival/check-in timing (generic check)
  checks.push({
    label: 'Arrival time safe for hotel check-in?',
    status: 'check',
    reason: 'Verify flight/train arrival times allow for standard hotel check-in (usually 14:00-15:00)'
  })

  // Baggage policy (generic check)
  checks.push({
    label: 'Baggage included?',
    status: 'check',
    reason: 'Check if flights include checked baggage or if you need to add it separately'
  })

  // Cancellation policy (generic check)
  checks.push({
    label: 'Cancellation/change policy risk?',
    status: 'check',
    reason: 'Review cancellation terms and consider travel insurance for flexibility'
  })

  // Hotel area suitability (generic check)
  checks.push({
    label: 'Hotel area suitable?',
    status: 'check',
    reason: 'Research specific neighborhoods and proximity to attractions before booking'
  })

  return checks
}
