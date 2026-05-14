/**
 * Test OpenAI provider initialization
 * NEVER logs the actual API key - only safe diagnostics
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local')
let apiKey = process.env.OPENAI_API_KEY

try {
  const envFile = readFileSync(envPath, 'utf-8')
  const lines = envFile.split('\n')
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    
    const [key, ...valueParts] = trimmedLine.split('=')
    let value = valueParts.join('=').trim()
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    if (key.trim() === 'OPENAI_API_KEY') {
      apiKey = value
    }
  }
} catch (error) {
  // .env.local not found, use process.env
}

// Sanitize API key
if (apiKey) {
  apiKey = apiKey.trim()
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || 
      (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1)
  }
}

async function testOpenAIProvider() {
  console.log('\n================================================================================')
  console.log('OPENAI PROVIDER TEST')
  console.log('================================================================================\n')

  // Safe diagnostics (NEVER log the actual key)
  const keyPresent = !!apiKey
  const keyLengthValid = apiKey ? apiKey.length > 20 : false
  const keyFormatValid = apiKey ? (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-')) : false
  
  console.log('📋 Environment Check:')
  console.log(`   Key Present: ${keyPresent ? '✅ YES' : '❌ NO'}`)
  console.log(`   Key Length Valid (>20): ${keyLengthValid ? '✅ YES' : '❌ NO'}`)
  console.log(`   Key Format Valid (sk-* or sk-proj-*): ${keyFormatValid ? '✅ YES' : '❌ NO'}`)
  console.log(`   Runtime: ${typeof window === 'undefined' ? 'server' : 'client'}`)
  console.log()

  if (!apiKey || !keyLengthValid || !keyFormatValid) {
    console.log('❌ OPENAI_API_KEY is invalid or not set')
    console.log()
    console.log('Expected format:')
    console.log('  - Starts with: sk- or sk-proj-')
    console.log('  - Length: > 20 characters')
    console.log('  - No surrounding quotes or whitespace')
    console.log()
    console.log('To fix:')
    console.log('  1. Check .env.local file')
    console.log('  2. Ensure OPENAI_API_KEY=sk-...')
    console.log('  3. No quotes around the value')
    console.log('  4. For Vercel: Set in Environment Variables and redeploy')
    console.log()
    return false
  }

  console.log('🔧 Attempting OpenAI client initialization...')
  
  try {
    const client = new OpenAI({ apiKey })
    console.log('✅ OpenAI client created successfully')
    console.log()

    console.log('🧪 Testing API connection with minimal request...')
    
    try {
      // Make a tiny test request to verify the key works
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini', // Use cheapest model for testing
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "OK" if you can read this.' }
        ],
        max_tokens: 5,
        temperature: 0,
      })

      const response = completion.choices[0]?.message?.content || ''
      console.log(`✅ API test successful`)
      console.log(`   Response: "${response.trim()}"`)
      console.log(`   Tokens used: ${completion.usage?.total_tokens || 0}`)
      console.log()
      
      return true
    } catch (apiError: any) {
      console.log('❌ API test failed')
      console.log(`   Error: ${apiError.message}`)
      
      if (apiError.status === 401) {
        console.log('   Reason: Invalid API key (401 Unauthorized)')
      } else if (apiError.status === 429) {
        console.log('   Reason: Rate limit or quota exceeded')
      } else if (apiError.status === 500) {
        console.log('   Reason: OpenAI server error')
      }
      
      console.log()
      return false
    }
  } catch (error: any) {
    console.log('❌ Failed to initialize OpenAI client')
    console.log(`   Error: ${error.message}`)
    console.log()
    return false
  }
}

testOpenAIProvider()
  .then((success) => {
    console.log('================================================================================')
    if (success) {
      console.log('✅ OPENAI PROVIDER IS WORKING')
      console.log('   The API key is valid and the provider is ready to use.')
    } else {
      console.log('❌ OPENAI PROVIDER IS NOT WORKING')
      console.log('   Fix the issues above and try again.')
    }
    console.log('================================================================================\n')
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
