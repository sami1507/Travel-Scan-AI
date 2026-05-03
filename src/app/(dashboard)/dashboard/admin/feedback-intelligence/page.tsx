'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, TrendingDown, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function FeedbackIntelligencePage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<any>(null)

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      const response = await fetch('/api/admin/feedback-insights')
      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Demo data for visualization
  const demoInsights = {
    commonNegativeThemes: [
      { theme: 'Budget mismatch', count: 45, severity: 'high' },
      { theme: 'Wrong season/weather', count: 32, severity: 'medium' },
      { theme: 'Route too complicated', count: 28, severity: 'medium' },
      { theme: 'Missing safety information', count: 18, severity: 'high' },
      { theme: 'Explanation unclear', count: 15, severity: 'low' },
    ],
    commonPositiveThemes: [
      { theme: 'Perfect budget match', count: 78, severity: 'high' },
      { theme: 'Great timing', count: 65, severity: 'high' },
      { theme: 'Helpful explanation', count: 52, severity: 'medium' },
      { theme: 'Good value', count: 41, severity: 'medium' },
    ],
    routeComplaints: [
      { issue: 'Too many transfers', count: 24 },
      { issue: 'Unrealistic timing', count: 18 },
      { issue: 'Missing transport info', count: 12 },
    ],
    budgetMismatches: [
      { destination: 'Switzerland', count: 15, avgBudget: 'budget', avgScore: 45 },
      { destination: 'Norway', count: 12, avgBudget: 'budget', avgScore: 48 },
      { destination: 'Iceland', count: 10, avgBudget: 'moderate', avgScore: 52 },
    ],
    explanationQuality: {
      avgRating: 3.8,
      lowRatingCount: 23,
      commonIssues: ['Too generic', 'Missing specifics', 'No data sources'],
    },
    userIntentCorrections: [
      { correction: 'Prefer safer destinations', count: 34 },
      { correction: 'Care more about budget', count: 28 },
      { correction: 'Simpler routes preferred', count: 22 },
      { correction: 'Prefer nature over cities', count: 19 },
    ],
    productIssueClusters: [
      { issue: 'Scoring mismatch', count: 31, severity: 'high' },
      { issue: 'Seasonal mismatch', count: 25, severity: 'medium' },
      { issue: 'Missing data', count: 18, severity: 'medium' },
      { issue: 'Poor explanation', count: 15, severity: 'low' },
    ],
    scoreWeightSuggestions: [
      { category: 'budgetFit', current: 1.0, suggested: 1.3, confidence: 0.85, feedbackCount: 45 },
      { category: 'safety', current: 1.0, suggested: 1.2, confidence: 0.78, feedbackCount: 32 },
      { category: 'weatherFit', current: 1.0, suggested: 1.15, confidence: 0.72, feedbackCount: 28 },
    ],
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    }
    return colors[severity] || colors.medium
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered insights from user feedback
        </p>
      </div>

      <Tabs defaultValue="themes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="issues">Product Issues</TabsTrigger>
          <TabsTrigger value="corrections">User Intent</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Negative Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Common Negative Themes
                </CardTitle>
                <CardDescription>Most frequent complaints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoInsights.commonNegativeThemes.map((theme: any) => (
                  <div key={theme.theme} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{theme.theme}</p>
                      <p className="text-sm text-muted-foreground">{theme.count} mentions</p>
                    </div>
                    <Badge className={getSeverityColor(theme.severity)}>
                      {theme.severity}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Positive Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Common Positive Themes
                </CardTitle>
                <CardDescription>What users love</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoInsights.commonPositiveThemes.map((theme: any) => (
                  <div key={theme.theme} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{theme.theme}</p>
                      <p className="text-sm text-muted-foreground">{theme.count} mentions</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Route Complaints */}
          <Card>
            <CardHeader>
              <CardTitle>Route Planning Issues</CardTitle>
              <CardDescription>Recurring route complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {demoInsights.routeComplaints.map((complaint: any) => (
                  <div key={complaint.issue} className="flex items-center justify-between p-2 border-l-4 border-orange-500 pl-4">
                    <span className="font-medium">{complaint.issue}</span>
                    <Badge variant="outline">{complaint.count} reports</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Mismatches */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Mismatch Patterns</CardTitle>
              <CardDescription>Destinations with frequent budget complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {demoInsights.budgetMismatches.map((mismatch: any) => (
                  <div key={mismatch.destination} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{mismatch.destination}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg budget: {mismatch.avgBudget} • Score: {mismatch.avgScore}/100
                      </p>
                    </div>
                    <Badge variant="destructive">{mismatch.count} complaints</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Product Issue Clusters
              </CardTitle>
              <CardDescription>Aggregated product issues from AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoInsights.productIssueClusters.map((cluster: any) => (
                <div key={cluster.issue} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{cluster.issue.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{cluster.count} occurrences</p>
                  </div>
                  <Badge className={getSeverityColor(cluster.severity)}>
                    {cluster.severity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explanation Quality</CardTitle>
              <CardDescription>User feedback on recommendation explanations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Rating</span>
                  <span className="text-2xl font-bold">{demoInsights.explanationQuality.avgRating}/5</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Common Issues:</p>
                  {demoInsights.explanationQuality.commonIssues.map((issue: string) => (
                    <Badge key={issue} variant="outline" className="mr-2">
                      {issue}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {demoInsights.explanationQuality.lowRatingCount} low ratings (≤2 stars)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corrections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Top User Intent Corrections
              </CardTitle>
              <CardDescription>What users are telling us about their preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoInsights.userIntentCorrections.map((correction: any, index: number) => (
                <div key={correction.correction} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <p className="font-medium">{correction.correction}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{correction.count} users</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Weight Adjustment Suggestions</CardTitle>
              <CardDescription>
                Data-driven suggestions for improving scoring (requires admin approval)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoInsights.scoreWeightSuggestions.map((suggestion: any) => (
                <div key={suggestion.category} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">{suggestion.category.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-sm text-muted-foreground">
                        Based on {suggestion.feedbackCount} feedback items
                      </p>
                    </div>
                    <Badge variant="outline">
                      {(suggestion.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium ml-2">{suggestion.current.toFixed(1)}</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div>
                      <span className="text-muted-foreground">Suggested:</span>
                      <span className="font-medium ml-2 text-primary">{suggestion.suggested.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Review Details</Button>
                    <Button size="sm">Approve</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
