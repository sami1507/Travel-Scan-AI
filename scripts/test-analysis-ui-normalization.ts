#!/usr/bin/env tsx
/**
 * Test UI normalization for compact analysis responses
 * Ensures frontend never crashes on null/undefined fields
 */

import { normalizeAnalysisForUI, isCompactAnalysis, getCompactFieldMessage } from '../src/lib/analysis/normalize-analysis-for-ui'
import type { TravelAnalysisResponse } from '../src/lib/analysis/schemas'

console.log('🧪 Testing Analysis UI Normalization...\n')

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }
}

// Test 1: Null analysis
test('Handles null analysis', () => {
  const result = normalizeAnalysisForUI(null)
  if (!result || !Array.isArray(result.rankedDestinations)) {
    throw new Error('Should return valid analysis with empty arrays')
  }
  if (result.rankedDestinations.length !== 0) {
    throw new Error('Should have empty rankedDestinations')
  }
})

// Test 2: Undefined analysis
test('Handles undefined analysis', () => {
  const result = normalizeAnalysisForUI(undefined)
  if (!result || !Array.isArray(result.rankedDestinations)) {
    throw new Error('Should return valid analysis with empty arrays')
  }
})

// Test 3: Compact analysis with null heavy fields
test('Handles compact analysis with null heavy fields', () => {
  const compactAnalysis: TravelAnalysisResponse = {
    querySummary: 'Test summary',
    userConstraints: {
      budget: 'moderate',
      travelMonths: [6, 7],
      interests: null,
      travelStyle: null,
      pace: null,
    },
    topRecommendations: ['Greece', 'Italy'],
    rankedDestinations: [
      {
        destinationId: 'greece',
        destinationName: 'Greece',
        destinationType: 'country',
        totalMatchScore: 85,
        destinationSummary: null, // Compact field
        diversityLabel: null, // Compact field
        whyRecommended: ['Great weather', 'Beautiful beaches'],
        possibleDownsides: ['Can be crowded'],
        bestMonths: [6, 7, 8],
        estimatedBudgetLevel: 'moderate',
        passportEase: 'easy',
        confidence: 0.85,
        dataQuality: 'knowledge-based',
        categoryScores: {
          budgetFit: 8,
          weatherFit: 9,
          passportEase: 9,
          nightlife: 7,
          nature: 8,
          transport: 8,
          hotelValue: 7,
          safety: 9,
          flightValue: null,
        },
        nightlifeLevel: 7,
        natureLevel: 8,
        transportLevel: 8,
        hotelValueLevel: 7,
        safetyLevel: 9,
        sourceLabels: ['openai', 'compact-schema'],
        tripType: null,
        suggestedRoute: null, // Compact field
        recommendedNights: null, // Compact field
        transportLogic: null,
        realisticConsultantNotes: null,
        routeWarnings: null, // Compact field
        routeRealismScore: null,
        travelFatigueLevel: null,
        routeAlternatives: null,
        itineraryMapPlan: null, // Heavy compact field
        travelStrategyTips: null, // Heavy compact field
        seasonality: null, // Heavy compact field
      },
    ],
    scoreBreakdown: 'Scores based on budget fit, weather, transport, and safety',
    reasons: ['Great weather in summer', 'Affordable accommodation'],
    warnings: [],
    assumptions: [],
    dataFreshness: {
      knowledgeBase: 'structured-knowledge',
      providerData: 'live-providers',
      lastUpdated: new Date().toISOString(),
    },
    confidence: 0.85,
    sourcesUsed: ['openai-gpt4o', 'knowledge-base', 'compact-schema'],
    recommendedRoutes: null, // Heavy compact field
    nextBestAlternatives: null,
    personalization: null,
    seasonMonthStrategy: null, // Heavy compact field
  }

  const result = normalizeAnalysisForUI(compactAnalysis)
  
  if (!result) {
    throw new Error('Should return normalized analysis')
  }
  
  if (!Array.isArray(result.rankedDestinations)) {
    throw new Error('rankedDestinations should be array')
  }
  
  if (result.rankedDestinations.length === 0) {
    throw new Error('Should preserve rankedDestinations')
  }
  
  const dest = result.rankedDestinations[0]
  
  if (!Array.isArray(dest.whyRecommended)) {
    throw new Error('whyRecommended should be array')
  }
  
  if (!Array.isArray(dest.possibleDownsides)) {
    throw new Error('possibleDownsides should be array')
  }
  
  // Null fields should remain null (not converted to arrays)
  if (dest.destinationSummary !== null) {
    throw new Error('destinationSummary should be null')
  }
  
  if (dest.diversityLabel !== null) {
    throw new Error('diversityLabel should be null')
  }
})

// Test 4: Analysis with missing arrays
test('Handles missing arrays', () => {
  const badAnalysis: any = {
    querySummary: 'Test',
    rankedDestinations: [
      {
        destinationId: 'test',
        destinationName: 'Test',
        destinationType: 'country',
        totalMatchScore: 80,
        // Missing whyRecommended
        // Missing possibleDownsides
        // Missing bestMonths
      },
    ],
    // Missing warnings
    // Missing assumptions
    // Missing reasons
  }

  const result = normalizeAnalysisForUI(badAnalysis)
  
  if (!Array.isArray(result.warnings)) {
    throw new Error('warnings should be array')
  }
  
  if (!Array.isArray(result.assumptions)) {
    throw new Error('assumptions should be array')
  }
  
  if (!Array.isArray(result.reasons)) {
    throw new Error('reasons should be array')
  }
  
  const dest = result.rankedDestinations[0]
  
  if (!Array.isArray(dest.whyRecommended)) {
    throw new Error('whyRecommended should be array')
  }
  
  if (!Array.isArray(dest.possibleDownsides)) {
    throw new Error('possibleDownsides should be array')
  }
  
  if (!Array.isArray(dest.bestMonths)) {
    throw new Error('bestMonths should be array')
  }
})

// Test 5: isCompactAnalysis detection
test('Detects compact analysis', () => {
  const compactAnalysis: any = {
    seasonMonthStrategy: null,
    rankedDestinations: [
      {
        itineraryMapPlan: null,
      },
    ],
  }
  
  if (!isCompactAnalysis(compactAnalysis)) {
    throw new Error('Should detect compact analysis')
  }
})

// Test 6: Compact field messages
test('Returns compact field messages', () => {
  const msg1 = getCompactFieldMessage('seasonMonthStrategy')
  if (!msg1.includes('month-by-month')) {
    throw new Error('Should return season month strategy message')
  }
  
  const msg2 = getCompactFieldMessage('itineraryMapPlan')
  if (!msg2.includes('Map route')) {
    throw new Error('Should return itinerary map message')
  }
  
  const msg3 = getCompactFieldMessage('unknownField')
  if (!msg3.includes('fast mode')) {
    throw new Error('Should return default message')
  }
})

// Test 7: No crash on .map() calls
test('No crash on .map() calls', () => {
  const result = normalizeAnalysisForUI({
    querySummary: 'Test',
    rankedDestinations: null as any,
    warnings: null as any,
    assumptions: null as any,
    reasons: null as any,
  } as any)
  
  // These should not throw
  result.rankedDestinations.map(d => d.destinationName)
  result.warnings.map(w => w)
  result.assumptions.map(a => a)
  result.reasons.map(r => r)
})

// Test 8: No crash on .length access
test('No crash on .length access', () => {
  const result = normalizeAnalysisForUI({
    querySummary: 'Test',
    rankedDestinations: null as any,
    warnings: null as any,
  } as any)
  
  // These should not throw
  const len1 = result.rankedDestinations.length
  const len2 = result.warnings.length
  
  if (typeof len1 !== 'number' || typeof len2 !== 'number') {
    throw new Error('Length should be number')
  }
})

// Test 9: No crash on Object.entries()
test('No crash on Object.entries()', () => {
  const result = normalizeAnalysisForUI({
    querySummary: 'Test',
    rankedDestinations: [
      {
        destinationId: 'test',
        destinationName: 'Test',
        recommendedNights: null as any,
      } as any,
    ],
  } as any)
  
  const dest = result.rankedDestinations[0]
  
  // This should not throw
  if (dest.recommendedNights) {
    Object.entries(dest.recommendedNights).forEach(([city, nights]) => {
      // Should work
    })
  }
})

// Test 10: Preserves valid data
test('Preserves valid data', () => {
  const validAnalysis: any = {
    querySummary: 'Valid summary',
    topRecommendations: ['Greece', 'Italy', 'Spain'],
    rankedDestinations: [
      {
        destinationId: 'greece',
        destinationName: 'Greece',
        destinationType: 'country',
        totalMatchScore: 85,
        whyRecommended: ['Reason 1', 'Reason 2'],
        possibleDownsides: ['Downside 1'],
        bestMonths: [6, 7, 8],
      },
    ],
    warnings: ['Warning 1'],
    assumptions: ['Assumption 1'],
    reasons: ['Reason 1'],
  }
  
  const result = normalizeAnalysisForUI(validAnalysis)
  
  if (result.querySummary !== 'Valid summary') {
    throw new Error('Should preserve querySummary')
  }
  
  if (result.topRecommendations.length !== 3) {
    throw new Error('Should preserve topRecommendations')
  }
  
  if (result.rankedDestinations[0].whyRecommended.length !== 2) {
    throw new Error('Should preserve whyRecommended')
  }
  
  if (result.warnings.length !== 1) {
    throw new Error('Should preserve warnings')
  }
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log('\n❌ Some tests failed')
  process.exit(1)
} else {
  console.log('\n✅ All tests passed!')
  process.exit(0)
}
