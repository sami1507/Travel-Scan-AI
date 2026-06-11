import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp, ArrowRight, Brain, Plane, Sparkles, MapPin, Bookmark } from "lucide-react"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"

export const dynamic = 'force-dynamic'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

const TRAVEL_INSIGHTS = [
  {
    emoji: "🌊",
    title: "Best time for Greece",
    body: "Late April to early June: perfect weather, no crowds",
  },
  {
    emoji: "🏔️",
    title: "Georgia hidden gem",
    body: "Tbilisi → Kazbegi route is trending for 2026",
  },
  {
    emoji: "💰",
    title: "Budget tip",
    body: "Slovenia costs 40% less than similar Western Europe destinations",
  },
]

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userId = user?.id

  // Parallel fetches — all wrapped so failures degrade gracefully
  const [historyRes, savedRes, usageRes] = await Promise.allSettled([
    userId
      ? supabase
          .from('analysis_history')
          .select('id, query, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [], error: null }),

    userId
      ? supabase
          .from('saved_analyses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      : Promise.resolve({ count: 0, error: null }),

    userId
      ? (() => {
          const month = new Date().toISOString().slice(0, 7)
          const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!adminUrl || !adminKey) return Promise.resolve({ data: null, error: null })
          const admin = createClient(adminUrl, adminKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          return admin
            .from('usage_tracking')
            .select('analyses_count')
            .eq('user_id', userId)
            .eq('month', month)
            .maybeSingle()
        })()
      : Promise.resolve({ data: null, error: null }),
  ])

  const recentHistory =
    historyRes.status === 'fulfilled' && historyRes.value.data
      ? (historyRes.value.data as { id: string; query: string; created_at: string }[])
      : []

  const savedCount =
    savedRes.status === 'fulfilled' && 'count' in savedRes.value
      ? (savedRes.value.count ?? 0)
      : 0

  const usageData =
    usageRes.status === 'fulfilled' && usageRes.value.data
      ? (usageRes.value.data as { analyses_count: number })
      : null

  const analysesThisMonth = usageData?.analyses_count ?? 0
  const totalAnalyses = recentHistory.length  // used for empty-state logic only
  const lastAnalysis = recentHistory[0] ?? null

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 md:p-12 shadow-travel">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
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

      {/* Onboarding checklist — shown only to new users */}
      <OnboardingChecklist analysisCount={totalAnalyses} savedCount={savedCount} />

      {/* Action-oriented stat cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 — AI Analyses */}
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Analyses</CardTitle>
            <div className="icon-container-travel">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              {totalAnalyses === 0 ? "—" : totalAnalyses}
            </div>
            {totalAnalyses === 0 ? (
              <Link href="/dashboard/analysis" className="text-sm text-primary font-medium mt-2 inline-block hover:underline">
                Run your first analysis →
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Analyses completed</p>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Saved Trips */}
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saved Trips</CardTitle>
            <div className="icon-container-teal">
              <Bookmark className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              {savedCount === 0 ? "—" : savedCount}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {savedCount === 0 ? "No saved trips yet" : "Destinations saved"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3 — This Month */}
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Month</CardTitle>
            <div className="icon-container-sunset">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">{analysesThisMonth}</div>
            <p className="text-sm text-muted-foreground mt-2">of 3 free analyses used</p>
          </CardContent>
        </Card>

        {/* Card 4 — Last Analysis */}
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Last Analysis</CardTitle>
            <div className="icon-container-travel">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              {lastAnalysis ? timeAgo(lastAnalysis.created_at).split(' ')[0] : "—"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {lastAnalysis
                ? timeAgo(lastAnalysis.created_at).split(' ').slice(1).join(' ') || "ago"
                : "No analyses yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Analyses / Get Started */}
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Recent Analyses</CardTitle>
                <CardDescription className="text-sm mt-1">Your latest trip plans</CardDescription>
              </div>
              {totalAnalyses > 0 && (
                <Link href="/dashboard/saved">
                  <Button variant="ghost" size="sm" className="h-9 font-medium">
                    <span className="text-sm">View all</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {totalAnalyses === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-12 text-center">
                <div className="text-5xl mb-4">✈️</div>
                <h3 className="text-2xl font-bold mb-2">Plan your first trip</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Tell our AI where you want to go, your budget, and interests.
                  Get a full route plan with honest advice in 60 seconds.
                </p>
                <Button size="lg" asChild>
                  <Link href="/dashboard/analysis">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Start Your First Analysis
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">Free • No credit card • Takes 60 seconds</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentHistory.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href="/dashboard/analysis"
                      className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                          {entry.query}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(entry.created_at)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Travel Insights */}
        <Card className="border-0 shadow-premium-lg hover:shadow-travel transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Travel Insights</CardTitle>
                <CardDescription className="text-sm mt-1 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                    Updated weekly
                  </span>
                </CardDescription>
              </div>
              <Link href="/dashboard/intelligence">
                <Button variant="ghost" size="sm" className="h-9 font-medium">
                  <span className="text-sm">More</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {TRAVEL_INSIGHTS.map((insight) => (
                <li
                  key={insight.title}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4"
                >
                  <span className="text-2xl shrink-0 leading-none mt-0.5">{insight.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
