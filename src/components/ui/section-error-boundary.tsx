'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: React.ReactNode
  sectionName: string
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SectionErrorBoundary extends React.Component<Props, State> {
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
      console.error(`Section Error Boundary (${this.props.sectionName}) caught an error:`)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      const defaultMessage = `${this.props.sectionName} is temporarily unavailable, but the rest of your analysis is still available.`
      const message = this.props.fallbackMessage || defaultMessage

      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 mb-1">
                  Section Unavailable
                </p>
                <p className="text-sm text-orange-800 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
