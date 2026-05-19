#!/usr/bin/env tsx
// Check OpenAI schema compatibility
// Detects .optional() fields that should be .nullable() for OpenAI structured outputs

import { z } from 'zod'
import { travelAnalysisResponseSchema, rankedDestinationSchema } from '../src/lib/analysis/schemas'
import { compactAnalysisResponseSchema } from '../src/lib/analysis/compact-schema'

function checkSchemaForOptional(schema: z.ZodTypeAny, path: string = 'root'): string[] {
  const issues: string[] = []

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    for (const [key, value] of Object.entries(shape)) {
      const fieldPath = `${path}.${key}`
      
      if (value instanceof z.ZodOptional) {
        issues.push(`❌ ${fieldPath} uses .optional() - should use .nullable() for OpenAI`)
      }
      
      // Recursively check nested objects
      if (value instanceof z.ZodObject || value instanceof z.ZodArray) {
        issues.push(...checkSchemaForOptional(value, fieldPath))
      }
      
      // Check inside optional/nullable wrappers
      if (value instanceof z.ZodOptional || value instanceof z.ZodNullable) {
        issues.push(...checkSchemaForOptional(value.unwrap(), fieldPath))
      }
    }
  } else if (schema instanceof z.ZodArray) {
    issues.push(...checkSchemaForOptional(schema.element, `${path}[]`))
  }

  return issues
}

console.log('🔍 Checking OpenAI schema compatibility...\n')

console.log('Checking travelAnalysisResponseSchema:')
const fullSchemaIssues = checkSchemaForOptional(travelAnalysisResponseSchema, 'travelAnalysisResponse')
if (fullSchemaIssues.length === 0) {
  console.log('✅ No .optional() issues found\n')
} else {
  console.log(`Found ${fullSchemaIssues.length} issues:`)
  fullSchemaIssues.forEach(issue => console.log(issue))
  console.log()
}

console.log('Checking compactAnalysisResponseSchema:')
const compactSchemaIssues = checkSchemaForOptional(compactAnalysisResponseSchema, 'compactAnalysisResponse')
if (compactSchemaIssues.length === 0) {
  console.log('✅ No .optional() issues found\n')
} else {
  console.log(`Found ${compactSchemaIssues.length} issues:`)
  compactSchemaIssues.forEach(issue => console.log(issue))
  console.log()
}

const totalIssues = fullSchemaIssues.length + compactSchemaIssues.length
if (totalIssues === 0) {
  console.log('✅ All schemas are OpenAI compatible')
  process.exit(0)
} else {
  console.log(`❌ Found ${totalIssues} total issues`)
  process.exit(1)
}
