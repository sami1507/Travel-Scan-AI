/**
 * Access Test Matrix
 * Tests actual access control for different user types
 */

interface TestCase {
  scenario: string
  route: string
  expectedStatus: number | string
  description: string
}

const testMatrix: Record<string, TestCase[]> = {
  'Unauthenticated User': [
    {
      scenario: 'Unauthenticated',
      route: '/dashboard',
      expectedStatus: '307 → /login',
      description: 'Should redirect to login'
    },
    {
      scenario: 'Unauthenticated',
      route: '/dashboard/admin',
      expectedStatus: '307 → /login',
      description: 'Should redirect to login'
    },
    {
      scenario: 'Unauthenticated',
      route: '/api/admin/analytics',
      expectedStatus: 401,
      description: 'Should return Unauthorized'
    },
    {
      scenario: 'Unauthenticated',
      route: '/api/trigger-all',
      expectedStatus: 401,
      description: 'Should return Unauthorized or production blocked'
    },
  ],

  'Normal Authenticated User': [
    {
      scenario: 'Normal User',
      route: '/dashboard',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Normal User',
      route: '/dashboard/analysis',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Normal User',
      route: '/dashboard/profile',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Normal User',
      route: '/dashboard/admin',
      expectedStatus: '307 → /dashboard',
      description: 'Should redirect to dashboard (non-admin)'
    },
    {
      scenario: 'Normal User',
      route: '/dashboard/admin/ml-monitoring',
      expectedStatus: '307 → /dashboard',
      description: 'Should redirect to dashboard (non-admin)'
    },
    {
      scenario: 'Normal User',
      route: '/dashboard/travel-test (production)',
      expectedStatus: 'Blocked',
      description: 'Should show production block message'
    },
    {
      scenario: 'Normal User',
      route: '/api/admin/analytics',
      expectedStatus: 403,
      description: 'Should return Forbidden'
    },
    {
      scenario: 'Normal User',
      route: '/api/trigger-all',
      expectedStatus: 403,
      description: 'Should return Forbidden or production blocked'
    },
  ],

  'Admin User': [
    {
      scenario: 'Admin',
      route: '/dashboard',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/dashboard/admin',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/dashboard/admin/operations',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/dashboard/admin/ml-monitoring',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/dashboard/admin/quality',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/dashboard/admin/feedback-intelligence',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/dashboard/admin/intelligence-signals',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/analytics',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/operations',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/ml-monitoring',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/ml-quality',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/quality-eval',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/feedback-insights',
      expectedStatus: 200,
      description: 'Should allow access'
    },
    {
      scenario: 'Admin',
      route: '/api/admin/intelligence-signals',
      expectedStatus: 200,
      description: 'Should allow access'
    },
  ],

  'Production Environment': [
    {
      scenario: 'Production',
      route: '/dashboard/travel-test',
      expectedStatus: 'Blocked',
      description: 'Dev page should show production block message'
    },
    {
      scenario: 'Production',
      route: '/api/trigger-all',
      expectedStatus: 403,
      description: 'Should be blocked unless ENABLE_TRIGGER_ROUTES=true'
    },
    {
      scenario: 'Production',
      route: '/api/trigger-scan',
      expectedStatus: 403,
      description: 'Should be blocked unless ENABLE_TRIGGER_ROUTES=true'
    },
  ],
}

function printTestMatrix() {
  console.log('\n' + '='.repeat(80))
  console.log('ACCESS CONTROL TEST MATRIX')
  console.log('='.repeat(80) + '\n')

  for (const [userType, tests] of Object.entries(testMatrix)) {
    console.log(`\n📋 ${userType}:\n`)
    console.log('  Route                                    Expected         Description')
    console.log('  ' + '-'.repeat(76))

    for (const test of tests) {
      const route = test.route.padEnd(40)
      const expected = String(test.expectedStatus).padEnd(16)
      console.log(`  ${route} ${expected} ${test.description}`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('\nℹ️  To test manually:')
  console.log('   1. Run: npm run build && npm run start')
  console.log('   2. Test unauthenticated: Open incognito window')
  console.log('   3. Test normal user: Sign up new account')
  console.log('   4. Test admin: Set role=admin in user_profiles table')
  console.log('   5. Test production: Set NODE_ENV=production')
  console.log('\n' + '='.repeat(80) + '\n')

  // Save to file
  const fs = require('fs')
  const path = require('path')

  const outputDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const output = {
    timestamp: new Date().toISOString(),
    testMatrix,
    summary: {
      totalTests: Object.values(testMatrix).reduce((sum, tests) => sum + tests.length, 0),
      userTypes: Object.keys(testMatrix).length,
    },
  }

  fs.writeFileSync(
    path.join(outputDir, 'access-test-matrix.json'),
    JSON.stringify(output, null, 2)
  )

  console.log('💾 Test matrix saved to: data/access-test-matrix.json\n')
}

printTestMatrix()
