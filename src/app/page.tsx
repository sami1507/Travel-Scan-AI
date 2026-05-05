import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Hotel, Cloud, DollarSign, Calendar, Bell, Brain, TrendingUp, Shield, Zap, CheckCircle2, Sparkles, ArrowRight, Globe2 } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">TravelScan</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-medium">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="font-medium shadow-lg shadow-primary/20">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative container mx-auto px-4 lg:px-8 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">AI-Powered Travel Intelligence</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6 text-balance bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text">
            Never miss a travel
            <span className="block text-primary mt-2">opportunity</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 text-balance max-w-2xl mx-auto leading-relaxed">
            Smart monitoring for flights, hotels, and weather. Get AI-powered insights and alerts when prices drop or conditions change.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                Start monitoring free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-semibold border-2">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            No credit card required • Free to start
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 lg:px-8 py-24">
          <div className="mx-auto max-w-3xl text-center mb-20">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium mb-6">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              FEATURES
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-5">Everything you need to track</h2>
            <p className="text-lg text-muted-foreground">Monitor all aspects of your travel plans from a single, intelligent dashboard</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="group border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Plane className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Flight prices</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Track prices across airlines and get alerts when fares drop
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Hotel className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Hotel availability</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Monitor room rates and availability at your preferred hotels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Cloud className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Weather conditions</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Stay informed about forecast changes at your destination
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Exchange rates</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Track currency fluctuations and get notified of favorable rates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Local events</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Discover concerts, festivals, and activities worth attending
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Bell className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Smart alerts</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  AI-powered insights delivered when you need them most
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 lg:px-8 py-24">
        <div className="mx-auto max-w-3xl text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium mb-6">
            <Zap className="h-3.5 w-3.5 text-primary" />
            HOW IT WORKS
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-5">Simple, automated monitoring</h2>
          <p className="text-lg text-muted-foreground">Set it up once, then let our AI do the work</p>
        </div>
        <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg mb-6 shadow-lg shadow-primary/20">
              1
            </div>
            <h3 className="font-bold mb-3 text-xl">Add your sources</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Configure monitoring for the travel data that matters to you—flights, hotels, weather, and more.
            </p>
          </div>

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg mb-6 shadow-lg shadow-primary/20">
              2
            </div>
            <h3 className="font-bold mb-3 text-xl">AI tracks changes</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Our system continuously monitors your sources and uses AI to identify meaningful changes.
            </p>
          </div>

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg mb-6 shadow-lg shadow-primary/20">
              3
            </div>
            <h3 className="font-bold mb-3 text-xl">Receive alerts</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Get notified instantly when prices drop, availability changes, or conditions shift.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-t border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 lg:px-8 py-24">
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold mb-3 text-lg">Real-time monitoring</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Continuous scanning ensures you never miss an opportunity</p>
            </div>
            <div className="text-center group">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold mb-3 text-lg">Secure & private</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Your data is encrypted and never shared with third parties</p>
            </div>
            <div className="text-center group">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold mb-3 text-lg">Always reliable</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Built on enterprise-grade infrastructure for 99.9% uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 lg:px-8 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-12 text-center shadow-2xl">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
            <div className="relative">
              <h2 className="text-4xl font-bold tracking-tight mb-5">Start monitoring today</h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">Join travelers who save time and money with automated alerts</p>
              <Link href="/signup">
                <Button size="lg" className="h-14 px-10 text-lg font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all">
                  Create your account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Free to start • No credit card required
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
