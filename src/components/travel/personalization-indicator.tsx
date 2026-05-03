'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, Info, TrendingUp } from 'lucide-react'

interface PersonalizationIndicatorProps {
  personalization?: {
    isPersonalized?: boolean
    confidence?: number
    explanations?: string[]
    feedbackCount?: number
  }
}

export function PersonalizationIndicator({ personalization }: PersonalizationIndicatorProps) {
  if (!personalization || !personalization.isPersonalized) {
    return null
  }

  const confidence = personalization.confidence || 0
  const explanations = personalization.explanations || []

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.7) return 'text-green-600'
    if (conf >= 0.5) return 'text-blue-600'
    return 'text-yellow-600'
  }

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.7) return 'High'
    if (conf >= 0.5) return 'Medium'
    return 'Low'
  }

  return (
    <Alert className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <Sparkles className="h-5 w-5 text-purple-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base">Personalized Recommendations</h4>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                {getConfidenceLabel(confidence)} Confidence
              </Badge>
            </div>
            <div className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
              {Math.round(confidence * 100)}%
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            These recommendations have been tailored based on your previous feedback
            {personalization.feedbackCount && personalization.feedbackCount > 0 && (
              <span className="font-medium"> ({personalization.feedbackCount} interactions)</span>
            )}
          </p>

          {explanations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold flex items-center gap-1">
                <Info className="h-3 w-3" />
                How we personalized for you:
              </h5>
              <ul className="space-y-1">
                {explanations.map((explanation, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>{explanation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">
            Your feedback helps us improve recommendations. Keep interacting to get better matches!
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
