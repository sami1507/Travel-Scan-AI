import * as fs from 'fs'
import * as path from 'path'
import { scoreConsultantQuality, getQualityGrade } from '../src/lib/analysis/consultant-quality-score'
import type { TravelAnalysisResponse } from '../src/lib/analysis/schemas'

interface EvalTestCase {
  id: string
  name: string
  input: {
    departureCity: string
    passportCountry: string
    tripLength: number
    season: string
    months: number[]
    budget: string
    tripStructure: string
    interests: string[]
    accommodationPreference: string
    fixedCountry?: string
    pace?: string
    travelStyle?: string
  }
  expectedBehavior: {
    mustHave3Recommendations: boolean
    mustHaveRoutes: boolean
    mustHaveAtLeast2Regions: boolean
    mustHaveUniqueOption: boolean
    mustNotAllBeMainstreamMediterranean: boolean
    mustExplainWhy: boolean
    mustIncludeBeforeYouBookWarnings: boolean
    maxGenericPhraseCount: number
    fallbackAllowed: boolean
    minQualityScore: number
  }
  bannedCountries?: string[]
  notes: string
}

interface EvalResult {
  testCase: EvalTestCase
  passed: boolean
  analysis: TravelAnalysisResponse | null
  qualityScore: number
  qualityGrade: string
  diversityScore: number
  genericPhraseCount: number
  routeCompleteness: number
  openAIUsed: boolean
  fallbackUsed: boolean
  countries: string[]
  routes: string[]
  failures: string[]
  warnings: string[]
}

const RUN_LIVE = process.env.RUN_LIVE_AI_EVALS === 'true'

function loadTestCases(): EvalTestCase[] {
  const filePath = path.join(process.cwd(), 'data', 'ai-quality-evals', 'travel-consultant-evals.json')
  const content = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(content)
  return data.testCases
}

function createMockAnalysis(testCase: EvalTestCase): TravelAnalysisResponse {
  // Create a mock analysis for testing without hitting OpenAI
  const mockDestinations = [
    {
      destinationId: 'mock-1',
      destinationName: 'Portugal',
      destinationType: 'country' as const,
      totalMatchScore: 85,
      diversityLabel: 'Best Overall',
      suggestedRoute: ['Lisbon', 'Porto', 'Algarve'],
      whyRecommended: [
        `Perfect for ${testCase.input.interests.join(' and ')} interests`,
        'Easy transport connections between cities',
      ],
      possibleDownsides: ['Summer can be crowded in Lisbon'],
      routeWarnings: ['Book trains in advance for Porto route'],
      transportLogic: 'Train connections available between all cities, 2-3 hours each',
      travelFatigueLevel: 'Low' as const,
      seasonality: {
        weatherReality: 'Warm and sunny, occasional rain',
        crowdReality: 'Moderate crowds in autumn',
        priceReality: 'Moderate prices, lower than peak summer',
        honestConsultantNote: 'Good shoulder season choice',
      },
      bestMonths: testCase.input.months,
      estimatedBudgetLevel: testCase.input.budget,
      passportEase: 'visa-free',
      confidence: 0.85,
      dataQuality: 'knowledge-based' as const,
      categoryScores: {
        budgetFit: 8,
        weatherFit: 9,
        passportEase: 10,
        nightlife: 7,
        nature: 6,
        transport: 8,
        hotelValue: 7,
        safety: 9,
        flightValue: null,
      },
      nightlifeLevel: 7,
      natureLevel: 6,
      transportLevel: 8,
      hotelValueLevel: 7,
      safetyLevel: 9,
      sourceLabels: ['knowledge-base'],
      destinationSummary: 'Coastal country with rich history and excellent food',
      realisticConsultantNotes: 'Realistic for 7-day trip',
      routeAlternatives: null,
      itineraryMapPlan: null,
      travelStrategyTips: null,
      tripType: null,
      routeRealismScore: null,
      recommendedNights: { Lisbon: 3, Porto: 2, Algarve: 2 },
    },
    {
      destinationId: 'mock-2',
      destinationName: 'Croatia',
      destinationType: 'country' as const,
      totalMatchScore: 78,
      diversityLabel: 'Best Value',
      suggestedRoute: ['Zagreb', 'Split', 'Dubrovnik'],
      whyRecommended: ['Great value for money', 'Beautiful coastal scenery'],
      possibleDownsides: ['Dubrovnik very crowded in summer'],
      routeWarnings: [],
      transportLogic: 'Bus connections available, 4-5 hours between cities',
      travelFatigueLevel: 'Medium' as const,
      seasonality: {
        weatherReality: 'Pleasant autumn weather',
        crowdReality: 'Lower crowds than summer',
        priceReality: 'Good value in shoulder season',
        honestConsultantNote: 'Excellent autumn choice',
      },
      bestMonths: testCase.input.months,
      estimatedBudgetLevel: testCase.input.budget,
      passportEase: 'visa-free',
      confidence: 0.78,
      dataQuality: 'knowledge-based' as const,
      categoryScores: {
        budgetFit: 9,
        weatherFit: 8,
        passportEase: 10,
        nightlife: 6,
        nature: 8,
        transport: 7,
        hotelValue: 8,
        safety: 9,
        flightValue: null,
      },
      nightlifeLevel: 6,
      natureLevel: 8,
      transportLevel: 7,
      hotelValueLevel: 8,
      safetyLevel: 9,
      sourceLabels: ['knowledge-base'],
      destinationSummary: 'Adriatic coastal country with medieval towns',
      realisticConsultantNotes: 'Realistic for 7-day trip',
      routeAlternatives: null,
      itineraryMapPlan: null,
      travelStrategyTips: null,
      tripType: null,
      routeRealismScore: null,
      recommendedNights: { Zagreb: 2, Split: 2, Dubrovnik: 3 },
    },
    {
      destinationId: 'mock-3',
      destinationName: 'Albania',
      destinationType: 'country' as const,
      totalMatchScore: 72,
      diversityLabel: 'Unique Discovery',
      suggestedRoute: ['Tirana', 'Berat', 'Saranda'],
      whyRecommended: ['Off-the-beaten-path destination', 'Excellent budget value'],
      possibleDownsides: ['Less developed tourism infrastructure'],
      routeWarnings: ['Limited train connections, buses recommended'],
      transportLogic: 'Bus network connects major cities, 3-4 hours each',
      travelFatigueLevel: 'Medium' as const,
      seasonality: {
        weatherReality: 'Mild autumn weather',
        crowdReality: 'Very few tourists',
        priceReality: 'Very affordable',
        honestConsultantNote: 'Great for adventurous travelers',
      },
      bestMonths: testCase.input.months,
      estimatedBudgetLevel: 'budget',
      passportEase: 'visa-free',
      confidence: 0.72,
      dataQuality: 'knowledge-based' as const,
      categoryScores: {
        budgetFit: 10,
        weatherFit: 8,
        passportEase: 10,
        nightlife: 5,
        nature: 7,
        transport: 6,
        hotelValue: 9,
        safety: 7,
        flightValue: null,
      },
      nightlifeLevel: 5,
      natureLevel: 7,
      transportLevel: 6,
      hotelValueLevel: 9,
      safetyLevel: 7,
      sourceLabels: ['knowledge-base'],
      destinationSummary: 'Emerging Balkan destination with stunning coastline',
      realisticConsultantNotes: 'Realistic for adventurous travelers',
      routeAlternatives: null,
      itineraryMapPlan: null,
      travelStrategyTips: null,
      tripType: null,
      routeRealismScore: null,
      recommendedNights: { Tirana: 2, Berat: 2, Saranda: 3 },
    },
  ]

  return {
    querySummary: `Based on your ${testCase.input.tripLength}-day ${testCase.input.tripStructure} trip with ${testCase.input.interests.join(', ')} interests`,
    userConstraints: {
      budget: testCase.input.budget,
      travelMonths: testCase.input.months,
      interests: testCase.input.interests,
      travelStyle: testCase.input.travelStyle || null,
      pace: testCase.input.pace || null,
    },
    topRecommendations: mockDestinations.map((d) => d.destinationName),
    rankedDestinations: mockDestinations,
    warnings: ['Prices are estimates and should be verified before booking'],
    assumptions: ['Assuming visa-free travel for Israeli passport'],
    reasons: [
      'Routes selected for realistic transport connections',
      'Balanced mix of mainstream and unique options',
      'Suitable for autumn travel',
    ],
    sourcesUsed: ['knowledge-base'],
    scoreBreakdown: 'Scores based on interest fit, budget, season, and transport ease',
    confidence: 0.8,
    dataFreshness: {
      lastUpdated: new Date().toISOString(),
      dataAge: 'current',
      cacheStatus: 'MISS',
    },
    personalization: {
      isPersonalized: false,
      confidence: 0,
      explanations: [],
      feedbackCount: 0,
    },
    itineraryMapPlan: null,
    travelStrategyTips: null,
    seasonality: null,
    seasonMonthStrategy: null,
    recommendedRoutes: null,
  } as TravelAnalysisResponse
}

async function runEvaluation(testCase: EvalTestCase): Promise<EvalResult> {
  const failures: string[] = []
  const warnings: string[] = []

  // For now, use mock analysis unless RUN_LIVE is true
  let analysis: TravelAnalysisResponse | null = null

  if (RUN_LIVE) {
    // TODO: Call actual analysis engine
    warnings.push('Live mode not yet implemented - using mock')
    analysis = createMockAnalysis(testCase)
  } else {
    analysis = createMockAnalysis(testCase)
  }

  if (!analysis) {
    return {
      testCase,
      passed: false,
      analysis: null,
      qualityScore: 0,
      qualityGrade: 'Poor',
      diversityScore: 0,
      genericPhraseCount: 0,
      routeCompleteness: 0,
      openAIUsed: false,
      fallbackUsed: true,
      countries: [],
      routes: [],
      failures: ['Analysis returned null'],
      warnings,
    }
  }

  // Extract metadata
  const metadata = analysis as any
  const openAIUsed = metadata.openAIUsed === true
  const fallbackUsed = metadata.fallbackUsed === true

  // Score quality
  const qualityResult = scoreConsultantQuality(analysis, {
    query: testCase.input.interests.join(', '),
    budget: testCase.input.budget,
    travel_months: testCase.input.months,
    interests: testCase.input.interests,
  })

  const qualityScore = qualityResult.totalScore
  const qualityGrade = getQualityGrade(qualityScore)
  const genericPhraseCount = qualityResult.genericPhrases.length

  // Extract countries and routes
  const countries = analysis.rankedDestinations.map((d) => d.destinationName)
  const routes = analysis.rankedDestinations
    .filter((d) => d.suggestedRoute && d.suggestedRoute.length > 0)
    .map((d) => `${d.destinationName}: ${d.suggestedRoute!.join(' → ')}`)

  // Calculate diversity score
  const regions = new Set(
    analysis.rankedDestinations.map((d) => {
      const name = d.destinationName.toLowerCase()
      if (name.includes('greece') || name.includes('italy') || name.includes('spain')) return 'mediterranean'
      if (name.includes('portugal')) return 'iberia'
      if (name.includes('france')) return 'western-europe'
      if (name.includes('germany') || name.includes('austria') || name.includes('switzerland'))
        return 'central-europe'
      if (name.includes('poland') || name.includes('czech') || name.includes('hungary')) return 'eastern-europe'
      if (name.includes('croatia') || name.includes('albania') || name.includes('montenegro')) return 'balkans'
      if (name.includes('morocco') || name.includes('egypt')) return 'north-africa'
      if (name.includes('turkey')) return 'middle-east'
      return 'other'
    })
  )
  const diversityScore = regions.size

  // Calculate route completeness
  const routesWithCities = analysis.rankedDestinations.filter(
    (d) => d.suggestedRoute && d.suggestedRoute.length > 1
  ).length
  const routeCompleteness = (routesWithCities / Math.max(1, analysis.rankedDestinations.length)) * 100

  // Check expected behavior
  const expected = testCase.expectedBehavior

  if (expected.mustHave3Recommendations && analysis.rankedDestinations.length < 3) {
    failures.push(`Expected 3 recommendations, got ${analysis.rankedDestinations.length}`)
  }

  if (expected.mustHaveRoutes) {
    if (routesWithCities === 0) {
      failures.push('Expected routes with cities, got none')
    }
  }

  if (expected.mustHaveAtLeast2Regions && diversityScore < 2) {
    failures.push(`Expected at least 2 regions, got ${diversityScore}`)
  }

  if (expected.mustHaveUniqueOption) {
    const hasUnique = analysis.rankedDestinations.some((d) => d.diversityLabel?.includes('Unique'))
    if (!hasUnique) {
      failures.push('Expected unique option, got none')
    }
  }

  if (expected.mustNotAllBeMainstreamMediterranean) {
    const allMediterranean = analysis.rankedDestinations.every((d) => {
      const name = d.destinationName.toLowerCase()
      return name.includes('greece') || name.includes('italy') || name.includes('spain')
    })
    if (allMediterranean) {
      failures.push('All recommendations are mainstream Mediterranean')
    }
  }

  if (expected.mustExplainWhy) {
    const missingExplanations = analysis.rankedDestinations.filter(
      (d) => !d.whyRecommended || d.whyRecommended.length < 2
    )
    if (missingExplanations.length > 0) {
      failures.push(`${missingExplanations.length} destinations missing adequate explanations`)
    }
  }

  if (expected.mustIncludeBeforeYouBookWarnings) {
    const missingWarnings = analysis.rankedDestinations.filter(
      (d) => !d.possibleDownsides || d.possibleDownsides.length === 0
    )
    if (missingWarnings.length > 0) {
      failures.push(`${missingWarnings.length} destinations missing warnings/downsides`)
    }
  }

  if (genericPhraseCount > expected.maxGenericPhraseCount) {
    failures.push(`Too many generic phrases: ${genericPhraseCount} (max ${expected.maxGenericPhraseCount})`)
  }

  if (!expected.fallbackAllowed && fallbackUsed) {
    failures.push('Fallback used when not allowed')
  }

  if (qualityScore < expected.minQualityScore) {
    failures.push(`Quality score ${qualityScore} below minimum ${expected.minQualityScore}`)
  }

  // Check banned countries
  if (testCase.bannedCountries) {
    const bannedFound = countries.filter((c) =>
      testCase.bannedCountries!.some((banned) => c.toLowerCase().includes(banned.toLowerCase()))
    )
    if (bannedFound.length > 0) {
      failures.push(`Banned countries found: ${bannedFound.join(', ')}`)
    }
  }

  const passed = failures.length === 0

  return {
    testCase,
    passed,
    analysis,
    qualityScore,
    qualityGrade,
    diversityScore,
    genericPhraseCount,
    routeCompleteness,
    openAIUsed,
    fallbackUsed,
    countries,
    routes,
    failures,
    warnings,
  }
}

async function main() {
  console.log('🧪 AI Travel Consultant Quality Evaluation\n')

  if (RUN_LIVE) {
    console.log('⚠️  Running in LIVE mode (will call OpenAI)\n')
  } else {
    console.log('🔧 Running in MOCK mode (no OpenAI calls)\n')
  }

  const testCases = loadTestCases()
  console.log(`Loaded ${testCases.length} test cases\n`)

  const results: EvalResult[] = []

  for (const testCase of testCases) {
    console.log(`Running: ${testCase.id} - ${testCase.name}`)
    const result = await runEvaluation(testCase)
    results.push(result)

    if (result.passed) {
      console.log(`✅ PASS`)
    } else {
      console.log(`❌ FAIL`)
      result.failures.forEach((f) => console.log(`   - ${f}`))
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.log(`   ⚠️  ${w}`))
    }

    console.log(`   Quality: ${result.qualityScore}/100 (${result.qualityGrade})`)
    console.log(`   Diversity: ${result.diversityScore} regions`)
    console.log(`   Countries: ${result.countries.join(', ')}`)
    console.log(`   Generic phrases: ${result.genericPhraseCount}`)
    console.log(`   Source: ${result.openAIUsed ? 'OpenAI' : result.fallbackUsed ? 'Fallback' : 'Unknown'}\n`)
  }

  // Summary
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const avgQuality = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
  const avgDiversity = results.reduce((sum, r) => sum + r.diversityScore, 0) / results.length
  const avgGenericPhrases = results.reduce((sum, r) => sum + r.genericPhraseCount, 0) / results.length
  const openAIUsedCount = results.filter((r) => r.openAIUsed).length
  const fallbackUsedCount = results.filter((r) => r.fallbackUsed).length

  console.log('📊 Summary\n')
  console.log(`Total: ${testCases.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`)

  console.log(`Average Quality Score: ${avgQuality.toFixed(1)}/100`)
  console.log(`Average Diversity: ${avgDiversity.toFixed(1)} regions`)
  console.log(`Average Generic Phrases: ${avgGenericPhrases.toFixed(1)}\n`)

  console.log(`OpenAI Used: ${openAIUsedCount}/${testCases.length}`)
  console.log(`Fallback Used: ${fallbackUsedCount}/${testCases.length}\n`)

  // Acceptance thresholds
  console.log('🎯 Acceptance Thresholds\n')

  const thresholds = {
    successRate: 85,
    avgQuality: 75,
    avgDiversity: 2,
    maxGenericPhrases: 1,
  }

  const successRate = (passed / testCases.length) * 100
  console.log(
    `Success Rate: ${successRate.toFixed(1)}% ${successRate >= thresholds.successRate ? '✅' : '❌'} (target: ${thresholds.successRate}%)`
  )
  console.log(
    `Avg Quality: ${avgQuality.toFixed(1)} ${avgQuality >= thresholds.avgQuality ? '✅' : '❌'} (target: ${thresholds.avgQuality})`
  )
  console.log(
    `Avg Diversity: ${avgDiversity.toFixed(1)} ${avgDiversity >= thresholds.avgDiversity ? '✅' : '❌'} (target: ${thresholds.avgDiversity})`
  )
  console.log(
    `Avg Generic Phrases: ${avgGenericPhrases.toFixed(1)} ${avgGenericPhrases <= thresholds.maxGenericPhrases ? '✅' : '❌'} (target: ≤${thresholds.maxGenericPhrases})\n`
  )

  const allThresholdsMet =
    successRate >= thresholds.successRate &&
    avgQuality >= thresholds.avgQuality &&
    avgDiversity >= thresholds.avgDiversity &&
    avgGenericPhrases <= thresholds.maxGenericPhrases

  if (allThresholdsMet) {
    console.log('✅ All acceptance thresholds met!')
    process.exit(0)
  } else {
    console.log('❌ Some acceptance thresholds not met')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error running evaluations:', error)
  process.exit(1)
})
