/**
 * QA Test for Runtime AI Skills
 * Tests 3 different analysis cases to verify diversity and quality
 */

import { TravelAnalysisEngine } from '../src/lib/analysis/engine'

async function runAnalysisCase(caseName: string, interests: string[]) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`CASE ${caseName}`)
  console.log(`Interests: ${interests.join(', ')}`)
  console.log('='.repeat(80))

  const engine = new TravelAnalysisEngine()

  try {
    const result = await engine.analyze({
      query: `7 days in Spring, single country multi-city trip`,
      tripLength: 7,
      travelMonths: [4, 5],
      interests,
      tripStructure: 'single_country_multi_city',
      budget: 'moderate',
      departureCity: 'Tel Aviv',
    })

    console.log(`\n✅ Analysis completed`)
    console.log(`\nTop 3 Recommendations:`)
    result.topRecommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`)
    })

    console.log(`\nDetailed Results:`)
    result.rankedDestinations.slice(0, 3).forEach((dest, idx) => {
      console.log(`\n--- Option ${idx + 1}: ${dest.destinationName} ---`)
      console.log(`Score: ${dest.totalMatchScore}/100`)
      console.log(`Trip Type: ${dest.tripType || 'N/A'}`)
      console.log(`Route: ${dest.suggestedRoute?.join(' → ') || 'Single city'}`)
      console.log(`Fatigue: ${dest.travelFatigueLevel || 'N/A'}`)
      
      if (dest.whyRecommended && dest.whyRecommended.length > 0) {
        console.log(`\nWhy Recommended:`)
        dest.whyRecommended.slice(0, 2).forEach(reason => {
          console.log(`  - ${reason}`)
        })
      }
      
      if (dest.possibleDownsides && dest.possibleDownsides.length > 0) {
        console.log(`\nDownsides:`)
        dest.possibleDownsides.slice(0, 2).forEach(downside => {
          console.log(`  - ${downside}`)
        })
      }
      
      if (dest.realisticConsultantNotes) {
        console.log(`\nConsultant Notes: ${dest.realisticConsultantNotes.substring(0, 150)}...`)
      }
    })

    console.log(`\nData Quality: ${result.rankedDestinations[0]?.dataQuality || 'unknown'}`)
    console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`)

    return {
      countries: result.topRecommendations,
      scores: result.rankedDestinations.slice(0, 3).map(d => d.totalMatchScore),
      dataQuality: result.rankedDestinations[0]?.dataQuality,
      hasSpecificReasons: result.rankedDestinations[0]?.whyRecommended?.some(r => r.length > 50),
      hasDownsides: result.rankedDestinations[0]?.possibleDownsides?.length > 0,
      hasConsultantNotes: !!result.rankedDestinations[0]?.realisticConsultantNotes,
    }
  } catch (error) {
    console.error(`\n❌ Analysis failed:`, error instanceof Error ? error.message : String(error))
    return {
      countries: [],
      scores: [],
      dataQuality: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('RUNTIME AI SKILLS QA TEST')
  console.log('Testing diversity and explanation quality across 3 cases')
  console.log('='.repeat(80))

  const caseA = await runAnalysisCase('A', ['city', 'food', 'history'])
  await new Promise(resolve => setTimeout(resolve, 2000)) // Brief pause

  const caseB = await runAnalysisCase('B', ['nature', 'hiking', 'quiet'])
  await new Promise(resolve => setTimeout(resolve, 2000)) // Brief pause

  const caseC = await runAnalysisCase('C', ['budget', 'markets', 'culture'])

  console.log(`\n${'='.repeat(80)}`)
  console.log('DIVERSITY ANALYSIS')
  console.log('='.repeat(80))

  const allCountries = [
    ...(caseA.countries || []),
    ...(caseB.countries || []),
    ...(caseC.countries || []),
  ]

  const uniqueCountries = new Set(allCountries)
  const diversityScore = uniqueCountries.size / Math.max(allCountries.length, 1)

  console.log(`\nCase A countries: ${caseA.countries?.join(', ') || 'N/A'}`)
  console.log(`Case B countries: ${caseB.countries?.join(', ') || 'N/A'}`)
  console.log(`Case C countries: ${caseC.countries?.join(', ') || 'N/A'}`)
  console.log(`\nTotal recommendations: ${allCountries.length}`)
  console.log(`Unique countries: ${uniqueCountries.size}`)
  console.log(`Diversity score: ${(diversityScore * 100).toFixed(0)}%`)

  if (diversityScore < 0.5) {
    console.log(`\n⚠️  LOW DIVERSITY - Same countries appearing too often`)
  } else if (diversityScore < 0.8) {
    console.log(`\n✅ MODERATE DIVERSITY - Some variety but could improve`)
  } else {
    console.log(`\n✅ GOOD DIVERSITY - Different countries across cases`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('QUALITY ANALYSIS')
  console.log('='.repeat(80))

  console.log('\nCase A:')
  console.log('  Specific reasons: ' + (caseA.hasSpecificReasons ? '✅' : '❌'))
  console.log('  Honest downsides: ' + (caseA.hasDownsides ? '✅' : '❌'))
  console.log('  Consultant notes: ' + (caseA.hasConsultantNotes ? '✅' : '❌'))
  console.log('  Data quality: ' + caseA.dataQuality)

  console.log('\nCase B:')
  console.log('  Specific reasons: ' + (caseB.hasSpecificReasons ? '✅' : '❌'))
  console.log('  Honest downsides: ' + (caseB.hasDownsides ? '✅' : '❌'))
  console.log('  Consultant notes: ' + (caseB.hasConsultantNotes ? '✅' : '❌'))
  console.log('  Data quality: ' + caseB.dataQuality)

  console.log('\nCase C:')
  console.log('  Specific reasons: ' + (caseC.hasSpecificReasons ? '✅' : '❌'))
  console.log('  Honest downsides: ' + (caseC.hasDownsides ? '✅' : '❌'))
  console.log('  Consultant notes: ' + (caseC.hasConsultantNotes ? '✅' : '❌'))
  console.log('  Data quality: ' + caseC.dataQuality)

  console.log('\n' + '='.repeat(80))
  console.log('QA TEST COMPLETE')
  console.log('='.repeat(80) + '\n')
}

main().catch(error => {
  console.error('\n❌ QA Test failed:', error)
  process.exit(1)
})
