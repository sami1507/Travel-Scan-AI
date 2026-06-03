/**
 * Analysis Health Audit Script
 * Validates analysis integrity and contract compliance
 */

interface MockAnalysis {
  query: string
  tripLength?: number
  departureCity?: string
  globalCandidatesGenerated?: number
  finalComparisonInput?: any[]
  rankedDestinations?: any[]
  recommendedRouteType?: string
  finalQualityPassed?: boolean
  consultantQualityScore?: number
  consultantQualityGrade?: string
  cacheEligible?: boolean
  cacheStatus?: string
}

function auditAnalysisHealth(analysis: MockAnalysis): { passed: boolean; issues: string[] } {
  const issues: string[] = []

  // Check 1: tripLength defined when query has days
  if (analysis.query?.match(/(\d+)\s*(day|days)/i) && !analysis.tripLength) {
    issues.push('tripLength undefined when query contains days')
  }

  // Check 2: departureCity defined when query has from
  if (analysis.query?.match(/from\s+/i) && !analysis.departureCity) {
    issues.push('departureCity undefined when query contains from')
  }

  // Check 3: globalCandidatesGenerated > 0 for broad request
  if (analysis.query && !analysis.query.match(/specific destination/i)) {
    if ((analysis.globalCandidatesGenerated || 0) === 0) {
      issues.push('globalCandidatesGenerated is 0 for broad request')
    }
  }

  // Check 4: finalComparisonInput includes global candidates
  if (analysis.globalCandidatesGenerated && analysis.globalCandidatesGenerated > 0) {
    const hasGlobal = analysis.finalComparisonInput?.some((c: any) => 
      c.sourceType === 'ai_global_knowledge' || c.id?.startsWith('global-')
    )
    if (!hasGlobal) {
      issues.push('finalComparisonInput does not include global candidates')
    }
  }

  // Check 5: finalCountries are clean country names
  if (analysis.rankedDestinations) {
    for (const dest of analysis.rankedDestinations) {
      if (dest.destinationName?.includes(' - ') || dest.destinationName?.includes('→')) {
        issues.push(`destinationName contains route separators: "${dest.destinationName}"`)
      }
    }
  }

  // Check 6: recommendedRouteType not single-destination for multi-city
  if (analysis.rankedDestinations) {
    for (const dest of analysis.rankedDestinations) {
      const cities = dest.suggestedRoute?.length || 0
      if (cities >= 2 && dest.recommendedRouteType === 'single-destination') {
        issues.push(`route has ${cities} cities but recommendedRouteType is single-destination`)
      }
    }
  }

  // Check 7: finalQualityPassed and score/grade consistent
  if (analysis.finalQualityPassed === false) {
    if (analysis.consultantQualityGrade === 'Excellent' || (analysis.consultantQualityScore || 0) >= 90) {
      issues.push('finalQualityPassed=false but grade/score indicates Excellent')
    }
  }

  // Check 8: cacheStatus and cacheEligible consistent
  if (analysis.cacheEligible === false && analysis.cacheStatus === 'SET') {
    issues.push('cacheEligible=false but cacheStatus=SET')
  }

  // Check 9: no direct flight/live price claims without source
  if (analysis.rankedDestinations) {
    for (const dest of analysis.rankedDestinations) {
      const summary = dest.summary || dest.whyRecommended || ''
      if (summary.match(/direct flight|live price|current price/i)) {
        if (!summary.match(/estimated|typical|planning-level|verify/i)) {
          issues.push('Contains direct flight/live price claim without disclaimer')
        }
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

// Run audit
console.log('🔍 Running Analysis Health Audit...\n')

const mockAnalyses: MockAnalysis[] = [
  {
    query: 'Traveling from Tel Aviv. 15 days in Europe',
    tripLength: 15,
    departureCity: 'Tel Aviv',
    globalCandidatesGenerated: 12,
    finalComparisonInput: [
      { id: 'structured-1', sourceType: 'structured_data' },
      { id: 'global-japan', sourceType: 'ai_global_knowledge' },
    ],
    rankedDestinations: [
      { destinationName: 'Slovenia', suggestedRoute: ['Ljubljana', 'Bled'], recommendedRouteType: '2-city' },
      { destinationName: 'Croatia', suggestedRoute: ['Zagreb', 'Split', 'Dubrovnik'], recommendedRouteType: '3-city' },
    ],
    finalQualityPassed: true,
    consultantQualityScore: 85,
    consultantQualityGrade: 'Excellent',
    cacheEligible: true,
    cacheStatus: 'SET',
  },
  {
    query: 'I want to travel',
    tripLength: 7,
    globalCandidatesGenerated: 0,
    rankedDestinations: [
      { destinationName: 'Slovenia - Ljubljana → Bled', suggestedRoute: ['Ljubljana', 'Bled'], recommendedRouteType: 'single-destination' },
    ],
    finalQualityPassed: false,
    consultantQualityScore: 95,
    consultantQualityGrade: 'Excellent',
    cacheEligible: false,
    cacheStatus: 'SET',
  },
]

let allPassed = true
for (let i = 0; i < mockAnalyses.length; i++) {
  const result = auditAnalysisHealth(mockAnalyses[i])
  console.log(`Test ${i + 1}:`, result.passed ? '✅ PASS' : '❌ FAIL')
  if (!result.passed) {
    console.log('Issues:')
    result.issues.forEach(issue => console.log(`  - ${issue}`))
    allPassed = false
  }
  console.log()
}

if (allPassed) {
  console.log('✅ All analysis health checks passed!')
  process.exit(0)
} else {
  console.log('❌ Some analysis health checks failed')
  process.exit(1)
}
