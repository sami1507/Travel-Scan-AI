'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Activity, 
  Users, 
  Brain, 
  TrendingUp, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Database,
  Zap,
  ArrowRight
} from 'lucide-react'

interface SystemMetrics {
  totalAnalyses: number
  totalUsers: number
  feedbackCount: number
  fallbackUsageRate: number
  providerStatus: {
    openai: boolean
    claude: boolean
    supabase: boolean
  }
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/analytics?type=overview')
      
      if (res.status === 403) {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load metrics')
      }

      const data = await res.json()
      setMetrics(data.data || {
        totalAnalyses: 0,
        totalUsers: 0,
        feedbackCount: 0,
        fallbackUsageRate: 0,
        providerStatus: {
          openai: process.env.NEXT_PUBLIC_OPENAI_CONFIGURED === 'true',
          claude: process.env.NEXT_PUBLIC_CLAUDE_CONFIGURED === 'true',
          supabase: true,
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground mt-1">System overview and metrics</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground mt-1">System overview and metrics</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground mt-1">
          System overview and operational metrics
        </p>
      </div>

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalAnalyses || 0}</div>
            <p className="text-xs text-muted-foreground">Travel recommendations generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Received</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.feedbackCount || 0}</div>
            <p className="text-xs text-muted-foreground">User feedback submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallback Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.fallbackUsageRate ? `${(metrics.fallbackUsageRate * 100).toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Using fallback routes</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Status</CardTitle>
          <CardDescription>Current status of integrated services</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            {metrics?.providerStatus.openai ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-orange-500" />
            )}
            <div>
              <p className="font-medium">OpenAI GPT-4</p>
              <p className="text-xs text-muted-foreground">
                {metrics?.providerStatus.openai ? 'Active' : 'Fallback Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {metrics?.providerStatus.claude ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">Anthropic Claude</p>
              <p className="text-xs text-muted-foreground">
                {metrics?.providerStatus.claude ? 'Active' : 'Optional'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {metrics?.providerStatus.supabase ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="font-medium">Supabase</p>
              <p className="text-xs text-muted-foreground">
                {metrics?.providerStatus.supabase ? 'Active' : 'Offline'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Operations
            </CardTitle>
            <CardDescription>System health and monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/operations">
              <Button variant="outline" className="w-full">
                View Operations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ML Monitoring
            </CardTitle>
            <CardDescription>AI quality and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/ml-monitoring">
              <Button variant="outline" className="w-full">
                View ML Metrics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality
            </CardTitle>
            <CardDescription>Recommendation quality metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/quality">
              <Button variant="outline" className="w-full">
                View Quality
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Intelligence
            </CardTitle>
            <CardDescription>User feedback insights</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/feedback-intelligence">
              <Button variant="outline" className="w-full">
                View Feedback
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Intelligence Signals
            </CardTitle>
            <CardDescription>System-generated insights</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/intelligence-signals">
              <Button variant="outline" className="w-full">
                View Signals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Providers
            </CardTitle>
            <CardDescription>Provider configuration status</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/sources">
              <Button variant="outline" className="w-full">
                View Providers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
