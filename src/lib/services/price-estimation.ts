import { logInfo, logWarning } from '../error-logger'

export interface PriceEstimate {
  flightPriceRange: { min: number; max: number; currency: string }
  flightTypicalAirlines: string[]
  hotelPriceRange: { min: number; max: number; currency: string; perNight: true }
  hotelTypicalOptions: string[]
  confidence: 'high' | 'medium' | 'low'
  source: 'ai_estimated_from_web_search'
  lastUpdated: string
}

// Fallback ranges by region — low confidence only, used when Tavily/OpenAI are unavailable
const FALLBACK_RANGES: Record<string, { flight: { min: number; max: number }; hotel: { min: number; max: number } }> = {
  western_europe:  { flight: { min: 400, max: 900 },  hotel: { min: 80,  max: 220 } },
  southern_europe: { flight: { min: 350, max: 800 },  hotel: { min: 55,  max: 150 } },
  eastern_europe:  { flight: { min: 350, max: 750 },  hotel: { min: 35,  max: 100 } },
  southeast_asia:  { flight: { min: 600, max: 1400 }, hotel: { min: 25,  max: 90  } },
  east_asia:       { flight: { min: 700, max: 1600 }, hotel: { min: 60,  max: 200 } },
  south_asia:      { flight: { min: 600, max: 1300 }, hotel: { min: 30,  max: 120 } },
  middle_east:     { flight: { min: 600, max: 1400 }, hotel: { min: 80,  max: 300 } },
  north_america:   { flight: { min: 200, max: 600 },  hotel: { min: 100, max: 300 } },
  south_america:   { flight: { min: 500, max: 1200 }, hotel: { min: 40,  max: 150 } },
  africa:          { flight: { min: 700, max: 1800 }, hotel: { min: 50,  max: 200 } },
  oceania:         { flight: { min: 900, max: 2200 }, hotel: { min: 100, max: 300 } },
  default:         { flight: { min: 500, max: 1200 }, hotel: { min: 60,  max: 180 } },
}

const BUDGET_HOTEL_MULTIPLIERS: Record<string, number> = {
  budget:      0.65,
  moderate:    1.00,
  comfortable: 1.60,
  luxury:      2.60,
}

function inferRegion(destination: string): string {
  const d = destination.toLowerCase()
  if (/france|paris|london|uk|england|amsterdam|netherlands|berlin|germany|zurich|switzerland|vienna|austria|brussels|belgium/.test(d))
    return 'western_europe'
  if (/spain|madrid|barcelona|rome|italy|lisbon|portugal|athens|greece|croatia|malta|sicily/.test(d))
    return 'southern_europe'
  if (/prague|czech|poland|warsaw|budapest|hungary|bucharest|romania|sofia|bulgaria|ukraine|krakow/.test(d))
    return 'eastern_europe'
  if (/bangkok|thailand|bali|indonesia|singapore|vietnam|cambodia|malaysia|kuala lumpur|philippines|myanmar|hanoi|ho chi minh/.test(d))
    return 'southeast_asia'
  if (/tokyo|japan|beijing|china|shanghai|seoul|korea|hong kong|taiwan/.test(d))
    return 'east_asia'
  if (/delhi|india|mumbai|nepal|sri lanka|bangladesh/.test(d))
    return 'south_asia'
  if (/dubai|uae|abu dhabi|doha|qatar|riyadh|saudi|istanbul|turkey/.test(d))
    return 'middle_east'
  if (/new york|los angeles|chicago|miami|canada|toronto|mexico|cancun/.test(d))
    return 'north_america'
  if (/brazil|rio|buenos aires|argentina|peru|lima|colombia|chile|bogota/.test(d))
    return 'south_america'
  if (/africa|kenya|morocco|egypt|south africa|tanzania|nairobi|marrakech/.test(d))
    return 'africa'
  if (/australia|sydney|melbourne|new zealand|auckland|queenstown/.test(d))
    return 'oceania'
  return 'default'
}

// Module-level cache: avoids redundant Tavily API calls for the same route within 1 hour
const estimateCache = new Map<string, { estimate: PriceEstimate; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

export async function estimatePricing(
  origin: string,
  destination: string,
  budget: string,
  tripLength: number
): Promise<PriceEstimate> {
  const cacheKey = `${origin}:${destination}:${budget}`
  const cached = estimateCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.estimate
  }

  const lastUpdated = new Date().toISOString()
  const tavilyKey = process.env.TAVILY_API_KEY

  if (!tavilyKey || tavilyKey.length <= 10) {
    return buildFallbackEstimate(destination, budget, lastUpdated, 'no_tavily_key')
  }

  try {
    const { tavily } = await import('@tavily/core')
    const client = tavily({ apiKey: tavilyKey })
    const year = new Date().getFullYear()

    // 8-second timeout so price estimation doesn't block the main analysis
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('price-estimation timeout')), 8000)
    )

    const searchPromise = Promise.allSettled([
      client.search(
        `${origin} to ${destination} flight price ${year} average cost cheapest round trip`,
        { searchDepth: 'basic', maxResults: 4 }
      ),
      client.search(
        `${destination} hotel price per night ${budget} budget ${year}`,
        { searchDepth: 'basic', maxResults: 4 }
      ),
    ])

    const results = (await Promise.race([searchPromise, timeoutPromise])) as PromiseSettledResult<any>[]
    const [flightResult, hotelResult] = results

    const flightSnippets = flightResult.status === 'fulfilled'
      ? (flightResult.value.results || []).map((r: any) => (r.content || r.snippet || '')).filter(Boolean).join(' ').slice(0, 700)
      : ''

    const hotelSnippets = hotelResult.status === 'fulfilled'
      ? (hotelResult.value.results || []).map((r: any) => (r.content || r.snippet || '')).filter(Boolean).join(' ').slice(0, 700)
      : ''

    const sourcesFound =
      (flightResult.status === 'fulfilled' ? (flightResult.value.results?.length ?? 0) : 0) +
      (hotelResult.status === 'fulfilled' ? (hotelResult.value.results?.length ?? 0) : 0)

    if (!flightSnippets && !hotelSnippets) {
      return buildFallbackEstimate(destination, budget, lastUpdated, 'no_snippets')
    }

    // Use gpt-4o-mini to extract structured ranges from the snippets
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey && (openaiKey.startsWith('sk-') || openaiKey.startsWith('sk-proj-'))) {
      try {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: openaiKey })

        const prompt =
          `Extract realistic price ranges from these web search snippets.\n` +
          `Route: ${origin} → ${destination}, trip: ${tripLength} days, budget tier: ${budget}\n\n` +
          `FLIGHT SEARCH RESULTS:\n${flightSnippets || '(none)'}\n\n` +
          `HOTEL SEARCH RESULTS:\n${hotelSnippets || '(none)'}\n\n` +
          `Respond ONLY with valid JSON, no markdown:\n` +
          `{"flightMin":number,"flightMax":number,"flightAirlines":["str"],"hotelMin":number,"hotelMax":number,"hotelTypes":["str"],"confidence":"high"|"medium"|"low"}`

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 220,
          temperature: 0,
        })

        const raw = (completion.choices[0]?.message?.content ?? '').trim()
        const parsed = JSON.parse(raw)

        const estimate: PriceEstimate = {
          flightPriceRange: {
            min: Math.max(50, Math.round(parsed.flightMin)),
            max: Math.max(100, Math.round(parsed.flightMax)),
            currency: 'USD',
          },
          flightTypicalAirlines: Array.isArray(parsed.flightAirlines) ? parsed.flightAirlines.slice(0, 3) : [],
          hotelPriceRange: {
            min: Math.max(10, Math.round(parsed.hotelMin)),
            max: Math.max(20, Math.round(parsed.hotelMax)),
            currency: 'USD',
            perNight: true,
          },
          hotelTypicalOptions: Array.isArray(parsed.hotelTypes) ? parsed.hotelTypes.slice(0, 3) : [],
          confidence: parsed.confidence ?? (sourcesFound >= 5 ? 'medium' : 'low'),
          source: 'ai_estimated_from_web_search',
          lastUpdated,
        }

        estimateCache.set(cacheKey, { estimate, expiresAt: Date.now() + CACHE_TTL_MS })
        logInfo('Price estimation via Tavily+OpenAI', { destination, origin, confidence: estimate.confidence, sourcesFound })
        return estimate
      } catch (openaiErr) {
        logWarning('OpenAI price extraction failed, using static fallback', {
          destination,
          error: openaiErr instanceof Error ? openaiErr.message : String(openaiErr),
        })
      }
    }

    // Tavily data found but OpenAI unavailable — fall back to table
    return buildFallbackEstimate(destination, budget, lastUpdated, 'no_openai')
  } catch (err) {
    logWarning('Price estimation failed entirely, using static fallback', {
      destination,
      error: err instanceof Error ? err.message : String(err),
    })
    return buildFallbackEstimate(destination, budget, lastUpdated, 'error')
  }
}

function buildFallbackEstimate(
  destination: string,
  budget: string,
  lastUpdated: string,
  reason: string
): PriceEstimate {
  const region = inferRegion(destination)
  const ranges = FALLBACK_RANGES[region] ?? FALLBACK_RANGES.default
  const mult = BUDGET_HOTEL_MULTIPLIERS[budget] ?? 1.0

  logInfo('Price estimation using static fallback table', { destination, region, reason })

  return {
    flightPriceRange: {
      min: Math.round(ranges.flight.min * 0.9),
      max: Math.round(ranges.flight.max * 1.1),
      currency: 'USD',
    },
    flightTypicalAirlines: [],
    hotelPriceRange: {
      min: Math.round(ranges.hotel.min * mult * 0.9),
      max: Math.round(ranges.hotel.max * mult * 1.1),
      currency: 'USD',
      perNight: true,
    },
    hotelTypicalOptions: [],
    confidence: 'low',
    source: 'ai_estimated_from_web_search',
    lastUpdated,
  }
}
