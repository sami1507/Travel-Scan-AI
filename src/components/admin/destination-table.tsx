// Destination performance table component
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DestinationStats } from '@/lib/types/analytics'

interface DestinationTableProps {
  destinations: DestinationStats[]
  title?: string
  description?: string
}

export function DestinationTable({ destinations, title, description }: DestinationTableProps) {
  const getPerformanceBadge = (rate: number) => {
    if (rate >= 0.7) return <Badge className="bg-green-600">Excellent</Badge>
    if (rate >= 0.5) return <Badge className="bg-blue-600">Good</Badge>
    if (rate >= 0.3) return <Badge className="bg-yellow-600">Fair</Badge>
    return <Badge variant="destructive">Poor</Badge>
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-600">{score.toFixed(0)}</Badge>
    if (score >= 60) return <Badge className="bg-blue-600">{score.toFixed(0)}</Badge>
    if (score >= 40) return <Badge className="bg-yellow-600">{score.toFixed(0)}</Badge>
    return <Badge variant="destructive">{score.toFixed(0)}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Top Destinations'}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Saves</TableHead>
                <TableHead className="text-right">Thumbs Up</TableHead>
                <TableHead className="text-right">Dismissals</TableHead>
                <TableHead className="text-right">Positive Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No destination data available
                  </TableCell>
                </TableRow>
              ) : (
                destinations.map((dest, index) => (
                  <TableRow key={dest.destinationId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{dest.destinationName}</TableCell>
                    <TableCell className="text-right">
                      {dest.avgScore > 0 ? getScoreBadge(dest.avgScore) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{dest.totalViews}</TableCell>
                    <TableCell className="text-right">{dest.totalSaves}</TableCell>
                    <TableCell className="text-right">{dest.totalThumbsUp}</TableCell>
                    <TableCell className="text-right">{dest.totalDismisses}</TableCell>
                    <TableCell className="text-right">
                      {getPerformanceBadge(dest.positiveRate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
