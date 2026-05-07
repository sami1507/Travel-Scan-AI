'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, TrendingUp, DollarSign, Database, AlertTriangle } from 'lucide-react'

interface OperationalMetrics {
  health: {
    status: 'healthy' | 'degraded' | 'critical'
    issues: string[]
  }
  errors: {
    stats: {
      total: number
      last24Hours: number
      lastHour: number
      byProvider: Record<string, number>
      bySeverity: Record<string, number>
    }
    recent: Array<{
      message: string
      severity: string
      provider?: string
      operation?: string
      timestamp: string
    }>
  }
  costs: {
    total: {
      total: number
      last24Hours: number
      lastHour: number
    }
    byProvider: Array<{
      provider: string
      totalCalls: number
      estimatedCost: number
      last24Hours: number
      lastHour: number
    }>
    expensive: Array<{
      provider: string
      operation: string
      totalCost: number
      callCount: number
    }>
  }
  cache: {
    enabled: boolean
    stats: Record<string, {
      hits: number
      misses: number
      errors: number
      hitRate: number
    }>
  }
  timestamp: string
}

export default function OperationsPage() {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMetrics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/admin/operations')
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError('Failed to load operational metrics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading operational metrics...</div>
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error || 'Failed to load metrics'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>
      case 'critical':
        return <Badge className="bg-red-500"><AlertCircle className="h-3 w-3 mr-1" />Critical</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operational Metrics</h1>
          <p className="text-muted-foreground">System health, errors, costs, and cache performance</p>
        </div>
        {getHealthBadge(metrics.health.status)}
      </div>

      {/* Health Issues */}
      {metrics.health.issues.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.health.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errors.stats.last24Hours}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.errors.stats.lastHour} in last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.costs.total.last24Hours.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${metrics.costs.total.lastHour.toFixed(2)} in last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cache.enabled ? 'Enabled' : 'Disabled'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.cache.enabled ? 'Reducing costs' : 'Not configured'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              API Calls (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.costs.byProvider.reduce((sum, p) => sum + p.last24Hours, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Errors by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.errors.stats.byProvider).map(([provider, count]) => (
                    <div key={provider} className="flex justify-between items-center">
                      <span className="capitalize">{provider}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(metrics.errors.stats.byProvider).length === 0 && (
                    <p className="text-sm text-muted-foreground">No errors by provider</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.errors.stats.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <span className="capitalize">{severity}</span>
                      <Badge variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'outline'}>
                        {count}
                      </Badge>
                    </div>
                  ))}
                  {Object.keys(metrics.errors.stats.bySeverity).length === 0 && (
                    <p className="text-sm text-muted-foreground">No errors by severity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Last 50 errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {metrics.errors.recent.map((error, i) => (
                  <div key={i} className="border-l-2 border-muted pl-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{error.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {error.provider && (
                            <Badge variant="outline" className="text-xs">{error.provider}</Badge>
                          )}
                          {error.operation && (
                            <Badge variant="outline" className="text-xs">{error.operation}</Badge>
                          )}
                          <Badge variant={error.severity === 'critical' || error.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                            {error.severity}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {metrics.errors.recent.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent errors</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Provider</CardTitle>
              <CardDescription>Estimated costs and API usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.costs.byProvider.map(provider => (
                  <div key={provider.provider} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium capitalize">{provider.provider}</span>
                      <span className="text-lg font-bold">${provider.estimatedCost.toFixed(4)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        <div className="text-xs">Total Calls</div>
                        <div className="font-medium text-foreground">{provider.totalCalls}</div>
                      </div>
                      <div>
                        <div className="text-xs">Last 24h</div>
                        <div className="font-medium text-foreground">{provider.last24Hours}</div>
                      </div>
                      <div>
                        <div className="text-xs">Last Hour</div>
                        <div className="font-medium text-foreground">{provider.lastHour}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {metrics.costs.byProvider.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No cost data</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Expensive Operations</CardTitle>
              <CardDescription>Top 10 operations by cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.costs.expensive.map((op, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{op.provider}</span>
                      <span className="text-muted-foreground"> / {op.operation}</span>
                      <span className="text-xs text-muted-foreground ml-2">({op.callCount} calls)</span>
                    </div>
                    <span className="font-bold">${op.totalCost.toFixed(4)}</span>
                  </div>
                ))}
                {metrics.costs.expensive.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No operation data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
              <CardDescription>
                {metrics.cache.enabled ? 'Cache is enabled and working' : 'Cache is not configured'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.cache.enabled ? (
                <div className="space-y-3">
                  {Object.entries(metrics.cache.stats).map(([namespace, stats]) => (
                    <div key={namespace} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{namespace}</span>
                        <Badge variant={stats.hitRate > 0.7 ? 'default' : stats.hitRate > 0.4 ? 'secondary' : 'outline'}>
                          {(stats.hitRate * 100).toFixed(1)}% hit rate
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <div className="text-xs">Hits</div>
                          <div className="font-medium text-foreground">{stats.hits}</div>
                        </div>
                        <div>
                          <div className="text-xs">Misses</div>
                          <div className="font-medium text-foreground">{stats.misses}</div>
                        </div>
                        <div>
                          <div className="text-xs">Errors</div>
                          <div className="font-medium text-foreground">{stats.errors}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(metrics.cache.stats).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No cache activity yet</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Cache is not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN to enable caching.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  )
}
