import { logInfo, logWarning } from '../error-logger'

export interface TravelSearchContext {
  destinationOverview: string
  currentVisaInfo: string
  budgetReality: string
  bestTimeToVisit: string
  safetyAndAdvisories: string
  hiddenGems: string
  sources: string[]
  searchSuccess: boolean
}

const EMPTY_CONTEXT: TravelSearchContext = {
  destinationOverview: '',
  currentVisaInfo: '',
  budgetReality: '',
  bestTimeToVisit: '',
  safetyAndAdvisories: '',
  hiddenGems: '',
  sources: [],
  searchSuccess: false,
}

function extractContent(results: any[]): string {
  return results
    .map((r: any) => r.content || r.snippet || '')
    .filter(Boolean)
    .join(' ')
    .slice(0, 1000)
}

function extractSources(results: any[]): string[] {
  return results
    .map((r: any) => r.url)
    .filter(Boolean)
}

export async function searchTravelContext(
  request: {
    destination?: string
    departureCity?: string
    budget?: string
    tripLength?: number
    travelMonths?: number[]
    interests?: string[]
  }
): Promise<TravelSearchContext> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey || apiKey.length <= 10) {
    return EMPTY_CONTEXT
  }

  const destination = request.destination || 'Europe'
  const year = new Date().getFullYear()
  const interestsList = request.interests?.join(' ') || 'culture food sightseeing'

  try {
    // Dynamically import to avoid build-time issues if package is optional
    const { tavily } = await import('@tavily/core')
    const client = tavily({ apiKey })

    const [overviewResult, visaResult, gemsResult] = await Promise.allSettled([
      client.search(
        `${destination} travel guide ${year} budget tips best time visit`,
        { searchDepth: 'advanced', maxResults: 5 }
      ),
      client.search(
        `${destination} visa requirements US passport 2025 2026`,
        { searchDepth: 'advanced', maxResults: 5 }
      ),
      client.search(
        `${destination} hidden gems local tips travel ${interestsList}`,
        { searchDepth: 'advanced', maxResults: 5 }
      ),
    ])

    const allSources: string[] = []

    // Extract overview, budget, best time from first query
    let destinationOverview = ''
    let budgetReality = ''
    let bestTimeToVisit = ''
    let safetyAndAdvisories = ''
    if (overviewResult.status === 'fulfilled') {
      const results = overviewResult.value.results || []
      const combined = extractContent(results)
      allSources.push(...extractSources(results))
      destinationOverview = combined.slice(0, 400)
      budgetReality = combined.slice(400, 700)
      bestTimeToVisit = combined.slice(700, 900)
      safetyAndAdvisories = overviewResult.value.answer || ''
    }

    // Extract visa info from second query
    let currentVisaInfo = ''
    if (visaResult.status === 'fulfilled') {
      const results = visaResult.value.results || []
      allSources.push(...extractSources(results))
      currentVisaInfo = extractContent(results).slice(0, 500)
    }

    // Extract hidden gems from third query
    let hiddenGems = ''
    if (gemsResult.status === 'fulfilled') {
      const results = gemsResult.value.results || []
      allSources.push(...extractSources(results))
      hiddenGems = extractContent(results).slice(0, 400)
    }

    const uniqueSources = [...new Set(allSources)]

    logInfo('Tavily search completed', {
      destination,
      sourcesCount: uniqueSources.length,
    })

    return {
      destinationOverview,
      currentVisaInfo,
      budgetReality,
      bestTimeToVisit,
      safetyAndAdvisories,
      hiddenGems,
      sources: uniqueSources,
      searchSuccess: true,
    }
  } catch (error) {
    logWarning('Tavily search failed, returning empty context', {
      destination,
      error: error instanceof Error ? error.message : String(error),
    })
    return EMPTY_CONTEXT
  }
}
