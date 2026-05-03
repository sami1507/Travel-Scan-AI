# Travel Intelligence System - Quick Reference

## Architecture

```
User Request
    ↓
API Route (/api/intelligence/report)
    ↓
Intelligence Agent
    ↓
┌─────────────────────────────────────┐
│  1. DATA ACCESS LAYER               │
│  - Fetch normalized records         │
│  - Fetch change events              │
│  - Get source information           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  2. METRICS LAYER (Deterministic)   │
│  - Price change %                   │
│  - Volatility score                 │
│  - Opportunity score                │
│  - Risk score                       │
│  - Source confidence                │
│  - Data completeness                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  3. RULES LAYER (Reduce Hallucination) │
│  - Significance thresholds          │
│  - Confidence adjustments           │
│  - Evidence validation              │
│  - Maximum confidence enforcement   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. AGENT LAYER (AI Interpretation) │
│  - OpenAI GPT-4o (temp: 0.2)       │
│  - Structured output (Zod)          │
│  - Evidence-based analysis          │
│  - Gap acknowledgment               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  5. VERIFIER LAYER                  │
│  - Validate evidence strength       │
│  - Downgrade confidence if needed   │
│  - Enforce maximum confidence       │
└─────────────────────────────────────┘
    ↓
Structured Intelligence Report
```

## Core Principle

**The AI interprets facts, never invents facts.**

## Key Files

- `metrics.ts` - Deterministic calculations
- `rules.ts` - Rule-based logic
- `schemas.ts` - Zod schemas for structured output
- `tools.ts` - Data access layer
- `agent.ts` - Evidence-based AI agent
- `index.ts` - Module exports

## Usage

### Server-side (API Route):
```typescript
import { getTravelIntelligenceAgent } from '@/lib/intelligence'

const agent = getTravelIntelligenceAgent()
const report = await agent.generateIntelligenceReport({
  recordLimit: 100,
  changeLimit: 200,
})
```

### Client-side (UI):
```typescript
const response = await fetch('/api/intelligence/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recordLimit: 100, changeLimit: 200 }),
})
const { report } = await response.json()
```

## Output Structure

```typescript
{
  insights: [
    {
      summary: string
      category: 'opportunity' | 'risk' | 'monitoring' | 'mixed'
      severity: 'info' | 'important' | 'urgent'
      recommendation: string
      confidence: 'low' | 'medium' | 'high'
      facts: string[]
      evidence: Evidence[]
      unsupportedGaps: string[]
      reasoning: string
    }
  ],
  topOpportunities: string[],
  topRisks: string[],
  recommendedActions: string[],
  overallAssessment: string,
  dataQuality: {
    sourceConfidence: number,
    dataCompleteness: number,
    lastUpdated: string,
  }
}
```

## Hallucination Prevention

1. **Pre-computed metrics** - No calculations by AI
2. **Rule-based thresholds** - Deterministic logic
3. **Evidence requirements** - 3+ items for high confidence
4. **Gap acknowledgment** - Missing data stated explicitly
5. **Confidence enforcement** - Maximum based on data quality
6. **Structured outputs** - Zod validation
7. **Low temperature** - 0.2 for consistency

## Confidence Levels

- **High**: 3+ evidence items, source confidence > 70%, data completeness > 80%
- **Medium**: 2+ evidence items, source confidence > 60%, data completeness > 70%
- **Low**: < 2 evidence items OR low data quality

## Environment Variables

```
OPENAI_API_KEY=sk-...
```

## Testing

```bash
# Generate report via API
curl -X POST http://localhost:3000/api/intelligence/report \
  -H "Content-Type: application/json" \
  -d '{"recordLimit": 100, "changeLimit": 200}'

# View in UI
# Navigate to: http://localhost:3000/dashboard/intelligence
```

## Extending

### Add New Metric:
1. Add calculation to `metrics.ts`
2. Update `TravelMetrics` interface
3. Use in rules or agent context

### Add New Rule:
1. Add logic to `rules.ts`
2. Update `RuleOutput` interface
3. Apply in agent context preparation

### Add New Tool:
1. Add method to `IntelligenceDataTools` class
2. Export in `tools.ts`
3. Use in agent or API routes

### Add New Schema:
1. Define Zod schema in `schemas.ts`
2. Export type
3. Use in agent structured output
