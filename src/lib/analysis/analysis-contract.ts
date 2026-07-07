/**
 * Analysis Pipeline Contract Validator
 * Ensures end-to-end analysis integrity with blocking issue detection
 */

export interface AnalysisContractInput {
  request?: any
  normalizedRequest?: any
  globalCandidates?: any[]
  structuredCandidates?: any[]
  mergedCandidates?: any[]
  finalComparisonInput?: any[]
  finalAnalysis?: any
  finalMetadata?: any
}

export interface AnalysisContractResult {
  passed: boolean
  issues: string[]
  warnings: string[]
  blockingIssues: string[]
}

export function validateAnalysisContract(input: AnalysisContractInput): AnalysisContractResult {
  const issues: string[] = []
  const warnings: string[] = []
  const blockingIssues: string[] = []

  // BLOCKING ISSUE 1: forceFresh=true but OpenAI not called
  if (input.request?.forceFresh === true && input.finalMetadata?.openAIActuallyCalledThisRequest === false) {
    blockingIssues.push('forceFresh=true but OpenAI not called')
  }

  // BLOCKING ISSUE 2: tripLength missing after normalization
  if (input.normalizedRequest && !input.normalizedRequest.tripLength) {
    const queryHasDays = input.request?.query?.match(/(\d+)\s*(day|days)/i)
    if (queryHasDays) {
      blockingIssues.push('tripLength missing after normalization when query contains days')
    }
  }

  // BLOCKING ISSUE 3: departureCity missing after normalization when query contains from
  if (input.normalizedRequest && !input.normalizedRequest.departureCity) {
    const queryHasFrom = input.request?.query?.match(/from\s+/i)
    if (queryHasFrom) {
      blockingIssues.push('departureCity missing after normalization when query contains from')
    }
  }

  // BLOCKING ISSUE 4: global candidates generated but excluded from final comparison
  if (input.globalCandidates && input.globalCandidates.length > 0 && input.finalComparisonInput) {
    const globalInFinal = input.finalComparisonInput.some((c: any) => 
      c.sourceType === 'ai_global_knowledge' || c.id?.startsWith('global-')
    )
    if (!globalInFinal) {
      blockingIssues.push('global candidates generated but excluded from finalComparisonInput')
    }
  }

  // BLOCKING ISSUE 5: mergedCandidates much larger than finalComparisonInput without reason
  if (input.mergedCandidates && input.finalComparisonInput) {
    const diff = input.mergedCandidates.length - input.finalComparisonInput.length
    if (diff > 5) {
      issues.push(`mergedCandidates.length (${input.mergedCandidates.length}) > finalComparisonInput.length (${input.finalComparisonInput.length}) by ${diff}`)
    }
  }

  // BLOCKING ISSUE 6: destinationName contains route separators
  // Skip this check for multi_country trips where "Country - Country" names are valid
  const isMultiCountry = input.request?.tripStructure === 'multi_country'
  if (!isMultiCountry && input.finalAnalysis?.rankedDestinations) {
    for (const dest of input.finalAnalysis.rankedDestinations) {
      if (dest.destinationName?.includes('→')) {
        blockingIssues.push(`destinationName contains route separators: "${dest.destinationName}"`)
      }
    }
  }

  // BLOCKING ISSUE 7: multi-city route but recommendedRouteType is single-destination
  if (input.finalAnalysis?.rankedDestinations) {
    for (const dest of input.finalAnalysis.rankedDestinations) {
      const cities = dest.suggestedRoute?.length || 0
      if (cities >= 2 && dest.recommendedRouteType === 'single-destination') {
        blockingIssues.push(`route has ${cities} cities but recommendedRouteType is single-destination`)
      }
    }
  }

  // BLOCKING ISSUE 8: qualityGatePassed=false but grade is Excellent or score >= 90
  if (input.finalMetadata) {
    const passed = input.finalMetadata.qualityGatePassed
    const score = input.finalMetadata.consultantQualityScore
    const grade = input.finalMetadata.consultantQualityGrade
    if (passed === false && (grade === 'Excellent' || score >= 90)) {
      blockingIssues.push(`qualityGatePassed=false but grade=${grade} score=${score}`)
    }
  }

  // BLOCKING ISSUE 9: finalQualityPassed=false but UI would show green/Excellent
  if (input.finalMetadata?.finalQualityPassed === false) {
    const score = input.finalMetadata.consultantQualityScore
    if (score >= 85) {
      blockingIssues.push(`finalQualityPassed=false but consultantQualityScore=${score} (would show green)`)
    }
  }

  // BLOCKING ISSUE 10: recommended itinerary mismatch (checked at UI level, not here)
  // This is validated in UI components

  // WARNING 1: interests=[]
  if (input.request?.interests && Array.isArray(input.request.interests) && input.request.interests.length === 0) {
    warnings.push('interests=[] - broad trip discovery mode')
  }

  // WARNING 2: Claude verifier timeout
  if (input.finalMetadata?.claudeTimedOut === true) {
    warnings.push('Claude verifier timeout')
  }

  // WARNING 3: url.parse deprecation (non-blocking dependency warning)
  // This is logged separately, not part of analysis contract

  // WARNING 4: limitedDataCandidates > 0
  if (input.globalCandidates && input.globalCandidates.length > 0) {
    const limitedData = input.globalCandidates.filter((c: any) => c.dataCoverage === 'limited_internal_data')
    if (limitedData.length > 0) {
      warnings.push(`${limitedData.length} global candidates with limited_internal_data`)
    }
  }

  // WARNING 5: final result uses AI knowledge without structured data
  if (input.finalAnalysis?.rankedDestinations) {
    const aiOnly = input.finalAnalysis.rankedDestinations.filter((d: any) => 
      d.sourceType === 'ai_global_knowledge' && d.dataCoverage === 'limited_internal_data'
    )
    if (aiOnly.length > 0) {
      warnings.push(`${aiOnly.length} final recommendations use AI knowledge without structured data`)
    }
  }

  const passed = blockingIssues.length === 0

  return {
    passed,
    issues,
    warnings,
    blockingIssues,
  }
}
