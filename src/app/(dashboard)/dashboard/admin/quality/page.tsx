'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { AlertCircle, Loader2, Star, Bell, Share2, Users } from 'lucide-react'
import type { QualityMetrics } from '@/lib/types/analytics'

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)

export default function AdminQualityPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/quality-metrics')
      const body = await response.json()
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Failed to load quality metrics')
      }
      setMetrics(body.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quality metrics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load quality metrics"
        description={error || 'Unknown error'}
        action={{ label: 'Retry', onClick: loadMetrics }}
      />
    )
  }

  const { recommendationQuality, feedback, alerts, sharing, personalization } = metrics

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Real product quality and engagement metrics, computed live from user activity
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Recommendation Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recommendationQuality.averageScore === null
                    ? '—'
                    : `${Math.round(recommendationQuality.averageScore)}/100`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {recommendationQuality.sampleSize} scored recommendations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Save Rate</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pct(feedback.saveTripRate)}</div>
                <p className="text-xs text-muted-foreground">{feedback.sampleSize} feedback events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alert Read Rate</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pct(alerts.readRate)}</div>
                <p className="text-xs text-muted-foreground">{alerts.total} alerts issued</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personalization Confidence</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pct(personalization.avgConfidence)}</div>
                <p className="text-xs text-muted-foreground">
                  {personalization.totalUsersWithPreferences} users with a learned profile
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sharing</CardTitle>
              <CardDescription>Analyses/routes shared and viewed via share links</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{sharing.totalShares}</p>
                <p className="text-sm text-muted-foreground mt-1">Shared links created</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{sharing.totalViews}</p>
                <p className="text-sm text-muted-foreground mt-1">Total views</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {sharing.avgViewsPerShare === null ? '—' : sharing.avgViewsPerShare.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Avg. views per share</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Destinations</CardTitle>
              <CardDescription>Ranked by save/select engagement in user_feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendationQuality.topDestinations.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="No feedback yet"
                  description="Destination rankings will appear once users start saving and rating recommendations."
                />
              ) : (
                <div className="space-y-4">
                  {recommendationQuality.topDestinations.slice(0, 5).map((dest, index) => (
                    <div key={dest.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{dest.name}</p>
                          <p className="text-sm text-muted-foreground">{dest.saves} saves</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{dest.score}</p>
                        <p className="text-xs text-muted-foreground">Quality Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Save Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{pct(feedback.saveTripRate)}</div>
                <p className="text-xs text-muted-foreground mt-1">Users saving recommendations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dismiss Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pct(feedback.dismissalRate)}</div>
                <p className="text-xs text-muted-foreground mt-1">Users dismissing recommendations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">View Only</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{pct(feedback.viewDetailsRate)}</div>
                <p className="text-xs text-muted-foreground mt-1">Users viewing without action</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alert Performance</CardTitle>
                <CardDescription>Alert engagement and usefulness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Read Rate</span>
                    <span className="font-medium">{pct(alerts.readRate)}</span>
                  </div>
                  <Progress value={(alerts.readRate ?? 0) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Dismiss Rate</span>
                    <span className="font-medium">{pct(alerts.dismissRate)}</span>
                  </div>
                  <Progress value={(alerts.dismissRate ?? 0) * 100} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">{alerts.total} total alerts issued</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sharing</CardTitle>
                <CardDescription>Content shared and viewed via share links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Shared links
                  </span>
                  <span className="font-medium">{sharing.totalShares}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Total views</span>
                  <span className="font-medium">{sharing.totalViews}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personalization Performance</CardTitle>
              <CardDescription>How many users have a learned preference profile</CardDescription>
            </CardHeader>
            <CardContent>
              {personalization.totalUsersWithPreferences === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No learned profiles yet"
                  description="This fills in once users submit enough feedback for the learning layer to infer preferences."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-primary">{personalization.totalUsersWithPreferences}</p>
                    <p className="text-sm text-muted-foreground mt-1">Users with a profile</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-primary">{pct(personalization.avgConfidence)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Avg. confidence</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {personalization.avgFeedbackCount.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Avg. feedback events/user</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
