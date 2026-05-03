'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  MessageSquare, 
  BarChart3,
  CheckCircle2,
  Loader2 
} from 'lucide-react'

interface IntelligenceSignal {
  signalType: 'recommendation_quality' | 'personalization' | 'explanation' | 'product_insight'
  priority: 'critical' | 'high' | 'medium' | 'low'
  actionable: boolean
  signal: string
  impact: string
  suggestedAction: string
  evidence: {
    feedbackCount: number
    confidence: number
    sampleIds: string[]
  }
  metadata: Record<string, any>
}

export default function IntelligenceSignalsPage() {
  const [loading, setLoading] = useState(true)
  const [signals, setSignals] = useState<any>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    loadSignals()
  }, [])

  const loadSignals = async () => {
    try {
      const response = await fetch('/api/admin/intelligence-signals?timeframe=week')
      if (response.ok) {
        const data = await response.json()
        setSignals(data)
      }
    } catch (error) {
      console.error('Failed to load signals:', error)
    } finally {
      setLoading(false)
    }
  }

  const applySignals = async () => {
    setApplying(true)
    try {
      const response = await fetch('/api/admin/intelligence-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: 'week', autoApply: true }),
      })
      if (response.ok) {
        await loadSignals()
      }
    } catch (error) {
      console.error('Failed to apply signals:', error)
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    }
    return colors[priority] || colors.medium
  }

  const getSignalIcon = (type: string) => {
    const icons: Record<string, any> = {
      recommendation_quality: Target,
      personalization: TrendingUp,
      explanation: MessageSquare,
      product_insight: Lightbulb,
    }
    return icons[type] || BarChart3
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Signals</h1>
          <p className="text-muted-foreground mt-1">
            Actionable insights extracted from user feedback
          </p>
        </div>
        <Button onClick={applySignals} disabled={applying}>
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply Signals
            </>
          )}
        </Button>
      </div>

      {/* Summary Stats */}
      {signals?.summary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signals.summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{signals.summary.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{signals.summary.high}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Medium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{signals.summary.medium}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Actionable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{signals.summary.actionable}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendation Quality Signals */}
      {signals?.grouped?.recommendation_quality?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Recommendation Quality Signals
            </CardTitle>
            <CardDescription>
              Signals to improve recommendation accuracy and relevance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signals.grouped.recommendation_quality.map((signal: IntelligenceSignal, idx: number) => (
              <Alert key={idx} className="border-l-4 border-l-blue-600">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(signal.priority)}>
                          {signal.priority}
                        </Badge>
                        <Badge variant="outline">
                          {signal.evidence.feedbackCount} feedback items
                        </Badge>
                        <Badge variant="outline">
                          {(signal.evidence.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-base">{signal.signal}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{signal.impact}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      <Lightbulb className="h-4 w-4 inline mr-2" />
                      Suggested Action: {signal.suggestedAction}
                    </p>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Personalization Signals */}
      {signals?.grouped?.personalization?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Personalization Signals
            </CardTitle>
            <CardDescription>
              Signals to improve user preference capture and personalization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signals.grouped.personalization.map((signal: IntelligenceSignal, idx: number) => (
              <Alert key={idx} className="border-l-4 border-l-green-600">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(signal.priority)}>
                          {signal.priority}
                        </Badge>
                        <Badge variant="outline">
                          {signal.evidence.feedbackCount} users
                        </Badge>
                        <Badge variant="outline">
                          {(signal.evidence.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-base">{signal.signal}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{signal.impact}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-900">
                      <Lightbulb className="h-4 w-4 inline mr-2" />
                      Suggested Action: {signal.suggestedAction}
                    </p>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Explanation Quality Signals */}
      {signals?.grouped?.explanation?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Explanation Quality Signals
            </CardTitle>
            <CardDescription>
              Signals to improve recommendation explanation clarity and usefulness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signals.grouped.explanation.map((signal: IntelligenceSignal, idx: number) => (
              <Alert key={idx} className="border-l-4 border-l-purple-600">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(signal.priority)}>
                          {signal.priority}
                        </Badge>
                        <Badge variant="outline">
                          {signal.evidence.feedbackCount} reports
                        </Badge>
                        <Badge variant="outline">
                          {(signal.evidence.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-base">{signal.signal}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{signal.impact}</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">
                      <Lightbulb className="h-4 w-4 inline mr-2" />
                      Suggested Action: {signal.suggestedAction}
                    </p>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Product Insight Signals */}
      {signals?.grouped?.product_insight?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-orange-600" />
              Product Insight Signals
            </CardTitle>
            <CardDescription>
              High-level product improvements and strategic insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signals.grouped.product_insight.map((signal: IntelligenceSignal, idx: number) => (
              <Alert key={idx} className="border-l-4 border-l-orange-600">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(signal.priority)}>
                          {signal.priority}
                        </Badge>
                        <Badge variant="outline">
                          {signal.evidence.feedbackCount} occurrences
                        </Badge>
                        <Badge variant="outline">
                          {(signal.evidence.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-base">{signal.signal}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{signal.impact}</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">
                      <Lightbulb className="h-4 w-4 inline mr-2" />
                      Suggested Action: {signal.suggestedAction}
                    </p>
                  </div>
                  {signal.metadata && Object.keys(signal.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <details>
                        <summary className="cursor-pointer hover:text-foreground">View metadata</summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(signal.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {signals?.signals?.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No intelligence signals detected in the selected timeframe. This could mean:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Not enough feedback data collected yet</li>
              <li>All feedback is positive with no actionable patterns</li>
              <li>System is performing well across all dimensions</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
