'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, Activity, Users, Star, AlertCircle, Loader2 } from 'lucide-react'

export default function AdminQualityPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/admin/quality-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
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

  // Demo data for visualization
  const demoMetrics = {
    recommendationQuality: {
      averageScore: 78.5,
      trend: '+5.2%',
      topDestinations: [
        { name: 'Barcelona', score: 92, saves: 145 },
        { name: 'Tokyo', score: 89, saves: 132 },
        { name: 'Paris', score: 87, saves: 128 },
      ],
    },
    saveVsDismiss: {
      saveRate: 42.3,
      dismissRate: 12.7,
      viewOnlyRate: 45.0,
      trend: '+3.1%',
    },
    routeEngagement: {
      viewRate: 68.4,
      saveRate: 34.2,
      shareRate: 8.9,
      trend: '+2.4%',
    },
    alertUsefulness: {
      readRate: 76.8,
      actionRate: 45.3,
      dismissRate: 18.2,
      trend: '+1.8%',
    },
    personalizationPerformance: {
      profileCompleteness: 62.5,
      matchAccuracy: 81.3,
      userSatisfaction: 4.2,
      trend: '+4.5%',
    },
    featureUsage: [
      { feature: 'Travel Analysis', usage: 95, trend: 'up' },
      { feature: 'Saved Items', usage: 68, trend: 'up' },
      { feature: 'Comparison Mode', usage: 42, trend: 'up' },
      { feature: 'User Profile', usage: 38, trend: 'up' },
      { feature: 'Notifications', usage: 52, trend: 'neutral' },
      { feature: 'Share/Export', usage: 28, trend: 'up' },
    ],
  }

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend.startsWith('-')) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Activity className="h-4 w-4 text-gray-600" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Monitor product quality and user engagement metrics
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recommendation Quality</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{demoMetrics.recommendationQuality.averageScore}/100</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getTrendIcon(demoMetrics.recommendationQuality.trend)}
                  <span>{demoMetrics.recommendationQuality.trend} from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Save Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{demoMetrics.saveVsDismiss.saveRate}%</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getTrendIcon(demoMetrics.saveVsDismiss.trend)}
                  <span>{demoMetrics.saveVsDismiss.trend} from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alert Usefulness</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{demoMetrics.alertUsefulness.actionRate}%</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getTrendIcon(demoMetrics.alertUsefulness.trend)}
                  <span>{demoMetrics.alertUsefulness.trend} from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Match Accuracy</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{demoMetrics.personalizationPerformance.matchAccuracy}%</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getTrendIcon(demoMetrics.personalizationPerformance.trend)}
                  <span>{demoMetrics.personalizationPerformance.trend} from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Patterns</CardTitle>
              <CardDescription>Adoption rates across key features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoMetrics.featureUsage.map((feature: any) => (
                <div key={feature.feature} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{feature.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{feature.usage}%</span>
                      {feature.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                    </div>
                  </div>
                  <Progress value={feature.usage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Destinations</CardTitle>
              <CardDescription>Highest quality scores and save rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoMetrics.recommendationQuality.topDestinations.map((dest: any, index: number) => (
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
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Save Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{demoMetrics.saveVsDismiss.saveRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Users saving recommendations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dismiss Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{demoMetrics.saveVsDismiss.dismissRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Users dismissing recommendations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">View Only</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{demoMetrics.saveVsDismiss.viewOnlyRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Users viewing without action</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Route Engagement</CardTitle>
                <CardDescription>How users interact with route recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>View Rate</span>
                    <span className="font-medium">{demoMetrics.routeEngagement.viewRate}%</span>
                  </div>
                  <Progress value={demoMetrics.routeEngagement.viewRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Save Rate</span>
                    <span className="font-medium">{demoMetrics.routeEngagement.saveRate}%</span>
                  </div>
                  <Progress value={demoMetrics.routeEngagement.saveRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Share Rate</span>
                    <span className="font-medium">{demoMetrics.routeEngagement.shareRate}%</span>
                  </div>
                  <Progress value={demoMetrics.routeEngagement.shareRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Performance</CardTitle>
                <CardDescription>Alert engagement and usefulness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Read Rate</span>
                    <span className="font-medium">{demoMetrics.alertUsefulness.readRate}%</span>
                  </div>
                  <Progress value={demoMetrics.alertUsefulness.readRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Action Rate</span>
                    <span className="font-medium">{demoMetrics.alertUsefulness.actionRate}%</span>
                  </div>
                  <Progress value={demoMetrics.alertUsefulness.actionRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Dismiss Rate</span>
                    <span className="font-medium">{demoMetrics.alertUsefulness.dismissRate}%</span>
                  </div>
                  <Progress value={demoMetrics.alertUsefulness.dismissRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personalization Performance</CardTitle>
              <CardDescription>How well personalization improves recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-primary">{demoMetrics.personalizationPerformance.profileCompleteness}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Avg Profile Completeness</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-primary">{demoMetrics.personalizationPerformance.matchAccuracy}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Match Accuracy</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-primary">{demoMetrics.personalizationPerformance.userSatisfaction}/5</p>
                  <p className="text-sm text-muted-foreground mt-1">User Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Adoption Over Time</CardTitle>
              <CardDescription>Track which features users engage with most</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {demoMetrics.featureUsage.map((feature: any) => (
                  <div key={feature.feature} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{feature.feature}</p>
                        <p className="text-sm text-muted-foreground">
                          {feature.usage}% of users active
                        </p>
                      </div>
                      {feature.trend === 'up' && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Growing
                        </Badge>
                      )}
                    </div>
                    <Progress value={feature.usage} className="h-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
