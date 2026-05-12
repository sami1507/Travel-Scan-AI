/**
 * Route Access Audit Script
 * Verifies admin/user route separation and access control
 */

import * as fs from 'fs'
import * as path from 'path'

interface RouteAudit {
  route: string
  type: 'public' | 'user' | 'admin' | 'dev' | 'api'
  hasServerProtection: boolean
  hasLayoutProtection: boolean
  protectionMethod: string
  issues: string[]
  status: 'secure' | 'warning' | 'vulnerable'
}

const results: RouteAudit[] = []

/**
 * Check if a page has server-side protection
 */
function checkPageProtection(filePath: string): { hasProtection: boolean; method: string } {
  if (!fs.existsSync(filePath)) {
    return { hasProtection: false, method: 'none' }
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // Check for various protection methods
  if (content.includes('requireAdmin')) {
    return { hasProtection: true, method: 'requireAdmin()' }
  }

  if (content.includes('redirect("/login")') || content.includes('redirect(\'/login\')')) {
    return { hasProtection: true, method: 'auth redirect' }
  }

  if (content.includes('NODE_ENV') && content.includes('production')) {
    return { hasProtection: true, method: 'production block' }
  }

  if (content.includes('auth.getUser()') && content.includes('redirect')) {
    return { hasProtection: true, method: 'auth check' }
  }

  return { hasProtection: false, method: 'none' }
}

/**
 * Check if a layout provides protection
 */
function checkLayoutProtection(routePath: string): boolean {
  // Check for admin layout
  if (routePath.startsWith('/dashboard/admin')) {
    const adminLayout = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'dashboard', 'admin', 'layout.tsx')
    if (fs.existsSync(adminLayout)) {
      const content = fs.readFileSync(adminLayout, 'utf-8')
      return content.includes('requireAdmin') || (content.includes('role') && content.includes('admin'))
    }
  }

  // Check for dashboard layout
  if (routePath.startsWith('/dashboard')) {
    const dashboardLayout = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx')
    if (fs.existsSync(dashboardLayout)) {
      const content = fs.readFileSync(dashboardLayout, 'utf-8')
      return content.includes('auth.getUser') || content.includes('redirect')
    }
  }

  return false
}

/**
 * Audit dashboard pages
 */
function auditDashboardPages() {
  const dashboardDir = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'dashboard')

  if (!fs.existsSync(dashboardDir)) {
    return
  }

  const pages = [
    { route: '/dashboard', file: 'page.tsx', type: 'user' as const },
    { route: '/dashboard/analysis', file: 'analysis/page.tsx', type: 'user' as const },
    { route: '/dashboard/saved', file: 'saved/page.tsx', type: 'user' as const },
    { route: '/dashboard/profile', file: 'profile/page.tsx', type: 'user' as const },
    { route: '/dashboard/sources', file: 'sources/page.tsx', type: 'user' as const },
    { route: '/dashboard/alerts', file: 'alerts/page.tsx', type: 'user' as const },
    { route: '/dashboard/opportunities', file: 'opportunities/page.tsx', type: 'user' as const },
    { route: '/dashboard/intelligence', file: 'intelligence/page.tsx', type: 'user' as const },
    { route: '/dashboard/notifications', file: 'notifications/page.tsx', type: 'user' as const },
    { route: '/dashboard/compare', file: 'compare/page.tsx', type: 'user' as const },
    { route: '/dashboard/admin', file: 'admin/page.tsx', type: 'admin' as const },
    { route: '/dashboard/admin/operations', file: 'admin/operations/page.tsx', type: 'admin' as const },
    { route: '/dashboard/admin/ml-monitoring', file: 'admin/ml-monitoring/page.tsx', type: 'admin' as const },
    { route: '/dashboard/admin/quality', file: 'admin/quality/page.tsx', type: 'admin' as const },
    { route: '/dashboard/admin/feedback-intelligence', file: 'admin/feedback-intelligence/page.tsx', type: 'admin' as const },
    { route: '/dashboard/admin/intelligence-signals', file: 'admin/intelligence-signals/page.tsx', type: 'admin' as const },
    { route: '/dashboard/travel-test', file: 'travel-test/page.tsx', type: 'dev' as const },
  ]

  for (const page of pages) {
    const filePath = path.join(dashboardDir, page.file)
    const pageProtection = checkPageProtection(filePath)
    const layoutProtection = checkLayoutProtection(page.route)

    const issues: string[] = []
    let status: 'secure' | 'warning' | 'vulnerable' = 'secure'

    // Check if page exists
    if (!fs.existsSync(filePath)) {
      issues.push('Page file not found')
      status = 'warning'
    }

    // Admin pages must have protection
    if (page.type === 'admin') {
      if (!layoutProtection && !pageProtection.hasProtection) {
        issues.push('Admin page missing server-side protection')
        status = 'vulnerable'
      }
    }

    // Dev pages must be blocked in production
    if (page.type === 'dev') {
      if (!pageProtection.method.includes('production')) {
        issues.push('Dev page not blocked in production')
        status = 'vulnerable'
      }
    }

    // User pages should have auth
    if (page.type === 'user') {
      if (!layoutProtection && !pageProtection.hasProtection) {
        issues.push('User page missing auth protection')
        status = 'warning'
      }
    }

    results.push({
      route: page.route,
      type: page.type,
      hasServerProtection: pageProtection.hasProtection,
      hasLayoutProtection: layoutProtection,
      protectionMethod: layoutProtection ? 'layout + ' + pageProtection.method : pageProtection.method,
      issues,
      status,
    })
  }
}

/**
 * Audit API routes
 */
function auditAPIRoutes() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')

  if (!fs.existsSync(apiDir)) {
    return
  }

  const apiRoutes = [
    { route: '/api/admin/analytics', file: 'admin/analytics/route.ts', type: 'admin' as const },
    { route: '/api/admin/operations', file: 'admin/operations/route.ts', type: 'admin' as const },
    { route: '/api/admin/ml-monitoring', file: 'admin/ml-monitoring/route.ts', type: 'admin' as const },
    { route: '/api/admin/ml-quality', file: 'admin/ml-quality/route.ts', type: 'admin' as const },
    { route: '/api/admin/quality-eval', file: 'admin/quality-eval/route.ts', type: 'admin' as const },
    { route: '/api/admin/feedback-insights', file: 'admin/feedback-insights/route.ts', type: 'admin' as const },
    { route: '/api/admin/intelligence-signals', file: 'admin/intelligence-signals/route.ts', type: 'admin' as const },
    { route: '/api/trigger-all', file: 'trigger-all/route.ts', type: 'dev' as const },
    { route: '/api/trigger-scan', file: 'trigger-scan/route.ts', type: 'dev' as const },
  ]

  for (const route of apiRoutes) {
    const filePath = path.join(apiDir, route.file)
    const protection = checkPageProtection(filePath)

    const issues: string[] = []
    let status: 'secure' | 'warning' | 'vulnerable' = 'secure'

    if (!fs.existsSync(filePath)) {
      issues.push('API route file not found')
      status = 'warning'
      results.push({
        route: route.route,
        type: route.type,
        hasServerProtection: false,
        hasLayoutProtection: false,
        protectionMethod: 'none',
        issues,
        status,
      })
      continue
    }

    // Admin APIs must have requireAdmin
    if (route.type === 'admin') {
      if (!protection.method.includes('requireAdmin')) {
        issues.push('Admin API missing requireAdmin() guard')
        status = 'vulnerable'
      }
    }

    // Dev/trigger APIs must be blocked in production
    if (route.type === 'dev') {
      if (!protection.method.includes('production') && !protection.method.includes('requireAdmin')) {
        issues.push('Trigger API not blocked in production')
        status = 'vulnerable'
      }
    }

    results.push({
      route: route.route,
      type: route.type,
      hasServerProtection: protection.hasProtection,
      hasLayoutProtection: false,
      protectionMethod: protection.method,
      issues,
      status,
    })
  }
}

/**
 * Print results
 */
function printResults() {
  console.log('\n' + '='.repeat(80))
  console.log('ROUTE ACCESS AUDIT RESULTS')
  console.log('='.repeat(80) + '\n')

  const secure = results.filter(r => r.status === 'secure').length
  const warnings = results.filter(r => r.status === 'warning').length
  const vulnerable = results.filter(r => r.status === 'vulnerable').length

  console.log(`Summary: ${secure} secure, ${warnings} warnings, ${vulnerable} vulnerable\n`)

  // Group by status
  const vulnerableRoutes = results.filter(r => r.status === 'vulnerable')
  const warningRoutes = results.filter(r => r.status === 'warning')
  const secureRoutes = results.filter(r => r.status === 'secure')

  if (vulnerableRoutes.length > 0) {
    console.log('🔴 VULNERABLE ROUTES:\n')
    for (const route of vulnerableRoutes) {
      console.log(`  ${route.route} [${route.type}]`)
      console.log(`    Protection: ${route.protectionMethod}`)
      console.log(`    Issues: ${route.issues.join(', ')}`)
      console.log()
    }
  }

  if (warningRoutes.length > 0) {
    console.log('🟡 WARNING ROUTES:\n')
    for (const route of warningRoutes) {
      console.log(`  ${route.route} [${route.type}]`)
      console.log(`    Protection: ${route.protectionMethod}`)
      console.log(`    Issues: ${route.issues.join(', ')}`)
      console.log()
    }
  }

  console.log(`✅ SECURE ROUTES: ${secureRoutes.length}\n`)

  // Save to file
  const outputDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const output = {
    timestamp: new Date().toISOString(),
    summary: { secure, warnings, vulnerable, total: results.length },
    results,
  }

  fs.writeFileSync(
    path.join(outputDir, 'route-access-audit.json'),
    JSON.stringify(output, null, 2)
  )

  console.log('💾 Results saved to: data/route-access-audit.json\n')

  // Exit code
  if (vulnerable > 0) {
    process.exit(1)
  }
  process.exit(0)
}

/**
 * Main
 */
function main() {
  console.log('🔍 Route Access Audit\n')

  auditDashboardPages()
  auditAPIRoutes()

  printResults()
}

main()
