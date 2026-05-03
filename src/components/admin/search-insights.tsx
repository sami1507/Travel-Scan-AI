// Search and query insights component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SearchInsights } from '@/lib/types/analytics'

interface SearchInsightsCardsProps {
  data: SearchInsights
}

export function SearchInsightsCards({ data }: SearchInsightsCardsProps) {
  const topBudgets = Object.entries(data.budgetDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const topMonths = Object.entries(data.monthDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([month, count]) => ({
      month: new Date(2024, parseInt(month) - 1).toLocaleString('default', { month: 'short' }),
      count,
    }))

  const topInterests = Object.entries(data.interestDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top Search Queries</CardTitle>
          <CardDescription>Most common user searches</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topQueries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No query data available</p>
          ) : (
            <div className="space-y-2">
              {data.topQueries.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{item.query}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>User budget preferences</CardDescription>
        </CardHeader>
        <CardContent>
          {topBudgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget data available</p>
          ) : (
            <div className="space-y-3">
              {topBudgets.map(([budget, count]) => (
                <div key={budget}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{budget}</span>
                    <span className="text-sm text-muted-foreground">{count} searches</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(count / Math.max(...topBudgets.map(b => b[1]))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popular Travel Months</CardTitle>
          <CardDescription>When users want to travel</CardDescription>
        </CardHeader>
        <CardContent>
          {topMonths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No month data available</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topMonths.map((item) => (
                <Badge key={item.month} variant="outline" className="px-3 py-1">
                  {item.month} ({item.count})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Interests</CardTitle>
          <CardDescription>User interest preferences</CardDescription>
        </CardHeader>
        <CardContent>
          {topInterests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interest data available</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topInterests.map(([interest, count]) => (
                <Badge key={interest} variant="secondary" className="px-3 py-1">
                  {interest} ({count})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
