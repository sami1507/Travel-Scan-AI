import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Plus, ArrowRight, Brain, Shield, Plane, Sparkles, Globe } from "lucide-react"
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
    <div className="space-y-10">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 md:p-12 shadow-travel">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered Travel Intelligence
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Welcome Back</h1>
            <p className="text-lg text-white/90 max-w-2xl">Your intelligent travel companion for smarter, budget-aware recommendations</p>
          </div>
          <Link href="/dashboard/analysis">
            <Button size="lg" className="gradient-sunset shadow-xl hover:shadow-2xl transition-all duration-300 w-full md:w-auto border-0 h-12 px-8">
              <Brain className="h-5 w-5 mr-2" />
              <span className="font-semibold">New Analysis</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Premium Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active sources</CardTitle>
            <div className="icon-container-travel">
              <Activity className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">{stats.activeSources}</div>
            <p className="text-sm text-muted-foreground mt-2.5">
              Monitoring enabled
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total scans</CardTitle>
            <div className="icon-container-teal">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">{stats.totalScans}</div>
            <p className="text-sm text-muted-foreground mt-2.5">
              Data checks completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active alerts</CardTitle>
            <div className="icon-container-sunset">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">{stats.activeAlerts}</div>
            <p className="text-sm text-muted-foreground mt-2.5">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Last scan</CardTitle>
            <div className="icon-container-travel">
              <Clock className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              {stats.lastScan ? "2m" : "—"}
            </div>
            <p className="text-sm text-muted-foreground mt-2.5">
              {stats.lastScan ? "ago" : "No scans yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Recent scans</CardTitle>
                <CardDescription className="text-sm mt-1">Latest monitoring activity</CardDescription>
              </div>
              <Link href="/dashboard/scans">
                <Button variant="ghost" size="sm" className="h-9 font-medium">
                  <span className="text-sm">View all</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-travel-subtle shadow-premium mb-4">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold text-base">No scans yet</p>
              <p className="text-sm text-muted-foreground mt-2">Add a source to start monitoring</p>
              <Link href="/dashboard/sources" className="mt-4">
                <Button variant="outline" size="sm" className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Recent alerts</CardTitle>
                <CardDescription className="text-sm mt-1">AI-generated insights</CardDescription>
              </div>
              <Link href="/dashboard/alerts">
                <Button variant="ghost" size="sm" className="h-9 font-medium">
                  <span className="text-sm">View all</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-travel-subtle shadow-premium mb-4">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
              <p className="font-semibold text-base">No alerts yet</p>
              <p className="text-sm text-muted-foreground mt-2">Alerts appear when changes are detected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="border-0 shadow-premium-xl gradient-travel-subtle hover:shadow-travel transition-all duration-300">
        <CardHeader className="pb-5">
          <CardTitle className="text-xl font-bold">Quick start guide</CardTitle>
          <CardDescription className="text-base mt-1">Set up monitoring in three simple steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-base flex-shrink-0 shadow-lg shadow-primary/20">
              1
            </div>
            <div className="pt-1">
              <h4 className="font-semibold text-base mb-2">Add a source</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configure monitoring for flights, hotels, weather, or other travel data
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-base flex-shrink-0 shadow-lg shadow-primary/20">
              2
            </div>
            <div className="pt-1">
              <h4 className="font-semibold text-base mb-2">Automatic monitoring</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our system continuously checks for changes and updates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-base flex-shrink-0 shadow-lg shadow-primary/20">
              3
            </div>
            <div className="pt-1">
              <h4 className="font-semibold text-base mb-2">Receive alerts</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get notified when prices drop or conditions change
              </p>
            </div>
          </div>

          <div className="pt-3">
            <Link href="/dashboard/analysis">
              <Button className="w-full h-12 text-base font-semibold gradient-travel shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
                <Sparkles className="h-4 w-4 mr-2" />
                Start your first analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
