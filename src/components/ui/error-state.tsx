'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  retry?: () => void
  showHomeButton?: boolean
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message, 
  retry,
  showHomeButton = false 
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{message}</p>
            <div className="flex gap-2">
              {retry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retry}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {showHomeButton && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

export function NetworkErrorState({ retry }: { retry?: () => void }) {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      retry={retry}
    />
  )
}

export function NotFoundErrorState() {
  return (
    <ErrorState
      title="Not Found"
      message="The page or resource you're looking for doesn't exist."
      showHomeButton
    />
  )
}

export function UnauthorizedErrorState() {
  return (
    <ErrorState
      title="Unauthorized"
      message="You don't have permission to access this resource. Please sign in or contact support."
      showHomeButton
    />
  )
}
