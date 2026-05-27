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
      console.error('Analysis Error Boundary caught an error:')
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('Component stack:', errorInfo.componentStack)
      
      // Try to log analysis shape if available
      try {
        const analysisElement = (this.props.children as any)?.props?.children
        if (analysisElement) {
          console.log('Analysis data shape check:')
          const analysis = analysisElement?.props?.analysis
          if (analysis) {
            console.log('- has rankedDestinations:', Array.isArray(analysis.rankedDestinations))
            console.log('- rankedDestinations length:', analysis.rankedDestinations?.length)
            console.log('- has _meta:', !!analysis._meta)
            console.log('- fallbackUsed:', analysis.fallbackUsed || analysis._meta?.fallbackUsed)
            console.log('- openAIUsed:', analysis.openAIUsed || analysis._meta?.openAIUsed)
            console.log('- cacheStatus:', analysis._meta?.cacheStatus)
          }
        }
      } catch (diagError) {
        console.log('Could not log analysis diagnostics')
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
