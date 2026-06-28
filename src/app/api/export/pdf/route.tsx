import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { TravelReportDocument } from '@/lib/pdf/travel-report'
import type { QueryContext } from '@/lib/pdf/travel-report'
import type { TravelAnalysisResponse } from '@/lib/analysis/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      analysis: TravelAnalysisResponse
      queryContext: QueryContext
    }

    const { analysis, queryContext } = body

    if (!analysis) {
      return NextResponse.json({ error: 'Missing analysis data' }, { status: 400 })
    }

    const element = React.createElement(TravelReportDocument, { analysis, queryContext: queryContext ?? {} })
    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])

    const uint8 = new Uint8Array(buffer)
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="travelscan-${Date.now()}.pdf"`,
        'Content-Length': String(uint8.byteLength),
      },
    })
  } catch (err) {
    console.error('[export/pdf]', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
