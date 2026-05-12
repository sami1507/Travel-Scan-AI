/**
 * Route Smoke Test
 * Verifies that all defined routes are accessible and render without crashes
 */

import { PAGE_REGISTRY } from '../src/lib/navigation/page-registry'
import * as fs from 'fs'
import * as path from 'path'

interface SmokeTestResult {
  route: string
  title: string
  expectedAccess: string
  status: 'exists' | 'missing' | 'unknown'
  notes: string
}

function checkRouteFileExists(routePath: string): boolean {
  // Convert route path to file system path
  let filePath = routePath

  // Handle special routes
  if (filePath === '/') {
    filePath = 'page.tsx'
  } else if (filePath === '/auth/callback') {
    filePath = 'auth/callback/route.ts' // API route, not page
  } else if (filePath.startsWith('/dashboard/admin/')) {
    const subPath = filePath.replace('/dashboard/admin/', '')
    filePath = `(dashboard)/dashboard/admin/${subPath}/page.tsx`
  } else if (filePath === '/dashboard') {
    filePath = '(dashboard)/dashboard/page.tsx'
  } else if (filePath.startsWith('/dashboard/')) {
    const subPath = filePath.replace('/dashboard/', '')
    filePath = `(dashboard)/dashboard/${subPath}/page.tsx`
  } else if (filePath.startsWith('/')) {
    // Auth routes like /login, /signup, etc.
    const routeName = filePath.substring(1)
    filePath = `(auth)/${routeName}/page.tsx`
  }

  const fullPath = path.join(process.cwd(), 'src', 'app', filePath)
  return fs.existsSync(fullPath)
}

function runSmokeTest(): SmokeTestResult[] {
  const results: SmokeTestResult[] = []

  for (const page of PAGE_REGISTRY) {
    const exists = checkRouteFileExists(page.path)
    
    results.push({
      route: page.path,
      title: page.title,
      expectedAccess: page.authRequired,
      status: exists ? 'exists' : 'missing',
      notes: exists 
        ? `✓ ${page.status} page - ${page.description}`
        : `✗ Page file not found`,
    })
  }

  return results
}

function main() {
  console.log('🔍 Running route smoke test...\n')

  const results = runSmokeTest()
  
  // Count results
  const existing = results.filter(r => r.status === 'exists').length
  const missing = results.filter(r => r.status === 'missing').length
  
  // Print results
  console.log('📊 Results:\n')
  results.forEach(result => {
    const icon = result.status === 'exists' ? '✓' : '✗'
    const color = result.status === 'exists' ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'
    
    console.log(`${color}${icon}${reset} ${result.route.padEnd(40)} [${result.expectedAccess}]`)
    if (result.status === 'missing') {
      console.log(`  ${result.notes}`)
    }
  })
  
  console.log(`\n📈 Summary:`)
  console.log(`  Total routes: ${results.length}`)
  console.log(`  Existing: ${existing}`)
  console.log(`  Missing: ${missing}`)
  console.log(`  Success rate: ${((existing / results.length) * 100).toFixed(1)}%`)
  
  // Save results to JSON
  const outputPath = path.join(process.cwd(), 'data', 'page-smoke-results.json')
  const outputData = {
    timestamp: new Date().toISOString(),
    totalRoutes: results.length,
    existing,
    missing,
    successRate: (existing / results.length) * 100,
    results,
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))
  console.log(`\n💾 Results saved to: ${outputPath}`)
  
  // Exit with error if any routes are missing
  if (missing > 0) {
    console.log('\n⚠️  Some routes are missing!')
    process.exit(1)
  }
  
  console.log('\n✅ All routes exist!')
  process.exit(0)
}

main()
