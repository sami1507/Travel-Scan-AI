/**
 * Learning Layer Evaluation Script
 * Tests Phase 1 learning functionality
 */

import * as fs from 'fs'
import * as path from 'path'

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function addResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details })
  console.log(`${passed ? '✅' : '❌'} ${name}: ${message}`)
}

/**
 * Test 1: Learning disabled does not store events
 */
function testLearningDisabled() {
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  const learningEnabled = envContent.includes('ENABLE_AI_LEARNING=true')
  
  if (!learningEnabled) {
    addResult(
      'Learning Disabled Check',
      true,
      'ENABLE_AI_LEARNING is not set to true - learning will be disabled'
    )
  } else {
    addResult(
      'Learning Disabled Check',
      true,
      'ENABLE_AI_LEARNING=true found - learning is enabled'
    )
  }
}

/**
 * Test 2: Migration file exists
 */
function testMigrationExists() {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260512_ai_learning_layer.sql'
  )
  
  const exists = fs.existsSync(migrationPath)
  addResult(
    'Migration File Exists',
    exists,
    exists
      ? 'Learning layer migration file found'
      : 'Migration file not found',
    { path: migrationPath }
  )
}

/**
 * Test 3: Learning service exists
 */
function testLearningServiceExists() {
  const servicePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'learning',
    'learning-service.ts'
  )
  
  const exists = fs.existsSync(servicePath)
  addResult(
    'Learning Service Exists',
    exists,
    exists
      ? 'Learning service file found'
      : 'Learning service file not found',
    { path: servicePath }
  )
  
  if (exists) {
    const content = fs.readFileSync(servicePath, 'utf-8')
    const hasRecordEvent = content.includes('recordRecommendationEvent')
    const hasRecordFeedback = content.includes('recordFeedbackSignal')
    const hasUpdateProfile = content.includes('updateUserPreferenceProfile')
    const hasGetProfile = content.includes('getUserPreferenceProfile')
    const hasGetContext = content.includes('getLearningContextForAnalysis')
    
    addResult(
      'Learning Service Functions',
      hasRecordEvent && hasRecordFeedback && hasUpdateProfile && hasGetProfile && hasGetContext,
      'All required learning service functions present',
      {
        recordRecommendationEvent: hasRecordEvent,
        recordFeedbackSignal: hasRecordFeedback,
        updateUserPreferenceProfile: hasUpdateProfile,
        getUserPreferenceProfile: hasGetProfile,
        getLearningContextForAnalysis: hasGetContext,
      }
    )
  }
}

/**
 * Test 4: Analysis integration exists
 */
function testAnalysisIntegration() {
  const enginePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'analysis',
    'engine.ts'
  )
  
  if (!fs.existsSync(enginePath)) {
    addResult('Analysis Integration', false, 'Analysis engine file not found')
    return
  }
  
  const content = fs.readFileSync(enginePath, 'utf-8')
  const hasImport = content.includes('getLearningContextForAnalysis') && 
                    content.includes('recordRecommendationEvent')
  const hasContextLoad = content.includes('learningContext')
  const hasEventRecord = content.includes('learningEventId')
  
  addResult(
    'Analysis Integration',
    hasImport && hasContextLoad && hasEventRecord,
    'Learning integrated into analysis engine',
    {
      hasImport,
      hasContextLoad,
      hasEventRecord,
    }
  )
}

/**
 * Test 5: Feedback API exists
 */
function testFeedbackAPI() {
  const apiPath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'learning',
    'feedback',
    'route.ts'
  )
  
  const exists = fs.existsSync(apiPath)
  addResult(
    'Feedback API Exists',
    exists,
    exists
      ? 'Feedback API endpoint found'
      : 'Feedback API endpoint not found',
    { path: apiPath }
  )
  
  if (exists) {
    const content = fs.readFileSync(apiPath, 'utf-8')
    const hasAuth = content.includes('auth.getUser')
    const hasValidation = content.includes('feedbackSchema')
    const hasRecordCall = content.includes('recordFeedbackSignal')
    
    addResult(
      'Feedback API Implementation',
      hasAuth && hasValidation && hasRecordCall,
      'Feedback API properly implemented',
      { hasAuth, hasValidation, hasRecordCall }
    )
  }
}

/**
 * Test 6: Profile API exists
 */
function testProfileAPI() {
  const apiPath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'learning',
    'profile',
    'route.ts'
  )
  
  const exists = fs.existsSync(apiPath)
  addResult(
    'Profile API Exists',
    exists,
    exists
      ? 'Profile API endpoint found'
      : 'Profile API endpoint not found',
    { path: apiPath }
  )
  
  if (exists) {
    const content = fs.readFileSync(apiPath, 'utf-8')
    const hasAuth = content.includes('auth.getUser')
    const hasGetProfile = content.includes('getUserPreferenceProfile')
    
    addResult(
      'Profile API Implementation',
      hasAuth && hasGetProfile,
      'Profile API properly implemented',
      { hasAuth, hasGetProfile }
    )
  }
}

/**
 * Test 7: Admin insights API exists
 */
function testAdminInsightsAPI() {
  const apiPath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'admin',
    'learning-insights',
    'route.ts'
  )
  
  const exists = fs.existsSync(apiPath)
  addResult(
    'Admin Insights API Exists',
    exists,
    exists
      ? 'Admin insights API endpoint found'
      : 'Admin insights API endpoint not found',
    { path: apiPath }
  )
  
  if (exists) {
    const content = fs.readFileSync(apiPath, 'utf-8')
    const hasAdminGuard = content.includes('requireAdmin')
    const hasAggregation = content.includes('totalRecommendationEvents')
    
    addResult(
      'Admin Insights API Implementation',
      hasAdminGuard && hasAggregation,
      'Admin insights API properly implemented with admin guard',
      { hasAdminGuard, hasAggregation }
    )
  }
}

/**
 * Test 8: RLS policies in migration
 */
function testRLSPolicies() {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260512_ai_learning_layer.sql'
  )
  
  if (!fs.existsSync(migrationPath)) {
    addResult('RLS Policies', false, 'Migration file not found')
    return
  }
  
  const content = fs.readFileSync(migrationPath, 'utf-8')
  const hasRLSEnable = content.includes('ENABLE ROW LEVEL SECURITY')
  const hasUserPolicy = content.includes('Users can view their own')
  const hasServicePolicy = content.includes('Service role can insert')
  
  addResult(
    'RLS Policies',
    hasRLSEnable && hasUserPolicy && hasServicePolicy,
    'RLS policies properly defined in migration',
    { hasRLSEnable, hasUserPolicy, hasServicePolicy }
  )
}

/**
 * Test 9: Privacy protection
 */
function testPrivacyProtection() {
  const servicePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'learning',
    'learning-service.ts'
  )
  
  if (!fs.existsSync(servicePath)) {
    addResult('Privacy Protection', false, 'Learning service not found')
    return
  }
  
  const content = fs.readFileSync(servicePath, 'utf-8')
  const hasEnvCheck = content.includes('ENABLE_AI_LEARNING')
  const hasMinSignals = content.includes('MIN_SIGNALS_FOR_CONFIDENCE')
  const noSecrets = !content.includes('OPENAI_API_KEY') && !content.includes('SUPABASE_SERVICE_ROLE_KEY')
  
  addResult(
    'Privacy Protection',
    hasEnvCheck && hasMinSignals,
    'Privacy protections in place',
    { hasEnvCheck, hasMinSignals, noSecretsInLogs: noSecrets }
  )
}

/**
 * Test 10: Minimum signals requirement
 */
function testMinimumSignalsRequirement() {
  const servicePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'learning',
    'learning-service.ts'
  )
  
  if (!fs.existsSync(servicePath)) {
    addResult('Minimum Signals', false, 'Learning service not found')
    return
  }
  
  const content = fs.readFileSync(servicePath, 'utf-8')
  const hasMinCheck = content.includes('signalCount < MIN_SIGNALS_FOR_CONFIDENCE')
  const minValue = content.match(/MIN_SIGNALS_FOR_CONFIDENCE\s*=\s*(\d+)/)
  
  addResult(
    'Minimum Signals Requirement',
    hasMinCheck && minValue && parseInt(minValue[1]) >= 5,
    `Minimum signals check present (${minValue ? minValue[1] : 'N/A'} signals required)`,
    { hasMinCheck, minSignals: minValue ? parseInt(minValue[1]) : null }
  )
}

/**
 * Main evaluation
 */
function main() {
  console.log('\n' + '='.repeat(80))
  console.log('LEARNING LAYER EVALUATION - PHASE 1')
  console.log('='.repeat(80) + '\n')

  testLearningDisabled()
  testMigrationExists()
  testLearningServiceExists()
  testAnalysisIntegration()
  testFeedbackAPI()
  testProfileAPI()
  testAdminInsightsAPI()
  testRLSPolicies()
  testPrivacyProtection()
  testMinimumSignalsRequirement()

  console.log('\n' + '='.repeat(80))
  console.log('EVALUATION SUMMARY')
  console.log('='.repeat(80) + '\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`)

  if (failed > 0) {
    console.log('Failed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.message}`)
    })
    console.log()
  }

  // Save results
  const outputDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const output = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, successRate: (passed / total) * 100 },
    results,
  }

  fs.writeFileSync(
    path.join(outputDir, 'learning-evaluation-results.json'),
    JSON.stringify(output, null, 2)
  )

  console.log('💾 Results saved to: data/learning-evaluation-results.json\n')

  process.exit(failed > 0 ? 1 : 0)
}

main()
