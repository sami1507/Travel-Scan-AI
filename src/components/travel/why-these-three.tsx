'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Sparkles, Database } from 'lucide-react'

interface WhyTheseThreeProps {
  analysis: any
}

export function WhyTheseThree({ analysis }: WhyTheseThreeProps) {
  const metadata = (analysis as any)?._meta
  
  if (!metadata) return null
  
  const {
    aiDecisionMode,
    candidateRoutesComparedCount,
    candidateCountriesCompared,
    candidateRegionsCompared,
    openAIActuallyCalledThisRequest,
    cacheUsedThisRequest,
    finalSelectionReason,
  } = metadata
  
  // Determine source label
  const sourceLabel = cacheUsedThisRequest 
    ? 'Cached AI Analysis' 
    : openAIActuallyCalledThisRequest 
    ? 'Fresh AI Analysis' 
    : 'AI Analysis'
  
  const sourceColor = cacheUsedThisRequest ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Why these 3 routes?</CardTitle>
          </div>
          <Badge variant="outline" className={sourceColor}>
            {sourceLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison summary */}
        {candidateRoutesComparedCount > 0 && (
          <div className="flex items-start gap-3">
            <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 text-sm text-muted-foreground">
              <p>
                TravelScan compared <strong>{candidateRoutesComparedCount} route candidates</strong>
                {candidateRegionsCompared && candidateRegionsCompared.length > 0 && (
                  <> across <strong>{candidateRegionsCompared.slice(0, 3).join(', ')}</strong></>
                )}
                {candidateCountriesCompared && candidateCountriesCompared.length > 0 && (
                  <> ({candidateCountriesCompared.length} countries)</>
                )}.
              </p>
            </div>
          </div>
        )}
        
        {/* Selection strategy */}
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium mb-2">Selection Strategy:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Best Overall Fit</strong> - Highest match across all criteria</li>
              <li>• <strong>Best Practical/Value Option</strong> - Best balance of cost, ease, and quality</li>
              <li>• <strong>Different Vibe/Unique Discovery</strong> - Distinct alternative worth considering</li>
            </ul>
          </div>
        </div>
        
        {/* Final selection reason */}
        {finalSelectionReason && (
          <div className="text-sm text-muted-foreground border-t pt-3">
            <p>{finalSelectionReason}</p>
          </div>
        )}
        
        {/* Cache notice */}
        {cacheUsedThisRequest && (
          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
            <strong>Note:</strong> This analysis was retrieved from cache. OpenAI was not called for this request.
            Use &quot;Generate Different Options&quot; for a fresh analysis.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
