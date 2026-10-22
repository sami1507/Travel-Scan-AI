'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, TrendingDown, TrendingUp, AlertTriangle, Info, Calendar, DollarSign, AlertCircle, Check, X, ArrowRight } from 'lucide-react'
import { LoadingState } from '@/components/ui/loading-state'
import Link from 'next/link'
import type { UserAlert } from '@/lib/services/alerts'

const ALERT_ICONS: Record<string, any> = {
  score_improvement: TrendingUp,
  route_improvement: TrendingUp,
  timing_change: Calendar,
  weather_change: Calendar,
  budget_change: DollarSign,
  value_opportunity: DollarSign,
  recommendation_update: AlertCircle,
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 border-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<UserAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'read' }),
      })
      if (response.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)))
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error)
    }
  }

  const dismiss = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'dismiss' }),
      })
      if (response.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  if (loading) {
    return <LoadingState message="Loading alerts..." fullPage />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Travel Alerts</h1>
        <p className="text-muted-foreground">Price drops, travel warnings, and personalized notifications</p>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground max-w-2xl mx-auto">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No travel alerts yet</p>
              <p className="text-sm mt-3">Travel alerts notify you about:</p>
              <ul className="text-sm mt-2 space-y-1 text-left inline-block">
                <li className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  Price drops for your saved destinations
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Travel warnings and safety updates
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Visa requirement changes
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Favorable weather and travel conditions
                </li>
              </ul>
              <p className="text-sm mt-4">
                Create travel analyses and save destinations to start receiving personalized alerts.
              </p>
              <Link href="/dashboard/analysis">
                <Button className="mt-4">
                  Create Travel Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = ALERT_ICONS[alert.alert_type] || Bell
            return (
              <Card
                key={alert.id}
                className={!alert.is_read ? 'bg-primary/5 border-primary/20' : undefined}
              >
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{alert.title}</h3>
                          {!alert.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        {alert.trigger_reason && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <strong>Why:</strong> {alert.trigger_reason}
                          </p>
                        )}
                        {alert.destination_name && (
                          <Badge variant="outline" className="text-xs mt-2">
                            {alert.destination_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alert.is_read && (
                        <Button variant="ghost" size="sm" onClick={() => markAsRead(alert.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => dismiss(alert.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {alert.action_url && alert.action_label && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <a href={alert.action_url}>{alert.action_label}</a>
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {alert.alert_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
