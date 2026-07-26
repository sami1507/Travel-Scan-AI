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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function deduplicateByDomain(results: any[]): any[] {
  const seen = new Set<string>()
  return results.filter((r: any) => {
    if (!r.url) return true
    const domain = extractDomain(r.url)
    if (seen.has(domain)) return false
    seen.add(domain)
    return true
  })
}

export async function searchTravelContext(
  request: {
    destination?: string
    departureCity?: string
    passportCountry?: string
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

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthsText = request.travelMonths && request.travelMonths.length > 0
    ? request.travelMonths.map(m => monthNames[m - 1]).join(' ')
    : ''
  const monthContext = monthsText ? `${monthsText} ${year}` : String(year)

  const passportContext = request.passportCountry
    ? `${request.passportCountry} passport`
    : request.departureCity
      ? `travelers from ${request.departureCity}`
      : 'international travelers'

  try {
    // Dynamically import to avoid build-time issues if package is optional
    const { tavily } = await import('@tavily/core')
    const client = tavily({ apiKey })

    const [overviewResult, visaResult, safetyResult] = await Promise.allSettled([
      client.search(
        `${destination} travel ${monthContext} budget ${request.budget || 'moderate'} tips best time visit`,
        { searchDepth: 'advanced', maxResults: 5 }
      ),
      client.search(
        `${destination} visa requirements ${passportContext} ${year} entry rules tourist`,
        { searchDepth: 'advanced', maxResults: 5 }
      ),
      client.search(
        `${destination} safety travel advisory ${monthContext} tourist areas ${interestsList}`,
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
      const results = deduplicateByDomain(overviewResult.value.results || [])
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
      const results = deduplicateByDomain(visaResult.value.results || [])
      allSources.push(...extractSources(results))
      currentVisaInfo = extractContent(results).slice(0, 500)
    }

    // Extract safety & hidden gems from third query
    let hiddenGems = ''
    if (safetyResult.status === 'fulfilled') {
      const dedupedResults = deduplicateByDomain(safetyResult.value.results || [])
      allSources.push(...extractSources(dedupedResults))
      const combined = extractContent(dedupedResults)
      safetyAndAdvisories = safetyAndAdvisories || combined.slice(0, 400)
      hiddenGems = combined.slice(400, 700)
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
