import { TravelAnalysisTest } from '@/components/travel/travel-analysis-test'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function TravelTestPage() {
  // Block access in production environment
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Development Tool</AlertTitle>
          <AlertDescription>
            This page is only available in development mode. It has been disabled in production for security.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Travel Analysis Test</h1>
        <p className="text-muted-foreground">
          Test the AI Travel Analysis Engine end-to-end
        </p>
      </div>

      <TravelAnalysisTest />
    </div>
  )
}
