import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, TrendingDown, AlertTriangle, Info, ArrowRight } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function AlertsPage() {
  // Mock data - will be replaced with real data in Phase 4
  const alerts = []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Travel Alerts</h1>
        <p className="text-muted-foreground">Price drops, travel warnings, and personalized notifications</p>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground max-w-2xl mx-auto">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No travel alerts yet</p>
              <p className="text-sm mt-3">
                Travel alerts notify you about:
              </p>
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
          {/* Will be populated with real alerts */}
        </div>
      )}
    </div>
  )
}
