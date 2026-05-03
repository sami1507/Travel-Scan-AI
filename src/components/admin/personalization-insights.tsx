// Personalization insights component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, Activity } from 'lucide-react'
import type { PersonalizationInsights } from '@/lib/types/analytics'

interface PersonalizationInsightsCardProps {
  data: PersonalizationInsights
}

export function PersonalizationInsightsCard({ data }: PersonalizationInsightsCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Users with Preferences</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalUsersWithPreferences}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Users with learned preferences
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(data.avgConfidence * 100).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            Preference inference confidence
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Feedback Count</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avgFeedbackCount.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Feedback events per user
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Common Preference Patterns</CardTitle>
          <CardDescription>Most frequent inferred preferences across users</CardDescription>
        </CardHeader>
        <CardContent>
          {data.commonPreferencePatterns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No preference patterns available</p>
          ) : (
            <div className="space-y-2">
              {data.commonPreferencePatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{pattern.pattern}</span>
                  <Badge variant="secondary">{pattern.count} users</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
