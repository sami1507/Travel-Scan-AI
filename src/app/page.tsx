import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Hotel, Cloud, DollarSign, Calendar, Bell, Brain, TrendingUp, Shield, Zap, CheckCircle2, Sparkles, ArrowRight, Globe2, Compass, Route, MapPin, Wallet, Train, Mountain, Utensils, Landmark } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">TravelScan</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-medium">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="font-semibold shadow-md shadow-primary/20">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative container mx-auto px-4 lg:px-8 pt-28 pb-32 overflow-hidden">
        {/* Enhanced background with travel atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-warning/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0icm91dGUiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDAgNTAgUSAyNSAyNSA1MCA1MCBUIDEwMCA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJoc2woMjE3IDkxJSA2MCUgLyAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtZGFzaGFycmF5PSI1IDUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyIiBmaWxsPSJoc2woMjE3IDkxJSA2MCUgLyAwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3JvdXRlKSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-6 py-2.5 text-sm backdrop-blur-sm shadow-premium-lg animate-fade-in opacity-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI-Powered Travel Intelligence</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-8 text-balance">
            <span className="block animate-fade-up opacity-0 delay-100 bg-gradient-to-br from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">Discover smarter</span>
            <span className="block animate-fade-up opacity-0 delay-200 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mt-3">travel destinations</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 text-balance max-w-2xl mx-auto leading-relaxed animate-fade-up opacity-0 delay-300">
            AI-powered route analysis with realistic itineraries, budget-aware recommendations, and passport-smart suggestions. Find your perfect trip.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up opacity-0 delay-400">
            <Link href="/signup">
              <Button size="lg" className="group w-full sm:w-auto px-10 h-14 font-bold text-base gradient-travel shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all hover:scale-105 border-0">
                <Compass className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" />
                Get 3 Recommendations
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 font-semibold hover:border-primary/50 transition-colors">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-muted-foreground flex items-center justify-center gap-2 animate-fade-in opacity-0 delay-500">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            No credit card required • Free to start
          </p>
          {/* Floating travel icon */}
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none hidden lg:block">
            <Compass className="h-24 w-24 text-primary animate-float" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjEiIGZpbGw9ImhzbCgyMTcgOTElIDYwJSAvIDAuMDUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]  opacity-50 pointer-events-none" />
        <div className="container mx-auto px-4 lg:px-8 py-28 relative">
          <div className="mx-auto max-w-3xl text-center mb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-2 text-xs font-bold mb-8 shadow-premium backdrop-blur-sm">
              <Route className="h-4 w-4 text-primary" />
              CORE FEATURES
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Smart travel intelligence</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">AI-powered analysis that understands routes, budgets, and real travel logistics</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="group border-0 shadow-premium-lg hover:shadow-travel hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-travel shadow-premium mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Brain className="h-8 w-8 text-white transition-transform group-hover:scale-110" />
                </div>
                <CardTitle className="text-xl mb-2 font-bold">AI Route Analysis</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Intelligent destination matching with realistic route planning and travel fatigue scoring
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-premium-lg hover:shadow-travel hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-teal shadow-premium mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Wallet className="h-8 w-8 text-white transition-transform group-hover:scale-110" />
                </div>
                <CardTitle className="text-xl mb-2 font-bold">Budget-Aware Matching</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Recommendations tailored to your budget with realistic cost estimates per destination
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-premium-lg hover:shadow-travel hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-sunset shadow-premium mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Shield className="h-8 w-8 text-white transition-transform group-hover:scale-110" />
                </div>
                <CardTitle className="text-xl mb-2 font-bold">Passport-Smart Suggestions</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Visa requirements and entry restrictions automatically factored into recommendations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-premium-lg hover:shadow-travel hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-premium mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Route className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2 font-bold">Realistic Route Logic</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Multi-city itineraries with transport analysis and travel time considerations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-premium-lg hover:shadow-travel hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 shadow-premium mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-warning" />
                </div>
                <CardTitle className="text-xl mb-2 font-bold">Seasonal Optimization</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Weather patterns and seasonal timing matched to your travel months
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-premium-lg hover:shadow-travel hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 shadow-premium mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-xl mb-2 font-bold">Smart Itineraries</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Curated fallback routes with realistic nights distribution and consultant notes
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 lg:px-8 py-28">
        <div className="mx-auto max-w-3xl text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-gradient-to-r from-accent/5 to-primary/5 px-5 py-2 text-xs font-bold mb-8 shadow-premium backdrop-blur-sm">
            <Compass className="h-4 w-4 text-accent" />
            HOW IT WORKS
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Get recommendations in 3 steps</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">AI-powered travel intelligence made simple</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          <div className="relative text-center group">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-travel text-white font-bold text-2xl mb-6 shadow-premium-lg mx-auto group-hover:scale-110 transition-transform duration-300">
              1
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 mx-auto">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold mb-3 text-xl">Enter preferences</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Tell us your budget, travel months, interests, passport country, and trip structure
            </p>
          </div>

          <div className="relative text-center group">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-teal text-white font-bold text-2xl mb-6 shadow-premium-lg mx-auto group-hover:scale-110 transition-transform duration-300">
              2
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-4 mx-auto">
              <Brain className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-bold mb-3 text-xl">AI analyzes routes</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Smart matching considers budget, passport, timing, route realism, and travel fatigue
            </p>
          </div>

          <div className="relative text-center group">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-sunset text-white font-bold text-2xl mb-6 shadow-premium-lg mx-auto group-hover:scale-110 transition-transform duration-300">
              3
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 mb-4 mx-auto">
              <Sparkles className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-bold mb-3 text-xl">Get 3 recommendations</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Receive realistic itineraries with route details, consultant notes, and alternatives
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-t border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 lg:px-8 py-28">
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-travel shadow-premium-lg mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Route className="h-10 w-10 text-white" />
              </div>
              <h3 className="font-bold mb-3 text-xl">Route Intelligence</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Realistic multi-city itineraries with transport logic and fatigue analysis</p>
            </div>
            <div className="text-center group">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-teal shadow-premium-lg mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h3 className="font-bold mb-3 text-xl">Passport-Aware</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Visa requirements automatically factored into every recommendation</p>
            </div>
            <div className="text-center group">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-sunset shadow-premium-lg mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h3 className="font-bold mb-3 text-xl">AI-Verified</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Optional Claude verification for enhanced recommendation accuracy</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 lg:px-8 py-28">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/10 to-warning/10 p-14 md:p-16 text-center shadow-travel">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImN0YSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSIyIiBmaWxsPSJoc2woMjE3IDkxJSA2MCUgLyAwLjEpIi8+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0iaHNsKDE3NCA4NCUgNDAlIC8gMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNjdGEpIi8+PC9zdmc+')]  opacity-40" />
            <div className="absolute top-10 right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-travel shadow-premium-xl mx-auto mb-6">
                <Compass className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Ready to find your next trip?</h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">Get AI-powered recommendations tailored to your budget, passport, and travel style</p>
              <Link href="/signup">
                <Button size="lg" className="group h-16 px-12 text-lg font-bold gradient-travel shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all hover:scale-105 border-0">
                  <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" />
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <p className="mt-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                No credit card • 3 free recommendations • Instant results
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">TravelScan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} TravelScan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
