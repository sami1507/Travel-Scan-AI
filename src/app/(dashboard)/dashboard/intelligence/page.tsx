"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Shield } from "lucide-react"

export default function IntelligencePage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/intelligence/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordLimit: 100,
          changeLimit: 200,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate report')
      }

      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'destructive'
      case 'important': return 'default'
      case 'info': return 'secondary'
      default: return 'outline'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Travel Intelligence</h1>
          <p className="text-muted-foreground">Evidence-based insights from your travel data</p>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!report && !loading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No intelligence report generated yet</p>
              <p className="text-sm mt-2">Click Generate Report to analyze your travel data</p>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Data Quality */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Source Confidence</p>
                  <p className="text-2xl font-bold">{(report.dataQuality.sourceConfidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Completeness</p>
                  <p className="text-2xl font-bold">{(report.dataQuality.dataCompleteness * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">{new Date(report.dataQuality.lastUpdated).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{report.overallAssessment}</p>
            </CardContent>
          </Card>

          {/* Top Opportunities */}
          {report.topOpportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.topOpportunities.map((opp: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Top Risks */}
          {report.topRisks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Top Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.topRisks.map((risk: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommended Actions */}
          {report.recommendedActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendedActions.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Detailed Insights</h2>
            {report.insights.map((insight: any, idx: number) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">{insight.summary}</CardTitle>
                      <CardDescription>{insight.reasoning}</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-4">
                      <Badge variant={getSeverityColor(insight.severity)}>{insight.severity}</Badge>
                      <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                        {insight.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Facts */}
                    {insight.facts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Verified Facts</h4>
                        <ul className="space-y-1">
                          {insight.facts.map((fact: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evidence */}
                    {insight.evidence.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Supporting Evidence</h4>
                        <div className="space-y-2">
                          {insight.evidence.map((ev: any, i: number) => (
                            <div key={i} className="text-sm bg-muted/50 p-2 rounded">
                              <p className="font-medium">{ev.fact}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Source: {ev.source} • Confidence: {ev.confidence}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unsupported Gaps */}
                    {insight.unsupportedGaps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-orange-600">Data Gaps</h4>
                        <ul className="space-y-1">
                          {insight.unsupportedGaps.map((gap: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-orange-600">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-semibold mb-1 text-blue-900 dark:text-blue-100">Recommendation</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{insight.recommendation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
