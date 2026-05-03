'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import type { TravelAnalysisResponse } from '@/lib/analysis/schemas'

export function TravelAnalysisTest() {
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState<'low' | 'moderate' | 'high' | 'luxury'>('moderate')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TravelAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/travel/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          budget,
          travelMonths: [6, 7, 8],
          interests: ['beach', 'food', 'culture'],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Travel Analysis Test</CardTitle>
          <CardDescription>Test the AI Travel Analysis Engine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">What are you looking for?</Label>
            <Input
              id="query"
              placeholder="e.g., Best beach destination for summer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <select
              id="budget"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={budget}
              onChange={(e) => setBudget(e.target.value as any)}
            >
              <option value="low">Low (Budget)</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>{result.querySummary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Top Recommendations</h4>
                <div className="flex flex-wrap gap-2">
                  {result.topRecommendations.map((rec, idx) => (
                    <Badge key={idx} variant="default">
                      <MapPin className="mr-1 h-3 w-3" />
                      {rec}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Confidence</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranked Destinations */}
          <Card>
            <CardHeader>
              <CardTitle>Ranked Destinations</CardTitle>
              <CardDescription>
                {result.rankedDestinations.length} destinations analyzed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.rankedDestinations.slice(0, 5).map((dest, idx) => (
                <div key={dest.destinationId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">
                        #{idx + 1} {dest.destinationName}
                      </h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {dest.destinationType}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {dest.totalMatchScore}
                      </div>
                      <div className="text-xs text-muted-foreground">/ 100</div>
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget Fit:</span>
                      <span className="font-medium">{dest.categoryScores.budgetFit}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weather:</span>
                      <span className="font-medium">{dest.categoryScores.weatherFit}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Safety:</span>
                      <span className="font-medium">{dest.categoryScores.safety}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transport:</span>
                      <span className="font-medium">{dest.categoryScores.transport}/10</span>
                    </div>
                  </div>

                  {/* Why Recommended */}
                  {dest.whyRecommended.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Why Recommended
                      </h5>
                      <ul className="text-sm space-y-1">
                        {dest.whyRecommended.map((reason, i) => (
                          <li key={i} className="text-muted-foreground">• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Downsides */}
                  {dest.possibleDownsides.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        Considerations
                      </h5>
                      <ul className="text-sm space-y-1">
                        {dest.possibleDownsides.map((downside, i) => (
                          <li key={i} className="text-muted-foreground">• {downside}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Data Quality Badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {dest.dataQuality}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Confidence: {Math.round(dest.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{result.scoreBreakdown}</p>
            </CardContent>
          </Card>

          {/* Warnings & Assumptions */}
          {(result.warnings.length > 0 || result.assumptions.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Important Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Warnings
                    </h4>
                    <ul className="text-sm space-y-1">
                      {result.warnings.map((warning, i) => (
                        <li key={i} className="text-muted-foreground">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.assumptions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Assumptions</h4>
                    <ul className="text-sm space-y-1">
                      {result.assumptions.map((assumption, i) => (
                        <li key={i} className="text-muted-foreground">• {assumption}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.sourcesUsed.map((source, idx) => (
                  <Badge key={idx} variant="secondary">
                    {source}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <p>Knowledge Base: {result.dataFreshness.knowledgeBase}</p>
                <p>Provider Data: {result.dataFreshness.providerData}</p>
                <p>Last Updated: {result.dataFreshness.lastUpdated}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
