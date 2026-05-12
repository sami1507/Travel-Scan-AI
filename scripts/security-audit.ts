/**
 * Security Audit Script
 * Checks for common security issues in the codebase
 */

import * as fs from 'fs'
import * as path from 'path'

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  message: string
  file?: string
  line?: number
}

interface AuditResult {
  timestamp: string
  passed: boolean
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  issues: SecurityIssue[]
}

const issues: SecurityIssue[] = []

/**
 * Check for exposed secrets in environment variables
 */
function checkEnvSecrets() {
  const envExample = path.join(process.cwd(), '.env.example')
  const envLocal = path.join(process.cwd(), '.env.local')
  
  // Check .env.example doesn't contain real secrets
  if (fs.existsSync(envExample)) {
    const content = fs.readFileSync(envExample, 'utf-8')
    
    // Check for NEXT_PUBLIC_ secrets (should never exist)
    const publicSecrets = [
      'NEXT_PUBLIC_OPENAI_API_KEY',
      'NEXT_PUBLIC_ANTHROPIC_API_KEY',
      'NEXT_PUBLIC_DUFFEL_API_TOKEN',
      'NEXT_PUBLIC_HOTELBEDS_API_KEY',
      'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
    ]
    
    for (const secret of publicSecrets) {
      if (content.includes(secret)) {
        issues.push({
          severity: 'critical',
          category: 'secrets',
          message: `Found dangerous public env var: ${secret}`,
          file: '.env.example',
        })
      }
    }
  }
  
  // Check .env.local is not committed (should be in .gitignore)
  const gitignore = path.join(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignore)) {
    const content = fs.readFileSync(gitignore, 'utf-8')
    if (!content.includes('.env.local') && !content.includes('.env*.local')) {
      issues.push({
        severity: 'high',
        category: 'secrets',
        message: '.env.local should be in .gitignore',
        file: '.gitignore',
      })
    }
  }
}

/**
 * Check for console.log with sensitive data
 */
function checkDangerousLogs() {
  const srcDir = path.join(process.cwd(), 'src')
  
  function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        
        lines.forEach((line, index) => {
          // Check for logging env variables
          if (line.includes('console.log') && line.includes('process.env')) {
            issues.push({
              severity: 'high',
              category: 'logging',
              message: 'Potentially logging environment variables',
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
            })
          }
          
          // Check for logging API keys
          if (line.includes('console.log') && (line.includes('API_KEY') || line.includes('SECRET') || line.includes('TOKEN'))) {
            issues.push({
              severity: 'medium',
              category: 'logging',
              message: 'Potentially logging sensitive data',
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
            })
          }
        })
      }
    }
  }
  
  if (fs.existsSync(srcDir)) {
    scanDirectory(srcDir)
  }
}

/**
 * Check admin routes have protection
 */
function checkAdminProtection() {
  const adminApiDir = path.join(process.cwd(), 'src', 'app', 'api', 'admin')
  
  if (fs.existsSync(adminApiDir)) {
    const files = fs.readdirSync(adminApiDir, { recursive: true }) as string[]
    
    for (const file of files) {
      if (file.endsWith('route.ts')) {
        const filePath = path.join(adminApiDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        
        if (!content.includes('requireAdmin') && !content.includes('admin')) {
          issues.push({
            severity: 'high',
            category: 'authorization',
            message: 'Admin route may be missing admin protection',
            file: path.relative(process.cwd(), filePath),
          })
        }
      }
    }
  }
}

/**
 * Check for hardcoded secrets in code
 */
function checkHardcodedSecrets() {
  const srcDir = path.join(process.cwd(), 'src')
  
  function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Check for potential API keys (simple pattern)
        const apiKeyPattern = /['"]sk-[a-zA-Z0-9]{32,}['"]/g
        if (apiKeyPattern.test(content)) {
          issues.push({
            severity: 'critical',
            category: 'secrets',
            message: 'Potential hardcoded API key found',
            file: path.relative(process.cwd(), filePath),
          })
        }
        
        // Check for hardcoded tokens
        const tokenPattern = /token\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi
        if (tokenPattern.test(content)) {
          issues.push({
            severity: 'high',
            category: 'secrets',
            message: 'Potential hardcoded token found',
            file: path.relative(process.cwd(), filePath),
          })
        }
      }
    }
  }
  
  if (fs.existsSync(srcDir)) {
    scanDirectory(srcDir)
  }
}

/**
 * Check production/dev separation
 */
function checkProductionSafety() {
  // Check travel-test page is blocked in production
  const travelTestPage = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'dashboard', 'travel-test', 'page.tsx')
  
  if (fs.existsSync(travelTestPage)) {
    const content = fs.readFileSync(travelTestPage, 'utf-8')
    
    if (!content.includes('NODE_ENV') && !content.includes('production')) {
      issues.push({
        severity: 'medium',
        category: 'production',
        message: 'Travel test page may not be blocked in production',
        file: path.relative(process.cwd(), travelTestPage),
      })
    }
  }
  
  // Check trigger routes are protected
  const triggerRoutes = [
    path.join(process.cwd(), 'src', 'app', 'api', 'trigger-all', 'route.ts'),
    path.join(process.cwd(), 'src', 'app', 'api', 'trigger-scan', 'route.ts'),
  ]
  
  for (const route of triggerRoutes) {
    if (fs.existsSync(route)) {
      const content = fs.readFileSync(route, 'utf-8')
      
      if (!content.includes('NODE_ENV') && !content.includes('requireAdmin')) {
        issues.push({
          severity: 'high',
          category: 'production',
          message: 'Trigger route may not be protected in production',
          file: path.relative(process.cwd(), route),
        })
      }
    }
  }
}

/**
 * Run all security checks
 */
function runAudit(): AuditResult {
  console.log('🔒 Running security audit...\n')
  
  checkEnvSecrets()
  checkDangerousLogs()
  checkAdminProtection()
  checkHardcodedSecrets()
  checkProductionSafety()
  
  const criticalIssues = issues.filter(i => i.severity === 'critical').length
  const highIssues = issues.filter(i => i.severity === 'high').length
  const mediumIssues = issues.filter(i => i.severity === 'medium').length
  const lowIssues = issues.filter(i => i.severity === 'low').length
  
  const result: AuditResult = {
    timestamp: new Date().toISOString(),
    passed: criticalIssues === 0 && highIssues === 0,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    issues,
  }
  
  return result
}

/**
 * Main execution
 */
function main() {
  const result = runAudit()
  
  // Print results
  console.log('📊 Security Audit Results:\n')
  console.log(`  Critical: ${result.criticalIssues}`)
  console.log(`  High: ${result.highIssues}`)
  console.log(`  Medium: ${result.mediumIssues}`)
  console.log(`  Low: ${result.lowIssues}`)
  console.log(`  Total: ${result.issues.length}\n`)
  
  if (result.issues.length > 0) {
    console.log('🔍 Issues Found:\n')
    
    for (const issue of result.issues) {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🔵'
      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}`)
      if (issue.file) {
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`)
      }
      console.log()
    }
  }
  
  // Save results
  const outputDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const outputPath = path.join(outputDir, 'security-audit-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
  console.log(`💾 Results saved to: ${outputPath}\n`)
  
  // Exit with appropriate code
  if (result.criticalIssues > 0) {
    console.log('❌ CRITICAL security issues found!')
    process.exit(1)
  } else if (result.highIssues > 0) {
    console.log('⚠️  HIGH severity issues found!')
    process.exit(1)
  } else if (result.mediumIssues > 0) {
    console.log('⚠️  Medium severity issues found - review recommended')
    process.exit(0)
  } else {
    console.log('✅ No critical or high severity issues found!')
    process.exit(0)
  }
}

main()
