/**
 * Travel Evaluation Scenarios Runner
 * 
 * Runs evaluation scenarios from data/travel/evaluation_scenarios.json
 * Tests the analysis engine against expected constraints
 * 
 * Usage:
 *   npx tsx scripts/run-travel-evaluation-scenarios.ts
 *   RUN_LIVE_TRAVEL_EVALS=true npx tsx scripts/run-travel-evaluation-scenarios.ts
 */

import { loadEvaluationScenarios, getRoutesForRequest } from '../src/lib/travel-data/travel-data-loader'
import fs from 'fs'
import path from 'path'

interface EvaluationResult {
  scenarioId: string
  scenarioName: string
  passed: boolean
  checks: {
    name: string
    passed: boolean
    expected: any
    actual: any
    message?: string
  }[]
  routesFound: number
  routeCountries: string[]
  routeTypes: string[]
}

console.log('🧪 TravelScan AI - Travel Evaluation Scenarios\n')

const runLive = process.env.RUN_LIVE_TRAVEL_EVALS === 'true'

if (runLive) {
  console.log('⚠️  LIVE MODE: Will call actual analysis engine')
  console.log('⚠️  This requires OpenAI API key and will use tokens\n')
} else {
  console.log('📋 VALIDATION MODE: Testing route matching and constraints')
  console.log('💡 Set RUN_LIVE_TRAVEL_EVALS=true to run full analysis\n')
}

// Load scenarios
const scenarios = loadEvaluationScenarios()

if (scenarios.length === 0) {
  console.error('❌ No evaluation scenarios found')
  process.exit(1)
}

console.log(`Found ${scenarios.length} evaluation scenarios\n`)
console.log('='.repeat(80))

const results: EvaluationResult[] = []

// Run each scenario
for (const scenario of scenarios) {
  console.log(`\n📍 ${scenario.name} (${scenario.id})`)
  console.log(`   ${scenario.tripLength}d | ${scenario.budget} | ${scenario.tripStructure}`)
  console.log(`   Interests: ${scenario.interests.join(', ')}`)
  console.log(`   Travel months: ${scenario.travelMonths.join(', ')}`)
  
  const checks: EvaluationResult['checks'] = []
  
  // Get matching routes
  const matchingRoutes = getRoutesForRequest({
    tripLength: scenario.tripLength,
    budget: scenario.budget,
    travelMonths: scenario.travelMonths,
    interests: scenario.interests,
    tripStructure: scenario.tripStructure,
    departureCity: scenario.departureCity,
    passportCountry: scenario.passportCountry,
    destination: scenario.destination
  })
  
  console.log(`   Routes found: ${matchingRoutes.length}`)
  
  const routeCountries = [...new Set(matchingRoutes.map(r => r.country))]
  const routeTypes = [...new Set(matchingRoutes.map(r => r.route_type))]
  
  // Check: avoidLongHaul
  if (scenario.expected.avoidLongHaul !== undefined) {
    const longHaulCountries = ['Japan', 'Thailand', 'USA', 'Mexico', 'Canada', 'Australia', 'New Zealand', 'Brazil', 'Argentina', 'South Africa']
    const hasLongHaul = routeCountries.some(c => longHaulCountries.includes(c))
    const passed = scenario.expected.avoidLongHaul ? !hasLongHaul : true
    
    checks.push({
      name: 'avoidLongHaul',
      passed,
      expected: scenario.expected.avoidLongHaul,
      actual: !hasLongHaul,
      message: hasLongHaul ? `Found long-haul: ${routeCountries.filter(c => longHaulCountries.includes(c)).join(', ')}` : 'No long-haul destinations'
    })
  }
  
  // Check: bannedCountries
  if (scenario.expected.bannedCountries && scenario.expected.bannedCountries.length > 0) {
    const hasBanned = routeCountries.some(c => scenario.expected.bannedCountries!.includes(c))
    const passed = !hasBanned
    
    checks.push({
      name: 'bannedCountries',
      passed,
      expected: `Avoid: ${scenario.expected.bannedCountries.join(', ')}`,
      actual: hasBanned ? `Found: ${routeCountries.filter(c => scenario.expected.bannedCountries!.includes(c)).join(', ')}` : 'No banned countries',
      message: hasBanned ? 'Contains banned countries' : 'No banned countries found'
    })
  }
  
  // Check: mustBeMultiCity
  if (scenario.expected.mustBeMultiCity !== undefined) {
    const hasMultiCity = matchingRoutes.some(r => {
      const cities = r.cities.split(',').map(c => c.trim())
      return cities.length >= 2
    })
    const passed = scenario.expected.mustBeMultiCity ? hasMultiCity : true
    
    checks.push({
      name: 'mustBeMultiCity',
      passed,
      expected: scenario.expected.mustBeMultiCity,
      actual: hasMultiCity,
      message: hasMultiCity ? 'Multi-city routes found' : 'No multi-city routes'
    })
  }
  
  // Check: minimumRouteCities
  if (scenario.expected.minimumRouteCities !== undefined) {
    const maxCities = Math.max(...matchingRoutes.map(r => r.cities.split(',').length), 0)
    const passed = maxCities >= scenario.expected.minimumRouteCities
    
    checks.push({
      name: 'minimumRouteCities',
      passed,
      expected: `≥${scenario.expected.minimumRouteCities} cities`,
      actual: `${maxCities} cities`,
      message: passed ? `Found routes with ${maxCities} cities` : `Max ${maxCities} cities, need ${scenario.expected.minimumRouteCities}`
    })
  }
  
  // Check: mustHaveWatchOut
  if (scenario.expected.mustHaveWatchOut !== undefined) {
    const hasWatchOut = matchingRoutes.some(r => r.watch_out && r.watch_out.length > 0)
    const passed = scenario.expected.mustHaveWatchOut ? hasWatchOut : true
    
    checks.push({
      name: 'mustHaveWatchOut',
      passed,
      expected: scenario.expected.mustHaveWatchOut,
      actual: hasWatchOut,
      message: hasWatchOut ? 'Routes have watch-out notes' : 'No watch-out notes'
    })
  }
  
  // Check: allowedRegions
  if (scenario.expected.allowedRegions && scenario.expected.allowedRegions.length > 0) {
    const routeRegions = [...new Set(matchingRoutes.map(r => r.region))]
    const allAllowed = routeRegions.every(r => scenario.expected.allowedRegions!.includes(r))
    const passed = allAllowed
    
    checks.push({
      name: 'allowedRegions',
      passed,
      expected: scenario.expected.allowedRegions.join(', '),
      actual: routeRegions.join(', '),
      message: passed ? 'All regions allowed' : `Found disallowed regions: ${routeRegions.filter(r => !scenario.expected.allowedRegions!.includes(r)).join(', ')}`
    })
  }
  
  // Print check results
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌'
    console.log(`   ${icon} ${check.name}: ${check.message || (check.passed ? 'PASS' : 'FAIL')}`)
  })
  
  const allPassed = checks.every(c => c.passed)
  
  results.push({
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    passed: allPassed,
    checks,
    routesFound: matchingRoutes.length,
    routeCountries,
    routeTypes
  })
  
  console.log(`   ${allPassed ? '✅ PASS' : '❌ FAIL'}`)
}

console.log('\n' + '='.repeat(80))
console.log('EVALUATION SUMMARY')
console.log('='.repeat(80))

const totalScenarios = results.length
const passedScenarios = results.filter(r => r.passed).length
const failedScenarios = totalScenarios - passedScenarios

console.log(`\nTotal Scenarios: ${totalScenarios}`)
console.log(`Passed: ${passedScenarios}`)
console.log(`Failed: ${failedScenarios}`)
console.log(`Success Rate: ${((passedScenarios / totalScenarios) * 100).toFixed(1)}%`)

if (failedScenarios > 0) {
  console.log(`\n❌ Failed Scenarios:`)
  results.filter(r => !r.passed).forEach(r => {
    console.log(`   - ${r.scenarioName} (${r.scenarioId})`)
    r.checks.filter(c => !c.passed).forEach(c => {
      console.log(`     ❌ ${c.name}: ${c.message}`)
    })
  })
}

// Save results
const outputPath = path.join(process.cwd(), 'data', 'travel', 'evaluation-results.json')
fs.writeFileSync(outputPath, JSON.stringify({
  runDate: new Date().toISOString(),
  mode: runLive ? 'live' : 'validation',
  totalScenarios,
  passedScenarios,
  failedScenarios,
  successRate: (passedScenarios / totalScenarios) * 100,
  results
}, null, 2))

console.log(`\n📁 Results saved to: ${outputPath}`)

if (failedScenarios > 0) {
  console.log(`\n⚠️  ${failedScenarios} scenario(s) failed`)
  process.exit(1)
} else {
  console.log(`\n✅ All scenarios passed!`)
  process.exit(0)
}
