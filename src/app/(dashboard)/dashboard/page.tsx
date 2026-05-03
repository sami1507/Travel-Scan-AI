import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Plus, ArrowRight, Brain, Shield } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  // Mock data - will be replaced with real data
  const stats = {
    activeSources: 0,
    totalScans: 0,
    activeAlerts: 0,
    lastScan: null,
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Travel Intelligence Dashboard</h1>
        <p className="text-blue-100">Evidence-based insights from your travel data</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor your travel data and alerts</p>
        </div>
        <Link href="/dashboard/sources">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add source
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active sources</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.activeSources}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monitoring enabled
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total scans</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalScans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Data checks completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active alerts</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <AlertTriangle className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last scan</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {stats.lastScan ? "2m" : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.lastScan ? "ago" : "No scans yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent scans</CardTitle>
                <CardDescription className="text-sm">Latest monitoring activity</CardDescription>
              </div>
              <Link href="/dashboard/scans">
                <Button variant="ghost" size="sm" className="h-8">
                  <span className="text-xs">View all</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">No scans yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add a source to start monitoring</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent alerts</CardTitle>
                <CardDescription className="text-sm">AI-generated insights</CardDescription>
              </div>
              <Link href="/dashboard/alerts">
                <Button variant="ghost" size="sm" className="h-8">
                  <span className="text-xs">View all</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">No alerts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Alerts appear when changes are detected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="border-2 bg-muted/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Quick start guide</CardTitle>
          <CardDescription className="text-sm">Set up monitoring in three simple steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
              1
            </div>
            <div className="pt-0.5">
              <h4 className="font-medium text-sm mb-1">Add a source</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configure monitoring for flights, hotels, weather, or other travel data
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
              2
            </div>
            <div className="pt-0.5">
              <h4 className="font-medium text-sm mb-1">Automatic monitoring</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our system continuously checks for changes and updates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
              3
            </div>
            <div className="pt-0.5">
              <h4 className="font-medium text-sm mb-1">Receive alerts</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get notified when prices drop or conditions change
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/dashboard/sources">
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create your first source
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
