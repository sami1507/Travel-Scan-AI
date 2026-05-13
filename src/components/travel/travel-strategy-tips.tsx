'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar, Plane, Route, Tag, DollarSign, Mail,
  AlertTriangle, MapPin, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react'
import type { TravelStrategyTips } from '@/lib/analysis/schemas'

interface TravelStrategyTipsProps {
  tips?: TravelStrategyTips
  onTipInteraction?: (tipType: string, action: string) => void
}

export function TravelStrategyTipsDisplay({ tips, onTipInteraction }: TravelStrategyTipsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [copiedEmail, setCopiedEmail] = useState(false)

  if (!tips) return null

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    onTipInteraction?.(section, expandedSections[section] ? 'collapsed' : 'expanded')
  }

  const copyEmail = async () => {
    if (tips.negotiationEmail?.emailBody) {
      await navigator.clipboard.writeText(tips.negotiationEmail.emailBody)
      setCopiedEmail(true)
      onTipInteraction?.('negotiationEmail', 'copied')
      setTimeout(() => setCopiedEmail(false), 2000)
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
        <AlertTriangle className="h-5 w-5 text-blue-600" />
        AI Travel Strategy Tips
      </h3>

      <div className="grid gap-3">
        {/* Ideal Date Scanner */}
        {tips.idealDateScanner && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm">{tips.idealDateScanner.title}</CardTitle>
                </div>
                <Badge className={getSourceBadge(tips.idealDateScanner.sourceLabel)}>
                  {tips.idealDateScanner.sourceLabel.replace(/_/g, ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Best Window:</strong> {tips.idealDateScanner.suggestedDateWindow}</div>
              <div><strong>Why:</strong> {tips.idealDateScanner.whyThisWindow}</div>
              <div className="flex gap-4">
                <Badge variant={tips.idealDateScanner.estimatedPriceTendency === 'lower' ? 'default' : 'secondary'}>
                  {tips.idealDateScanner.estimatedPriceTendency} prices
                </Badge>
              </div>
              <div className="text-xs text-gray-600">{tips.idealDateScanner.flexibilityTip}</div>
            </CardContent>
          </Card>
        )}

        {/* Alternative Airport Strategy */}
        {tips.alternativeAirportStrategy && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('airport')}>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm">{tips.alternativeAirportStrategy.title}</CardTitle>
                </div>
                {expandedSections.airport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {expandedSections.airport && (
              <CardContent className="space-y-2 text-sm">
                <div><strong>Primary:</strong> {tips.alternativeAirportStrategy.primaryAirport}</div>
                {tips.alternativeAirportStrategy.alternativeAirports?.length > 0 && (
                  <div><strong>Alternatives:</strong> {tips.alternativeAirportStrategy.alternativeAirports.join(', ')}</div>
                )}
                {tips.alternativeAirportStrategy.nearbyArrivalCities?.length > 0 && (
                  <div><strong>Nearby Cities:</strong> {tips.alternativeAirportStrategy.nearbyArrivalCities.join(', ')}</div>
                )}
                <div className="text-xs">{tips.alternativeAirportStrategy.routeLogic}</div>
                {tips.alternativeAirportStrategy.riskWarnings?.length > 0 && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      {tips.alternativeAirportStrategy.riskWarnings.join('. ')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Smart Route Optimizer */}
        {tips.smartRouteOptimizer && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm">{tips.smartRouteOptimizer.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Optimized:</strong> {tips.smartRouteOptimizer.optimizedRoute?.join(' → ')}</div>
              <div className="text-xs text-gray-600">{tips.smartRouteOptimizer.transportLogic}</div>
              <div className="text-xs"><strong>Fatigue Impact:</strong> {tips.smartRouteOptimizer.fatigueImpact}</div>
            </CardContent>
          </Card>
        )}

        {/* Verified Deals Detector */}
        {tips.verifiedDealsAndPromotionsDetector && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('deals')}>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-sm">{tips.verifiedDealsAndPromotionsDetector.title}</CardTitle>
                </div>
                {expandedSections.deals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {expandedSections.deals && (
              <CardContent className="space-y-2 text-sm">
                <div><strong>Type:</strong> {tips.verifiedDealsAndPromotionsDetector.dealType}</div>
                <div><strong>Check:</strong> {tips.verifiedDealsAndPromotionsDetector.whereToCheck?.join(', ')}</div>
                {tips.verifiedDealsAndPromotionsDetector.verificationNeeded && (
                  <Badge variant="outline" className="text-xs">Verification Required</Badge>
                )}
                <div className="text-xs text-gray-600">{tips.verifiedDealsAndPromotionsDetector.estimatedSavingsPotential}</div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Extra Fees Breakdown */}
        {tips.extraFeesBreakdown && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('fees')}>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <CardTitle className="text-sm">{tips.extraFeesBreakdown.title}</CardTitle>
                </div>
                {expandedSections.fees ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {expandedSections.fees && (
              <CardContent className="space-y-2 text-sm">
                {tips.extraFeesBreakdown.likelyExtraFees?.map((fee, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{fee.feeType}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{fee.estimatedAmount}</span>
                      {fee.avoidable && <Badge variant="outline" className="text-xs">Avoidable</Badge>}
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t">
                  <strong className="text-xs">How to Avoid:</strong>
                  <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                    {tips.extraFeesBreakdown.howToAvoid?.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Negotiation Email */}
        {tips.negotiationEmail && (
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('email')}>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm">{tips.negotiationEmail.title}</CardTitle>
                </div>
                {expandedSections.email ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {expandedSections.email && (
              <CardContent className="space-y-3 text-sm">
                <div><strong>Subject:</strong> {tips.negotiationEmail.emailSubject}</div>
                <div className="bg-gray-50 p-3 rounded text-xs whitespace-pre-wrap">
                  {tips.negotiationEmail.emailBody}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={copyEmail}
                  className="w-full"
                >
                  {copiedEmail ? (
                    <><Check className="h-4 w-4 mr-2" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copy Email</>
                  )}
                </Button>
                <div className="text-xs text-gray-600"><strong>When to use:</strong> {tips.negotiationEmail.whenToUse}</div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Flexibility & Risk Analysis */}
        {tips.flexibilityAndRiskAnalysis && (
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('risk')}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <CardTitle className="text-sm">{tips.flexibilityAndRiskAnalysis.title}</CardTitle>
                </div>
                {expandedSections.risk ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {expandedSections.risk && (
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <strong>Flexibility Score:</strong>
                  <Badge>{tips.flexibilityAndRiskAnalysis.flexibilityScore}/10</Badge>
                </div>
                <div>
                  <strong>Main Risks:</strong>
                  <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                    {tips.flexibilityAndRiskAnalysis.mainRisks?.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Recommendation:</strong> {tips.flexibilityAndRiskAnalysis.recommendation}
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        )}

        {/* Nearby Destination Strategy */}
        {tips.nearbyDestinationStrategy && (
          <Card className="border-l-4 border-l-teal-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('nearby')}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  <CardTitle className="text-sm">{tips.nearbyDestinationStrategy.title}</CardTitle>
                </div>
                {expandedSections.nearby ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {expandedSections.nearby && (
              <CardContent className="space-y-2 text-sm">
                <div><strong>Why helpful:</strong> {tips.nearbyDestinationStrategy.whyTheyMayHelp}</div>
                <div>
                  <strong>Nearby Options:</strong>
                  <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                    {tips.nearbyDestinationStrategy.nearbyDestinations?.map((dest, idx) => (
                      <li key={idx}>
                        {dest.name} {dest.distanceKm && `(${dest.distanceKm}km)`}
                        {dest.transportOptions?.length > 0 && ` - ${dest.transportOptions.join(', ')}`}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-gray-600"><strong>Onward:</strong> {tips.nearbyDestinationStrategy.onwardTransport}</div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
