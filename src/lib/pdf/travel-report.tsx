import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TravelAnalysisResponse, RankedDestination } from '@/lib/analysis/schemas'

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  navy:      '#0f1729',
  primary:   '#2563eb',
  accent:    '#f97316',
  white:     '#ffffff',
  light:     '#f1f5f9',
  gray:      '#94a3b8',
  muted:     '#64748b',
  dark:      '#1e293b',
  warnBg:    '#fff7ed',
  warnText:  '#c2410c',
  success:   '#16a34a',
}

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    backgroundColor: C.white,
    padding: 40,
    flexDirection: 'column',
  },
  h2: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 10,
  },
  body: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 1.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: C.light,
    marginVertical: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  warnBox: {
    backgroundColor: C.warnBg,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    padding: 8,
    marginBottom: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.light,
  },
  footerText: {
    fontSize: 8,
    color: C.gray,
  },
})

// ─── Shared helpers ──────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)))
  return (
    <View style={[S.row, { marginVertical: 4 }]}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 14,
            height: 8,
            marginRight: 2,
            borderRadius: 2,
            backgroundColor: i < filled ? C.primary : C.light,
          }}
        />
      ))}
      <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginLeft: 6, color: C.dark }}>
        {score}/100
      </Text>
    </View>
  )
}

function PageFooter() {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>TravelScan AI</Text>
      <Text style={S.footerText}>travelscan.vercel.app</Text>
    </View>
  )
}

// ─── Cover page ──────────────────────────────────────────────────────────────
function CoverPage({
  analysis,
  queryContext,
}: {
  analysis: TravelAnalysisResponse
  queryContext: QueryContext
}) {
  const destinations = (analysis.rankedDestinations ?? [])
    .slice(0, 3)
    .map(d => d.destinationName)
    .join(' • ')

  const monthNames = (queryContext.travel_months ?? [])
    .map(m => MONTHS[m] ?? '')
    .filter(Boolean)
    .join('–')

  const budget = queryContext.budget
    ? queryContext.budget.charAt(0).toUpperCase() + queryContext.budget.slice(1)
    : null

  const parts = [
    queryContext.tripLength ? `${queryContext.tripLength} days` : null,
    budget ? `${budget} Budget` : null,
    monthNames || null,
  ].filter(Boolean)

  return (
    <Page
      size="A4"
      style={{ backgroundColor: C.navy, padding: 0, flexDirection: 'column' }}
    >
      <View
        style={{
          flex: 1,
          padding: 56,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand badge */}
        <View>
          <View
            style={[
              S.badge,
              { backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start' },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.75)',
                fontFamily: 'Helvetica-Bold',
              }}
            >
              TravelScan AI
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View>
          <Text
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 14,
              fontFamily: 'Helvetica',
            }}
          >
            Your Travel Plan
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontFamily: 'Helvetica-Bold',
              color: C.white,
              marginBottom: 10,
              lineHeight: 1.2,
            }}
          >
            {destinations || 'Travel Analysis'}
          </Text>
          {parts.length > 0 && (
            <Text
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.65)',
                fontFamily: 'Helvetica',
                marginBottom: 8,
              }}
            >
              {parts.join(' • ')}
            </Text>
          )}
          {queryContext.departureCity ? (
            <Text
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'Helvetica',
              }}
            >
              Departing from {queryContext.departureCity}
            </Text>
          ) : null}
        </View>

        {/* Footer */}
        <View>
          <View
            style={{
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.12)',
              marginBottom: 12,
            }}
          />
          <View style={[S.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
              Generated by TravelScan AI
            </Text>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

// ─── Summary page ────────────────────────────────────────────────────────────
function SummaryPage({ analysis }: { analysis: TravelAnalysisResponse }) {
  const reasons = (analysis.reasons ?? []).slice(0, 5)
  const confidence = Math.round((analysis.confidence ?? 0) * 100)
  const isHighConf = confidence >= 70

  return (
    <Page size="A4" style={S.page}>
      <Text style={S.h2}>Why These Destinations</Text>
      <View style={S.divider} />

      {/* querySummary */}
      <View style={S.section}>
        <Text
          style={{
            fontSize: 11,
            color: C.dark,
            lineHeight: 1.7,
            fontFamily: 'Helvetica',
          }}
        >
          {analysis.querySummary}
        </Text>
      </View>

      {/* Key highlights */}
      {reasons.length > 0 && (
        <View style={S.section}>
          <Text style={S.label}>Key Highlights</Text>
          {reasons.map((r, i) => (
            <View
              key={i}
              style={[S.row, { marginBottom: 6, alignItems: 'flex-start' }]}
            >
              <Text
                style={{
                  color: C.primary,
                  fontFamily: 'Helvetica-Bold',
                  marginRight: 6,
                  fontSize: 11,
                }}
              >
                •
              </Text>
              <Text style={[S.body, { flex: 1 }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Confidence badge */}
      <View
        style={[
          S.badge,
          {
            backgroundColor: isHighConf ? '#dcfce7' : '#fef3c7',
            alignSelf: 'flex-start',
            marginTop: 4,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 10,
            fontFamily: 'Helvetica-Bold',
            color: isHighConf ? C.success : '#92400e',
          }}
        >
          {confidence}% Confidence
        </Text>
      </View>

      <PageFooter />
    </Page>
  )
}

// ─── Destination page ────────────────────────────────────────────────────────
function DestinationPage({
  dest,
  rank,
}: {
  dest: RankedDestination
  rank: number
}) {
  const route = dest.suggestedRoute ?? []
  const nights = dest.recommendedNights ?? {}
  const warnings = dest.routeWarnings ?? []

  return (
    <Page size="A4" style={S.page}>
      {/* Header row */}
      <View style={[S.row, { marginBottom: 16, alignItems: 'flex-start' }]}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: C.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              color: C.white,
              fontFamily: 'Helvetica-Bold',
              fontSize: 16,
            }}
          >
            #{rank}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.h2}>{dest.destinationName}</Text>
          {dest.tripType ? (
            <Text style={{ fontSize: 9, color: C.muted }}>{dest.tripType}</Text>
          ) : null}
        </View>
        <View style={[S.badge, { backgroundColor: C.light, alignSelf: 'flex-start' }]}>
          <Text
            style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark }}
          >
            {dest.totalMatchScore}/100
          </Text>
        </View>
      </View>

      {/* Suggested route */}
      {route.length > 0 && (
        <View
          style={[
            S.section,
            {
              backgroundColor: C.light,
              padding: 10,
              borderRadius: 6,
            },
          ]}
        >
          <Text style={S.label}>Suggested Route</Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: 'Helvetica-Bold',
              color: C.dark,
            }}
          >
            {route.join(' → ')}
          </Text>
        </View>
      )}

      {/* Score bar */}
      <View style={S.section}>
        <Text style={S.label}>Match Score</Text>
        <ScoreBar score={dest.totalMatchScore} />
      </View>

      {/* Nights per city */}
      {Object.keys(nights).length > 0 && (
        <View style={S.section}>
          <Text style={S.label}>Nights Per City</Text>
          <View style={[S.row, { flexWrap: 'wrap' }]}>
            {Object.entries(nights).map(([city, n]) => (
              <View
                key={city}
                style={[
                  S.badge,
                  {
                    backgroundColor: C.light,
                    marginRight: 6,
                    marginBottom: 4,
                  },
                ]}
              >
                <Text style={{ fontSize: 10, color: C.dark }}>
                  {city}:{' '}
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{n}n</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Destination summary */}
      {dest.destinationSummary ? (
        <View style={S.section}>
          <Text style={S.label}>Why Recommended</Text>
          <Text style={S.body}>{dest.destinationSummary}</Text>
        </View>
      ) : null}

      {/* AI consultant notes */}
      {dest.realisticConsultantNotes ? (
        <View style={S.section}>
          <Text style={S.label}>AI Consultant Notes</Text>
          <Text style={S.body}>{dest.realisticConsultantNotes}</Text>
        </View>
      ) : null}

      {/* Transport logic */}
      {dest.transportLogic ? (
        <View style={S.section}>
          <Text style={S.label}>Getting Around</Text>
          <Text style={S.body}>{dest.transportLogic}</Text>
        </View>
      ) : null}

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={S.section}>
          <Text style={S.label}>Before You Book</Text>
          {warnings.map((w, i) => (
            <View key={i} style={S.warnBox}>
              <Text style={{ fontSize: 10, color: C.warnText }}>⚠  {w}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter />
    </Page>
  )
}

// ─── Checklist page ──────────────────────────────────────────────────────────
function ChecklistPage() {
  const items = [
    'Check visa requirements for your passport',
    'Book flights 6–8 weeks in advance',
    'Check travel advisories for your destination',
    'Get comprehensive travel insurance',
    'Check vaccination requirements',
    'Notify your bank of travel plans',
    'Make copies of important documents',
    'Download offline maps for your route',
  ]

  return (
    <Page size="A4" style={S.page}>
      <Text style={S.h2}>Before You Book</Text>
      <View style={S.divider} />
      <Text style={[S.body, { marginBottom: 16 }]}>
        Use this checklist to prepare for your trip.
      </Text>

      {items.map((item, i) => (
        <View key={i} style={[S.row, { marginBottom: 12, alignItems: 'center' }]}>
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              borderWidth: 1.5,
              borderColor: C.gray,
              marginRight: 10,
              flexShrink: 0,
            }}
          />
          <Text style={{ fontSize: 11, color: C.dark }}>{item}</Text>
        </View>
      ))}

      <View style={[S.divider, { marginTop: 24 }]} />
      <View style={[S.row, { justifyContent: 'space-between' }]}>
        <Text style={S.footerText}>Generated by TravelScan AI</Text>
        <Text style={S.footerText}>travelscan.vercel.app</Text>
      </View>
    </Page>
  )
}

// ─── Public types ────────────────────────────────────────────────────────────
export interface QueryContext {
  query?: string
  departureCity?: string
  budget?: string
  travel_months?: number[]
  tripLength?: number
  interests?: string[]
  [key: string]: unknown
}

// ─── Main document export ────────────────────────────────────────────────────
export function TravelReportDocument({
  analysis,
  queryContext,
}: {
  analysis: TravelAnalysisResponse
  queryContext: QueryContext
}) {
  const destinations = (analysis.rankedDestinations ?? []).slice(0, 3)

  return (
    <Document
      title="Your Travel Plan"
      author="TravelScan AI"
      subject={queryContext.query ?? 'Travel Analysis'}
    >
      <CoverPage analysis={analysis} queryContext={queryContext} />
      <SummaryPage analysis={analysis} />
      {destinations.map((dest, i) => (
        <DestinationPage
          key={dest.destinationId ?? String(i)}
          dest={dest}
          rank={i + 1}
        />
      ))}
      <ChecklistPage />
    </Document>
  )
}
