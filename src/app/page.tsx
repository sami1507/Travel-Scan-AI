import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Hotel, Cloud, DollarSign, Calendar, Bell, Brain, TrendingUp, Shield, Zap, CheckCircle2 } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">TravelScan</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 lg:px-8 pt-20 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-sm">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Trusted by travelers worldwide</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6 text-balance">
            Never miss a travel opportunity
          </h1>
          <p className="text-lg text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
            Monitor flight prices, hotel availability, and weather conditions in real-time. Get intelligent alerts when it matters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start monitoring free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No credit card required</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8 py-20">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to track</h2>
            <p className="text-muted-foreground">Monitor all aspects of your travel plans from a single dashboard</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Flight prices</CardTitle>
                <CardDescription className="text-sm">
                  Track prices across airlines and get alerts when fares drop
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Hotel className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Hotel availability</CardTitle>
                <CardDescription className="text-sm">
                  Monitor room rates and availability at your preferred hotels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Cloud className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Weather conditions</CardTitle>
                <CardDescription className="text-sm">
                  Stay informed about forecast changes at your destination
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Exchange rates</CardTitle>
                <CardDescription className="text-sm">
                  Track currency fluctuations and get notified of favorable rates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Local events</CardTitle>
                <CardDescription className="text-sm">
                  Discover concerts, festivals, and activities worth attending
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Smart alerts</CardTitle>
                <CardDescription className="text-sm">
                  AI-powered insights delivered when you need them most
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 lg:px-8 py-20">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, automated monitoring</h2>
          <p className="text-muted-foreground">Set it up once, then let our AI do the work</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold mb-4">
              1
            </div>
            <h3 className="font-semibold mb-2 text-lg">Add your sources</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Configure monitoring for the travel data that matters to you—flights, hotels, weather, and more.
            </p>
          </div>

          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold mb-4">
              2
            </div>
            <h3 className="font-semibold mb-2 text-lg">AI tracks changes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our system continuously monitors your sources and uses AI to identify meaningful changes.
            </p>
          </div>

          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold mb-4">
              3
            </div>
            <h3 className="font-semibold mb-2 text-lg">Receive alerts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Get notified instantly when prices drop, availability changes, or conditions shift.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8 py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-time monitoring</h3>
              <p className="text-sm text-muted-foreground">Continuous scanning ensures you never miss an opportunity</p>
            </div>
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Secure & private</h3>
              <p className="text-sm text-muted-foreground">Your data is encrypted and never shared with third parties</p>
            </div>
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Always reliable</h3>
              <p className="text-sm text-muted-foreground">Built on enterprise-grade infrastructure for 99.9% uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 lg:px-8 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Start monitoring today</h2>
          <p className="text-muted-foreground mb-8">Join travelers who save time and money with automated alerts</p>
          <Link href="/signup">
            <Button size="lg">
              Create your account
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Free to start • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">TravelScan</span>
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
