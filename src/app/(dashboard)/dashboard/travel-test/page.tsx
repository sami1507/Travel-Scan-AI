import { TravelAnalysisTest } from '@/components/travel/travel-analysis-test'

export const dynamic = 'force-dynamic'

export default function TravelTestPage() {
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
