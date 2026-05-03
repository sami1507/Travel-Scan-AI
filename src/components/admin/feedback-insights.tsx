// Feedback insights component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { FeedbackInsights } from '@/lib/types/analytics'

interface FeedbackInsightsCardProps {
  data: FeedbackInsights
}

export function FeedbackInsightsCard({ data }: FeedbackInsightsCardProps) {
  const formatPercent = (rate: number) => `${(rate * 100).toFixed(1)}%`

  const metrics = [
    { label: 'Save Trip Rate', value: data.saveTripRate, color: 'bg-green-600' },
    { label: 'Thumbs Up Rate', value: data.thumbsUpRate, color: 'bg-blue-600' },
    { label: 'Selection Rate', value: data.selectionRate, color: 'bg-purple-600' },
    { label: 'View Details Rate', value: data.viewDetailsRate, color: 'bg-gray-600' },
    { label: 'Thumbs Down Rate', value: data.thumbsDownRate, color: 'bg-orange-600' },
    { label: 'Dismissal Rate', value: data.dismissalRate, color: 'bg-red-600' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Distribution</CardTitle>
        <CardDescription>User interaction rates across all feedback types</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{metric.label}</span>
              <span className="text-sm text-muted-foreground">{formatPercent(metric.value)}</span>
            </div>
            <Progress value={metric.value * 100} className="h-2" />
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Avg Rank Selected</span>
            <span className="text-2xl font-bold">#{data.avgRankSelected.toFixed(1)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            On average, users select the #{data.avgRankSelected.toFixed(1)} recommendation
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
