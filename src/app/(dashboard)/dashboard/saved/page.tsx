'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bookmark, MapPin, Route, Clock, Star, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { SavedAnalysis, SavedDestination, SavedRoute } from '@/lib/services/saved-items'

export default function SavedPage() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [destinations, setDestinations] = useState<SavedDestination[]>([])
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSavedItems()
  }, [])

  const loadSavedItems = async () => {
    try {
      const [analysesRes, destinationsRes, routesRes] = await Promise.all([
        fetch('/api/saved/analyses'),
        fetch('/api/saved/destinations'),
        fetch('/api/saved/routes'),
      ])

      if (analysesRes.ok) {
        const data = await analysesRes.json()
        setAnalyses(data.analyses || [])
      }

      if (destinationsRes.ok) {
        const data = await destinationsRes.json()
        setDestinations(data.destinations || [])
      }

      if (routesRes.ok) {
        const data = await routesRes.json()
        setRoutes(data.routes || [])
      }
    } catch (error) {
      console.error('Failed to load saved items:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (type: 'analysis' | 'destination' | 'route', id: string, currentValue: boolean) => {
    try {
      const endpoint = `/api/saved/${type === 'analysis' ? 'analyses' : type === 'destination' ? 'destinations' : 'routes'}`
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: { is_favorite: !currentValue } }),
      })
      loadSavedItems()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const deleteItem = async (type: 'analysis' | 'destination' | 'route', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const endpoint = `/api/saved/${type === 'analysis' ? 'analyses' : type === 'destination' ? 'destinations' : 'routes'}`
      await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' })
      loadSavedItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading saved items...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Items</h1>
        <p className="text-muted-foreground mt-1">
          Your saved analyses, destinations, and routes
        </p>
      </div>

      <Tabs defaultValue="analyses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyses">
            <Bookmark className="h-4 w-4 mr-2" />
            Analyses ({analyses.length})
          </TabsTrigger>
          <TabsTrigger value="destinations">
            <MapPin className="h-4 w-4 mr-2" />
            Destinations ({destinations.length})
          </TabsTrigger>
          <TabsTrigger value="routes">
            <Route className="h-4 w-4 mr-2" />
            Routes ({routes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="space-y-4">
          {analyses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved analyses</h3>
                <p className="text-muted-foreground max-w-md">
                  Save your travel analyses to revisit them later
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {analyses.map((analysis) => (
                <Card key={analysis.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{analysis.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {analysis.query}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite('analysis', analysis.id, analysis.is_favorite)}
                      >
                        <Star className={`h-4 w-4 ${analysis.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.tags && analysis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {analysis.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/dashboard/saved/${analysis.id}`}>
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem('analysis', analysis.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="destinations" className="space-y-4">
          {destinations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved destinations</h3>
                <p className="text-muted-foreground max-w-md">
                  Save destinations from your analyses to track them
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {destinations.map((dest) => (
                <Card key={dest.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{dest.destination_name}</CardTitle>
                        <CardDescription className="text-xs capitalize">
                          {dest.destination_type}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite('destination', dest.id, dest.is_favorite)}
                      >
                        <Star className={`h-4 w-4 ${dest.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      {dest.destination_data.totalMatchScore}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(dest.created_at), 'MMM d, yyyy')}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteItem('destination', dest.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          {routes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Route className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved routes</h3>
                <p className="text-muted-foreground max-w-md">
                  Save route recommendations to compare and plan your trips
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {routes.map((route) => (
                <Card key={route.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{route.route_name}</CardTitle>
                        <CardDescription className="text-sm">
                          {route.route_data.orderedStops.length} stops • {route.route_data.totalDays} days
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite('route', route.id, route.is_favorite)}
                      >
                        <Star className={`h-4 w-4 ${route.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {route.route_data.orderedStops.map((stop, i) => (
                        <div key={i} className="text-sm flex items-center gap-2">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <span>{stop.destinationName}</span>
                        </div>
                      ))}
                    </div>
                    <Badge variant="secondary">{route.route_data.estimatedTripIntensity}</Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(route.created_at), 'MMM d, yyyy')}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteItem('route', route.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
