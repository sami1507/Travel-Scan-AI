import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Plane, Hotel, Cloud, DollarSign, Calendar } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function SourcesPage() {
  // Mock data - will be replaced with real data in Phase 2
  const sources = []

  const sourceTypeIcons = {
    flights: Plane,
    hotels: Hotel,
    weather: Cloud,
    exchange_rates: DollarSign,
    events: Calendar,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data sources</h1>
          <p className="text-sm text-muted-foreground">Configure monitoring for your travel data</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add source
        </Button>
      </div>

      {/* Source Types */}
      <div>
        <h2 className="text-base font-semibold mb-4">Available source types</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Flights</CardTitle>
              <CardDescription className="text-sm">Monitor flight prices and availability</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Set up</Button>
            </CardContent>
          </Card>

          <Card className="border-2 cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Hotel className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Hotels</CardTitle>
              <CardDescription className="text-sm">Track hotel prices and availability</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Set up</Button>
            </CardContent>
          </Card>

          <Card className="border-2 cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Weather</CardTitle>
              <CardDescription className="text-sm">Get weather forecasts and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Set up</Button>
            </CardContent>
          </Card>

          <Card className="border-2 cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Exchange rates</CardTitle>
              <CardDescription className="text-sm">Monitor currency exchange rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Set up</Button>
            </CardContent>
          </Card>

          <Card className="border-2 cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Events</CardTitle>
              <CardDescription className="text-sm">Discover local events and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Set up</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Sources Table */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your sources</CardTitle>
          <CardDescription className="text-sm">Manage your configured monitoring sources</CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base mb-2">No sources yet</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">Configure your first source above to start monitoring travel data</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Interval</TableHead>
                  <TableHead className="text-xs">Last run</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Will be populated with real data */}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
