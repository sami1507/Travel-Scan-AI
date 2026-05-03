# Travel Intelligence Agent

Production-ready AI agent for analyzing travel data signals and generating actionable insights.

## Architecture

- **Single-agent system** using OpenAI GPT-4o with structured outputs
- **Server-side only** - no client exposure of API keys
- **Modular design** - tools, schemas, and agent logic are separated
- **Extensible** - prepared for future multi-agent scenarios

## Components

### 1. Agent (`travel-intelligence-agent.ts`)
- Main agent class using OpenAI SDK
- Configured with professional travel analyst instructions
- Uses structured output with Zod schemas
- Temperature: 0.3 for consistent analysis

### 2. Tools (`tools.ts`)
- `TravelDataTools` class for data access
- Methods to fetch records, changes, and summaries
- Isolated from agent logic for reusability

### 3. Schemas (`schemas.ts`)
- Zod schemas for structured outputs
- `TravelInsight`: individual insight with severity, confidence, recommendations
- `TravelAnalysis`: complete analysis with multiple insights and priority actions

### 4. API Route (`/api/agent/analyze`)
- POST: Analyze recent data with optional filters
- GET: Analyze specific change types
- Authentication required
- Returns structured JSON

## Usage

### Trigger Analysis (POST)
```bash
curl -X POST http://localhost:3000/api/agent/analyze \
  -H "Content-Type: application/json" \
  -d '{"recordLimit": 50, "changeLimit": 100}'
```

### Analyze Changes (GET)
```bash
curl http://localhost:3000/api/agent/analyze?changeType=modified&limit=50
```

## Output Structure

```typescript
{
  success: true,
  analysis: {
    insights: [
      {
        summary: string,
        category: 'price_change' | 'availability' | 'weather_alert' | ...,
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
        recommendation: string,
        confidence: number, // 0-1
        relatedSourceIds?: string[],
        relatedRecordIds?: string[],
      }
    ],
    overallAssessment: string,
    priorityActions: string[],
    timestamp: string,
  },
  timestamp: string,
}
```

## Environment Variables

Required in `.env.local`:
```
OPENAI_API_KEY=sk-...
```

## Agent Behavior

The Travel Intelligence Agent is designed to be:
- **Calm and reliable** - not conversational or chatty
- **Data-driven** - focuses on meaningful signals
- **Decision-support oriented** - provides actionable recommendations
- **Confident** - includes confidence scores for assessments
- **Precise** - categorizes and prioritizes findings

## Future Extensions

The architecture supports:
- Additional specialized agents (e.g., Price Optimization Agent, Weather Alert Agent)
- Agent orchestration and delegation
- Custom tools for specific data sources
- Real-time streaming responses
- Agent memory and context persistence
