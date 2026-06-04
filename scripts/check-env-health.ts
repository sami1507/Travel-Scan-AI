/**
 * Environment Variable Health Check
 * Validates required env variables without printing secrets
 */

interface EnvCheck {
  name: string
  required: boolean
  present: boolean
  formatValid: boolean
  notes?: string
}

function checkEnvHealth(): { passed: boolean; checks: EnvCheck[] } {
  const checks: EnvCheck[] = []

  // OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  checks.push({
    name: 'OPENAI_API_KEY',
    required: true,
    present: !!openaiKey,
    formatValid: openaiKey ? openaiKey.startsWith('sk-') : false,
    notes: openaiKey ? `${openaiKey.length} chars` : undefined,
  })

  // Anthropic/Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  checks.push({
    name: 'ANTHROPIC_API_KEY',
    required: false,
    present: !!anthropicKey,
    formatValid: anthropicKey ? anthropicKey.startsWith('sk-ant-') : true,
    notes: anthropicKey ? `${anthropicKey.length} chars` : 'optional',
  })

  const claudeModel = process.env.CLAUDE_MODEL
  checks.push({
    name: 'CLAUDE_MODEL',
    required: false,
    present: !!claudeModel,
    formatValid: claudeModel ? claudeModel.includes('claude') : true,
    notes: claudeModel || 'optional',
  })

  const enableClaude = process.env.ENABLE_CLAUDE_VERIFIER
  checks.push({
    name: 'ENABLE_CLAUDE_VERIFIER',
    required: false,
    present: !!enableClaude,
    formatValid: enableClaude ? ['true', 'false'].includes(enableClaude) : true,
    notes: enableClaude || 'defaults to false',
  })

  // Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    present: !!supabaseUrl,
    formatValid: supabaseUrl ? supabaseUrl.includes('supabase.co') : false,
    notes: supabaseUrl ? 'valid URL' : undefined,
  })

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    present: !!supabaseAnonKey,
    formatValid: supabaseAnonKey ? supabaseAnonKey.startsWith('eyJ') : false,
    notes: supabaseAnonKey ? `${supabaseAnonKey.length} chars` : undefined,
  })

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  checks.push({
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    present: !!supabaseServiceKey,
    formatValid: supabaseServiceKey ? supabaseServiceKey.startsWith('eyJ') : true,
    notes: supabaseServiceKey ? `${supabaseServiceKey.length} chars` : 'optional for admin',
  })

  // Upstash Redis/KV
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  checks.push({
    name: 'UPSTASH_REDIS_REST_URL',
    required: false,
    present: !!upstashUrl,
    formatValid: upstashUrl ? upstashUrl.includes('upstash.io') : true,
    notes: upstashUrl ? 'valid URL' : 'optional for cache',
  })

  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
  checks.push({
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: false,
    present: !!upstashToken,
    formatValid: upstashToken ? upstashToken.length > 20 : true,
    notes: upstashToken ? `${upstashToken.length} chars` : 'optional for cache',
  })

  // Google Maps
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  checks.push({
    name: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    required: false,
    present: !!googleMapsKey,
    formatValid: googleMapsKey ? googleMapsKey.startsWith('AIza') : true,
    notes: googleMapsKey ? `${googleMapsKey.length} chars` : 'optional for maps',
  })

  // Flags
  const disableCache = process.env.DISABLE_ANALYSIS_CACHE
  checks.push({
    name: 'DISABLE_ANALYSIS_CACHE',
    required: false,
    present: !!disableCache,
    formatValid: disableCache ? ['true', 'false'].includes(disableCache) : true,
    notes: disableCache || 'defaults to false',
  })

  const passed = checks.every(c => !c.required || (c.present && c.formatValid))

  return { passed, checks }
}

// Run check
console.log('🔍 Environment Variable Health Check\n')

const result = checkEnvHealth()

console.log('Required Variables:')
result.checks
  .filter(c => c.required)
  .forEach(c => {
    const status = c.present && c.formatValid ? '✅' : '❌'
    const detail = c.notes || (c.present ? 'present' : 'MISSING')
    console.log(`  ${status} ${c.name}: ${detail}`)
  })

console.log('\nOptional Variables:')
result.checks
  .filter(c => !c.required)
  .forEach(c => {
    const status = !c.present ? '⚪' : c.formatValid ? '✅' : '⚠️'
    const detail = c.notes || 'not set'
    console.log(`  ${status} ${c.name}: ${detail}`)
  })

console.log()

if (result.passed) {
  console.log('✅ All required environment variables are present and valid')
  process.exit(0)
} else {
  console.log('❌ Some required environment variables are missing or invalid')
  process.exit(1)
}
