'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AnalysisErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[AnalysisErrorBoundary] CAUGHT ERROR:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      })
      
      // Try to log analysis shape if available
      try {
        // Try multiple paths to find analysis object
        let analysis = null
        
        // Path 1: Direct children props
        const childrenProps = (this.props.children as any)?.props
        if (childrenProps?.analysis) {
          analysis = childrenProps.analysis
        }
        
        // Path 2: Nested children
        if (!analysis && childrenProps?.children) {
          const nestedProps = (childrenProps.children as any)?.props
          if (nestedProps?.analysis) {
            analysis = nestedProps.analysis
          }
        }
        
        if (analysis) {
          console.error('[AnalysisErrorBoundary] Analysis shape:', {
            hasAnalysis: !!analysis,
            rankedDestinationsType: typeof analysis.rankedDestinations,
            rankedDestinationsIsArray: Array.isArray(analysis.rankedDestinations),
            rankedDestinationsLength: analysis.rankedDestinations?.length,
            topRecommendationsType: typeof analysis.topRecommendations,
            topRecommendationsIsArray: Array.isArray(analysis.topRecommendations),
            hasMeta: !!analysis._meta,
            cacheStatus: analysis._meta?.cacheStatus,
            openAIUsed: analysis.openAIUsed || analysis._meta?.openAIUsed,
            fallbackUsed: analysis.fallbackUsed || analysis._meta?.fallbackUsed,
            querySummaryType: typeof analysis.querySummary,
            scoreBreakdownType: typeof analysis.scoreBreakdown,
            confidenceType: typeof analysis.confidence,
            confidenceValue: analysis.confidence,
          })
          
          // Log first destination if available
          if (Array.isArray(analysis.rankedDestinations) && analysis.rankedDestinations.length > 0) {
            const firstDest = analysis.rankedDestinations[0]
            console.error('[AnalysisErrorBoundary] First destination shape:', {
              destinationId: firstDest.destinationId,
              destinationName: firstDest.destinationName,
              suggestedRouteType: typeof firstDest.suggestedRoute,
              suggestedRouteIsArray: Array.isArray(firstDest.suggestedRoute),
              whyRecommendedType: typeof firstDest.whyRecommended,
              whyRecommendedIsArray: Array.isArray(firstDest.whyRecommended),
              bestMonthsType: typeof firstDest.bestMonths,
              bestMonthsIsArray: Array.isArray(firstDest.bestMonths),
              totalMatchScoreType: typeof firstDest.totalMatchScore,
              totalMatchScoreValue: firstDest.totalMatchScore,
            })
          }
        } else {
          console.error('[AnalysisErrorBoundary] Could not find analysis object in component tree')
        }
      } catch (diagError) {
        console.error('[AnalysisErrorBoundary] Diagnostics failed:', diagError)
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Unable to Display Analysis
            </CardTitle>
            <CardDescription>
              We encountered an error while displaying this analysis result.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This might be due to an incomplete or incompatible analysis response. 
              Please try running a fresh analysis.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Run Fresh Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
