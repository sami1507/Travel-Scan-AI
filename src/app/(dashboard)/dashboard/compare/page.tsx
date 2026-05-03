'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DestinationComparison } from '@/components/travel/comparison-view'
import type { RankedDestination } from '@/lib/analysis/schemas'

function CompareContent() {
  const searchParams = useSearchParams()
  const [destinations, setDestinations] = useState<[RankedDestination | null, RankedDestination | null]>([null, null])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const destAId = searchParams.get('a')
    const destBId = searchParams.get('b')

    if (destAId && destBId) {
      loadDestinations(destAId, destBId)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const loadDestinations = async (aId: string, bId: string) => {
    try {
      const response = await fetch('/api/saved/destinations')
      if (response.ok) {
        const data = await response.json()
        const destA = data.destinations?.find((d: any) => d.destination_id === aId)
        const destB = data.destinations?.find((d: any) => d.destination_id === bId)
        
        setDestinations([
          destA?.destination_data || null,
          destB?.destination_data || null
        ])
      }
    } catch (error) {
      console.error('Failed to load destinations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading comparison...</p>
      </div>
    )
  }

  if (!destinations[0] || !destinations[1]) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No destinations to compare</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            Select two destinations from your analysis results to compare them
          </p>
          <Button asChild>
            <Link href="/dashboard/analysis">
              Go to Analysis
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/analysis">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analysis
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Destination Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Side-by-side comparison of match scores and features
        </p>
      </div>

      <DestinationComparison
        destinationA={destinations[0]}
        destinationB={destinations[1]}
      />
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
