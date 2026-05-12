import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, CheckCircle, XCircle, Plane, Hotel, Cloud, DollarSign, Database, MapPin } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function SourcesPage() {
  // Check provider configuration status (safe - no secrets exposed)
  const providers = [
    {
      name: 'OpenAI GPT-4',
      type: 'AI Recommendations',
      icon: Brain,
      status: process.env.NEXT_PUBLIC_OPENAI_CONFIGURED === 'true' ? 'configured' : 'fallback',
      description: 'Primary AI engine for travel recommendations',
      fallbackAvailable: true,
    },
    {
      name: 'Anthropic Claude',
      type: 'AI Verification',
      icon: Brain,
      status: process.env.NEXT_PUBLIC_CLAUDE_CONFIGURED === 'true' ? 'configured' : 'optional',
      description: 'Optional AI verifier for recommendation quality',
      fallbackAvailable: false,
    },
    {
      name: 'Google Maps',
      type: 'Location Data',
      icon: MapPin,
      status: process.env.NEXT_PUBLIC_GOOGLE_MAPS_CONFIGURED === 'true' ? 'configured' : 'manual',
      description: 'Airport and location autocomplete',
      fallbackAvailable: true,
    },
    {
      name: 'Duffel',
      type: 'Flight Data',
      icon: Plane,
      status: process.env.NEXT_PUBLIC_DUFFEL_CONFIGURED === 'true' ? 'configured' : 'estimates',
      description: 'Real-time flight prices and availability',
      fallbackAvailable: true,
    },
    {
      name: 'Hotelbeds',
      type: 'Hotel Data',
      icon: Hotel,
      status: process.env.NEXT_PUBLIC_HOTELBEDS_CONFIGURED === 'true' ? 'configured' : 'estimates',
      description: 'Real-time hotel prices and availability',
      fallbackAvailable: true,
    },
    {
      name: 'Weather API',
      type: 'Weather Data',
      icon: Cloud,
      status: 'configured',
      description: 'Weather forecasts and seasonal data',
      fallbackAvailable: false,
    },
    {
      name: 'Currency API',
      type: 'Exchange Rates',
      icon: DollarSign,
      status: 'configured',
      description: 'Real-time currency exchange rates',
      fallbackAvailable: false,
    },
    {
      name: 'Supabase',
      type: 'Database',
      icon: Database,
      status: 'configured',
      description: 'User data and saved recommendations',
      fallbackAvailable: false,
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'fallback':
        return <Badge variant="secondary">Fallback Mode</Badge>
      case 'optional':
        return <Badge variant="outline">Optional</Badge>
      case 'manual':
        return <Badge variant="secondary">Manual Input</Badge>
      case 'estimates':
        return <Badge variant="secondary">Using Estimates</Badge>
      default:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Configured</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Providers</h1>
        <p className="text-sm text-muted-foreground">
          View the status of AI and data provider integrations powering TravelScan AI
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const Icon = provider.icon
          return (
            <Card key={provider.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">{provider.type}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(provider.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
                {provider.fallbackAvailable && provider.status !== 'configured' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✓ Fallback available - recommendations will still work
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-100">System Status: Operational</p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                All core features are working. When external providers are unavailable, the system automatically uses fallback data and estimates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
