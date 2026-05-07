'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, TrendingUp, Brain, Database, AlertTriangle, RefreshCw } from 'lucide-react'

interface MLMonitoringData {
  mlHealth: {
    status: 'healthy' | 'degraded' | 'unknown'
    issues: string[]
  }
  comparison: {
    stats: {
      totalComparisons: number
      mlWins: number
      baselineWins: number
      ties: number
      avgScoreDifference: number
      avgRankingOverlap: number
      topRecommendationMatchRate: number
    }
    recentComparisons: Array<{
      comparisonId: string
      timestamp: string
      winner: 'ml' | 'baseline' | 'tie'
      winnerReason: string
      metrics: any
      differences: string[]
    }>
    config: any
  }
  retraining: {
    status: {
      ready: boolean
      reasons: string[]
      recommendedActions: string[]
      estimatedTrainingTime?: string
    }
    currentModel: {
      version: string
      trainingDate: string
      status: string
      metrics: any
    } | null
    modelHistory: Array<any>
    dataSnapshots: Array<any>
    recommendations: string[]
  }
  signals: {
    aggregation: {
      period: string
      userSignals: any
      globalSignals: any
      improvementOpportunities: string[]
    }
    improvementSignals: {
      userPreferenceUpdateCount: number
      globalQualityIssueCount: number
      featureImportanceHints: Array<{ feature: string; importance: number }>
    }
  }
  timestamp: string
}

export default function MLMonitoringPage() {
  const [data, setData] = useState<MLMonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch('/api/admin/ml-monitoring')
      if (!response.ok) throw new Error('Failed to load data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('Failed to load ML monitoring data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading ML monitoring data...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error || 'Failed to load data'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>
      case 'unknown':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Unknown</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const mlWinRate = data.comparison.stats.totalComparisons > 0
    ? (data.comparison.stats.mlWins / data.comparison.stats.totalComparisons * 100).toFixed(1)
    : '0.0'

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ML Monitoring</h1>
          <p className="text-muted-foreground">Baseline vs ML comparison, retraining readiness, and continuous improvement</p>
        </div>
        {getHealthBadge(data.mlHealth.status)}
      </div>

      {/* Health Issues */}
      {data.mlHealth.issues.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ML Health Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.mlHealth.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              ML Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mlWinRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.comparison.stats.mlWins} / {data.comparison.stats.totalComparisons} comparisons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Score Diff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.comparison.stats.avgScoreDifference > 0 ? '+' : ''}
              {data.comparison.stats.avgScoreDifference.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">
              ML vs Baseline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retraining Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.retraining.status.ready ? 'Ready' : 'Not Ready'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.retraining.currentModel ? `Model v${data.retraining.currentModel.version}` : 'No model'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Improvement Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.signals.aggregation.userSignals.totalSignals}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Baseline vs ML</TabsTrigger>
          <TabsTrigger value="retraining">Retraining</TabsTrigger>
          <TabsTrigger value="signals">Improvement Signals</TabsTrigger>
        </TabsList>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparison Statistics</CardTitle>
              <CardDescription>How ML compares to baseline recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Comparisons</div>
                  <div className="text-2xl font-bold">{data.comparison.stats.totalComparisons}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">ML Wins</div>
                  <div className="text-2xl font-bold text-green-600">{data.comparison.stats.mlWins}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Baseline Wins</div>
                  <div className="text-2xl font-bold text-blue-600">{data.comparison.stats.baselineWins}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ties</div>
                  <div className="text-2xl font-bold text-gray-600">{data.comparison.stats.ties}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ranking Overlap</div>
                  <div className="text-2xl font-bold">{(data.comparison.stats.avgRankingOverlap * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Top Match Rate</div>
                  <div className="text-2xl font-bold">{(data.comparison.stats.topRecommendationMatchRate * 100).toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Comparisons</CardTitle>
              <CardDescription>Last 20 baseline vs ML comparisons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.comparison.recentComparisons.map((comp) => (
                  <div key={comp.comparisonId} className="border-l-2 border-muted pl-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={comp.winner === 'ml' ? 'default' : comp.winner === 'baseline' ? 'secondary' : 'outline'}>
                            {comp.winner.toUpperCase()} Won
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comp.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comp.winnerReason}</p>
                        {comp.differences.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {comp.differences.map((diff, i) => (
                              <div key={i}>• {diff}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.comparison.recentComparisons.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No comparisons yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retraining Tab */}
        <TabsContent value="retraining" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retraining Readiness</CardTitle>
              <CardDescription>
                {data.retraining.status.ready ? 'System is ready for retraining' : 'System is not ready for retraining'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Status Reasons</h4>
                <ul className="space-y-1">
                  {data.retraining.status.reasons.map((reason, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className={data.retraining.status.ready ? 'text-green-500' : 'text-yellow-500'}>•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {data.retraining.status.recommendedActions.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-500">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {data.retraining.status.estimatedTrainingTime && (
                <div>
                  <h4 className="font-medium mb-1">Estimated Training Time</h4>
                  <p className="text-sm text-muted-foreground">{data.retraining.status.estimatedTrainingTime}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.retraining.currentModel && (
            <Card>
              <CardHeader>
                <CardTitle>Current Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Version</div>
                    <div className="font-medium">{data.retraining.currentModel.version}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge>{data.retraining.currentModel.status}</Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Training Date</div>
                    <div className="text-sm">{new Date(data.retraining.currentModel.trainingDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">NDCG</div>
                    <div className="font-medium">{data.retraining.currentModel.metrics.ndcg.toFixed(3)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {data.retraining.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Retraining Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.retraining.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signal Aggregation (Last 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                  <div className="text-2xl font-bold">{data.signals.aggregation.userSignals.totalUsers}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">User Signals</div>
                  <div className="text-2xl font-bold">{data.signals.aggregation.userSignals.totalSignals}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Strong Signals</div>
                  <div className="text-2xl font-bold">{data.signals.aggregation.userSignals.strongSignals}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Global Signals</div>
                  <div className="text-2xl font-bold">{data.signals.aggregation.globalSignals.totalSignals}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.signals.aggregation.improvementOpportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Improvement Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.signals.aggregation.improvementOpportunities.map((opp, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.signals.improvementSignals.featureImportanceHints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Feature Importance Hints</CardTitle>
                <CardDescription>Features that appear in quality signals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.signals.improvementSignals.featureImportanceHints.map((hint, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm">{hint.feature}</span>
                      <Badge variant="outline">{hint.importance}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  )
}
