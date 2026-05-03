// Admin analytics overview components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, ThumbsUp, ThumbsDown, Save, Eye, X, Target } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function MetricCard({ title, value, description, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center text-xs mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OverviewMetricsProps {
  data: {
    totalAnalyses: number
    totalFeedbackEvents: number
    totalSaves: number
    totalDismisses: number
    totalThumbsUp: number
    totalThumbsDown: number
    totalSelections: number
    totalViews: number
    uniqueUsers: number
  }
}

export function OverviewMetrics({ data }: OverviewMetricsProps) {
  const saveRate = data.totalFeedbackEvents > 0 
    ? ((data.totalSaves / data.totalFeedbackEvents) * 100).toFixed(1)
    : '0.0'
  
  const positiveRate = data.totalFeedbackEvents > 0
    ? (((data.totalThumbsUp + data.totalSaves + data.totalSelections) / data.totalFeedbackEvents) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Analyses"
        value={data.totalAnalyses.toLocaleString()}
        description="Travel queries analyzed"
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard
        title="Unique Users"
        value={data.uniqueUsers.toLocaleString()}
        description="Active users"
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        title="Save Rate"
        value={`${saveRate}%`}
        description={`${data.totalSaves} trips saved`}
        icon={<Save className="h-4 w-4" />}
      />
      <MetricCard
        title="Positive Rate"
        value={`${positiveRate}%`}
        description="Thumbs up + saves + selections"
        icon={<ThumbsUp className="h-4 w-4" />}
      />
      <MetricCard
        title="Total Feedback"
        value={data.totalFeedbackEvents.toLocaleString()}
        description="All user interactions"
        icon={<Eye className="h-4 w-4" />}
      />
      <MetricCard
        title="Thumbs Up"
        value={data.totalThumbsUp.toLocaleString()}
        description="Positive feedback"
        icon={<ThumbsUp className="h-4 w-4" />}
      />
      <MetricCard
        title="Thumbs Down"
        value={data.totalThumbsDown.toLocaleString()}
        description="Negative feedback"
        icon={<ThumbsDown className="h-4 w-4" />}
      />
      <MetricCard
        title="Dismissals"
        value={data.totalDismisses.toLocaleString()}
        description="Recommendations dismissed"
        icon={<X className="h-4 w-4" />}
      />
    </div>
  )
}
