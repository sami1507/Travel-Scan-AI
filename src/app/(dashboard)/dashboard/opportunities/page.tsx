import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingDown, TrendingUp, ArrowRight, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function OpportunitiesPage() {
  // Mock data - will be replaced with real intelligence data
  const opportunities = []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Travel Opportunities</h1>
        <p className="text-muted-foreground">Evidence-based opportunities detected by our intelligence system</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Badge variant="default" className="cursor-pointer">All</Badge>
        <Badge variant="outline" className="cursor-pointer">Price Drops</Badge>
        <Badge variant="outline" className="cursor-pointer">Availability</Badge>
        <Badge variant="outline" className="cursor-pointer">Favorable Conditions</Badge>
      </div>

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground max-w-2xl mx-auto">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No travel opportunities detected yet</p>
              <p className="text-sm mt-2">
                Travel opportunities are AI-detected deals, price drops, and favorable travel conditions based on your saved trips and preferences.
              </p>
              <p className="text-sm mt-2">
                Create travel analyses to start receiving personalized opportunity alerts.
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
        <div className="grid gap-4">
          {opportunities.map((opportunity: any, idx: number) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{opportunity.title}</CardTitle>
                    <CardDescription>{opportunity.summary}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default">{opportunity.category}</Badge>
                    <Badge variant="outline">{opportunity.confidence}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key Facts */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Key Facts</h4>
                    <ul className="space-y-1">
                      {opportunity.facts?.map((fact: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Recommendation</h4>
                    <p className="text-sm">{opportunity.recommendation}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm">
                      View Evidence
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
