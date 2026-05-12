/**
 * Production Security Verification Script
 * Tests all security hardening measures
 */

import * as fs from 'fs'
import * as path from 'path'

interface TestResult {
  test: string
  status: 'pass' | 'fail' | 'warning' | 'info'
  message: string
  details?: string
}

const results: TestResult[] = []

function addResult(test: string, status: TestResult['status'], message: string, details?: string) {
  results.push({ test, status, message, details })
}

/**
 * 1. Check Supabase RLS Migrations
 */
function checkRLSMigrations() {
  console.log('\n📋 1. Checking Supabase RLS Migrations...')
  
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  
  if (!fs.existsSync(migrationsDir)) {
    addResult('RLS Migrations', 'fail', 'Migrations directory not found')
    return
  }
  
  const files = fs.readdirSync(migrationsDir)
  const rlsFiles = files.filter(f => f.includes('rls') || f.includes('security'))
  
  if (rlsFiles.length === 0) {
    addResult('RLS Migrations', 'fail', 'No RLS migration files found')
    return
  }
  
  addResult('RLS Migrations', 'info', `Found ${rlsFiles.length} RLS migration files`, 
    `Files: ${rlsFiles.join(', ')}\n\nTo apply: supabase db push`)
}

/**
 * 2. Check Vercel KV Configuration
 */
function checkVercelKV() {
  console.log('\n🔑 2. Checking Vercel KV Configuration...')
  
  const envExample = path.join(process.cwd(), '.env.example')
  const envLocal = path.join(process.cwd(), '.env.local')
  
  let hasKVConfig = false
  
  if (fs.existsSync(envLocal)) {
    const content = fs.readFileSync(envLocal, 'utf-8')
    hasKVConfig = content.includes('KV_REST_API_URL') && 
                  !content.includes('KV_REST_API_URL=your_kv') &&
                  !content.includes('KV_REST_API_URL=')
  }
  
  if (hasKVConfig) {
    addResult('Vercel KV', 'pass', 'KV configured in .env.local')
  } else {
    addResult('Vercel KV', 'warning', 'KV not configured - using in-memory fallback',
      'Rate limiting will work but per-instance only. For production, configure:\nKV_REST_API_URL=...\nKV_REST_API_TOKEN=...')
  }
}

/**
 * 3. Check Security Files
 */
function checkSecurityFiles() {
  console.log('\n🔒 3. Checking Security Implementation Files...')
  
  const securityFiles = [
    'src/lib/security/rate-limiter.ts',
    'src/lib/security/input-validation.ts',
    'src/lib/security/llm-security.ts',
    'src/lib/auth/admin-guard.ts',
  ]
  
  let allExist = true
  const missing: string[] = []
  
  for (const file of securityFiles) {
    const fullPath = path.join(process.cwd(), file)
    if (!fs.existsSync(fullPath)) {
      allExist = false
      missing.push(file)
    }
  }
  
  if (allExist) {
    addResult('Security Files', 'pass', 'All security implementation files exist')
  } else {
    addResult('Security Files', 'fail', 'Missing security files', missing.join('\n'))
  }
}

/**
 * 4. Check Admin Route Protection
 */
function checkAdminProtection() {
  console.log('\n🛡️ 4. Checking Admin Route Protection...')
  
  const adminApiDir = path.join(process.cwd(), 'src', 'app', 'api', 'admin')
  
  if (!fs.existsSync(adminApiDir)) {
    addResult('Admin Protection', 'warning', 'No admin API routes found')
    return
  }
  
  const files = fs.readdirSync(adminApiDir, { recursive: true }) as string[]
  const routeFiles = files.filter(f => f.endsWith('route.ts'))
  
  let allProtected = true
  const unprotected: string[] = []
  
  for (const file of routeFiles) {
    const fullPath = path.join(adminApiDir, file)
    const content = fs.readFileSync(fullPath, 'utf-8')
    
    if (!content.includes('requireAdmin')) {
      allProtected = false
      unprotected.push(file)
    }
  }
  
  if (allProtected) {
    addResult('Admin Protection', 'pass', `All ${routeFiles.length} admin routes protected`)
  } else {
    addResult('Admin Protection', 'fail', 'Some admin routes missing protection', unprotected.join('\n'))
  }
}

/**
 * 5. Check Trigger Route Protection
 */
function checkTriggerProtection() {
  console.log('\n⚡ 5. Checking Trigger Route Protection...')
  
  const triggerRoutes = [
    'src/app/api/trigger-all/route.ts',
    'src/app/api/trigger-scan/route.ts',
  ]
  
  let allProtected = true
  const issues: string[] = []
  
  for (const route of triggerRoutes) {
    const fullPath = path.join(process.cwd(), route)
    
    if (!fs.existsSync(fullPath)) {
      continue
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8')
    
    if (!content.includes('NODE_ENV') && !content.includes('requireAdmin')) {
      allProtected = false
      issues.push(`${route}: Missing production block or admin check`)
    }
  }
  
  if (allProtected) {
    addResult('Trigger Protection', 'pass', 'Trigger routes properly protected')
  } else {
    addResult('Trigger Protection', 'fail', 'Trigger routes not properly protected', issues.join('\n'))
  }
}

/**
 * 6. Check for Exposed Secrets
 */
function checkExposedSecrets() {
  console.log('\n🔐 6. Checking for Exposed Secrets...')
  
  const dangerousPublicVars = [
    'NEXT_PUBLIC_OPENAI_API_KEY',
    'NEXT_PUBLIC_ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_DUFFEL_API_TOKEN',
    'NEXT_PUBLIC_HOTELBEDS_API_KEY',
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  ]
  
  const envExample = path.join(process.cwd(), '.env.example')
  const issues: string[] = []
  
  if (fs.existsSync(envExample)) {
    const content = fs.readFileSync(envExample, 'utf-8')
    
    for (const varName of dangerousPublicVars) {
      if (content.includes(varName)) {
        issues.push(varName)
      }
    }
  }
  
  if (issues.length === 0) {
    addResult('Secret Exposure', 'pass', 'No dangerous public env vars found')
  } else {
    addResult('Secret Exposure', 'fail', 'Found dangerous public env vars', issues.join('\n'))
  }
}

/**
 * 7. Check Security Headers
 */
function checkSecurityHeaders() {
  console.log('\n📡 7. Checking Security Headers Configuration...')
  
  const nextConfig = path.join(process.cwd(), 'next.config.js')
  
  if (!fs.existsSync(nextConfig)) {
    addResult('Security Headers', 'fail', 'next.config.js not found')
    return
  }
  
  const content = fs.readFileSync(nextConfig, 'utf-8')
  
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
  ]
  
  let allPresent = true
  const missing: string[] = []
  
  for (const header of requiredHeaders) {
    if (!content.includes(header)) {
      allPresent = false
      missing.push(header)
    }
  }
  
  if (allPresent) {
    addResult('Security Headers', 'pass', 'Security headers configured')
  } else {
    addResult('Security Headers', 'fail', 'Missing security headers', missing.join('\n'))
  }
}

/**
 * 8. Check Build Output
 */
function checkBuildOutput() {
  console.log('\n🏗️ 8. Checking Build Output...')
  
  const buildDir = path.join(process.cwd(), '.next')
  
  if (!fs.existsSync(buildDir)) {
    addResult('Build Output', 'warning', 'No build output found - run npm run build')
    return
  }
  
  addResult('Build Output', 'pass', 'Build directory exists')
}

/**
 * Print Results
 */
function printResults() {
  console.log('\n' + '='.repeat(80))
  console.log('PRODUCTION SECURITY VERIFICATION RESULTS')
  console.log('='.repeat(80) + '\n')
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const warnings = results.filter(r => r.status === 'warning').length
  const info = results.filter(r => r.status === 'info').length
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : 
                 result.status === 'fail' ? '❌' : 
                 result.status === 'warning' ? '⚠️' : 'ℹ️'
    
    console.log(`${icon} ${result.test}: ${result.message}`)
    if (result.details) {
      console.log(`   ${result.details.split('\n').join('\n   ')}`)
    }
    console.log()
  }
  
  console.log('='.repeat(80))
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings, ${info} info`)
  console.log('='.repeat(80) + '\n')
  
  // Save to file
  const outputDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const output = {
    timestamp: new Date().toISOString(),
    summary: { passed, failed, warnings, info },
    results,
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'security-verification.json'),
    JSON.stringify(output, null, 2)
  )
  
  console.log('💾 Results saved to: data/security-verification.json\n')
  
  // Exit code
  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

/**
 * Main
 */
function main() {
  console.log('🔒 Production Security Verification\n')
  
  checkRLSMigrations()
  checkVercelKV()
  checkSecurityFiles()
  checkAdminProtection()
  checkTriggerProtection()
  checkExposedSecrets()
  checkSecurityHeaders()
  checkBuildOutput()
  
  printResults()
}

main()
