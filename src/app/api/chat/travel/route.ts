import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are a friendly AI travel consultant. Extract travel parameters from the conversation.

When you have enough information (at minimum: some destination interest or type, budget level, and approximate timing), respond with ONLY this JSON:
{
  "action": "analyze",
  "params": {
    "query": "brief 2-4 word trip description",
    "departureCity": "city name, or empty string if unknown",
    "budget": "low" or "moderate" or "high" or "luxury",
    "tripLength": number of days (default 7 if not mentioned),
    "travelMonths": [array of month numbers 1-12, e.g. [6] for June],
    "interests": ["array", "of", "interests"],
    "tripStructure": "single_country_one_city" or "single_country_multi_city" or "multi_country"
  }
}

If you need ONE more key piece of information, respond with ONLY this JSON:
{
  "action": "ask",
  "message": "your friendly, concise question (one question only)"
}

Rules:
- Always respond with valid JSON only — no markdown, no extra text
- Ask at most 1-2 questions before triggering an analysis
- Infer tripStructure from trip length: ≤5 days = single_country_one_city, 6-14 = single_country_multi_city, 15+ = multi_country
- If departure city is not mentioned, use empty string
- Default travelMonths to next 3 months if not specified
- Respond in the same language the user writes in`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as {
      messages: Array<{ role: string; content: string }>
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { action: 'ask', message: "I'm not configured yet — please set ANTHROPIC_API_KEY." },
      )
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Extract JSON block — handle potential markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ action: 'ask', message: text })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[chat/travel]', err)
    return NextResponse.json({
      action: 'ask',
      message:
        "I had a little trouble with that. Could you tell me where you'd like to go, roughly when, and your budget?",
    })
  }
}
