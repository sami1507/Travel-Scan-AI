import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Info, AlertCircle } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function AlertsPage() {
  // Mock data - will be replaced with real data in Phase 4
  const alerts = []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">AI-generated insights and notifications</p>
      </div>

      {/* Alert Filters */}
      <div className="flex gap-2">
        <Badge variant="default" className="cursor-pointer">All</Badge>
        <Badge variant="outline" className="cursor-pointer">Critical</Badge>
        <Badge variant="outline" className="cursor-pointer">High</Badge>
        <Badge variant="outline" className="cursor-pointer">Medium</Badge>
        <Badge variant="outline" className="cursor-pointer">Low</Badge>
        <Badge variant="outline" className="cursor-pointer">Info</Badge>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No alerts yet</p>
              <p className="text-sm mt-2">Alerts will appear when significant changes are detected</p>
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
