// Text normalization utilities to fix broken spacing and formatting

export function normalizeGeneratedText(text: string | null | undefined): string | null {
  if (!text) return null
  
  let normalized = text
  
  // Fix broken spacing patterns
  const brokenWordPatterns: Record<string, string> = {
    'wi th': 'with',
    'be autiful': 'beautiful',
    'we ather': 'weather',
    'accommo dation': 'accommodation',
    'trans port': 'transport',
    'recommen dation': 'recommendation',
    'Med iterranean': 'Mediterranean',
    'dest ination': 'destination',
    'trav el': 'travel',
    'vis it': 'visit',
    'cit y': 'city',
    'count ry': 'country',
    'rout e': 'route',
    'nigh t': 'night',
    'day s': 'days',
    'bud get': 'budget',
    'pric e': 'price',
    'cost s': 'costs',
    'fligh t': 'flight',
    'hote l': 'hotel',
    'foo d': 'food',
    'cultur e': 'culture',
    'histor y': 'history',
    'natur e': 'nature',
    'beac h': 'beach',
    'mount ain': 'mountain',
    'sea son': 'season',
    'summ er': 'summer',
    'wint er': 'winter',
    'sprin g': 'spring',
    'autum n': 'autumn',
  }
  
  // Apply broken word fixes
  for (const [broken, fixed] of Object.entries(brokenWordPatterns)) {
    const regex = new RegExp(broken, 'gi')
    normalized = normalized.replace(regex, fixed)
  }
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s{2,}/g, ' ')
  
  // Fix spacing around punctuation
  normalized = normalized.replace(/\s+([.,!?;:])/g, '$1')
  normalized = normalized.replace(/([.,!?;:])\s{2,}/g, '$1 ')
  
  // Trim
  normalized = normalized.trim()
  
  return normalized
}

export function normalizeRecommendation(rec: any): any {
  return {
    ...rec,
    destinationSummary: normalizeGeneratedText(rec.destinationSummary),
    whyRecommended: rec.whyRecommended?.map((r: string) => normalizeGeneratedText(r) || r) || [],
    possibleDownsides: rec.possibleDownsides?.map((d: string) => normalizeGeneratedText(d) || d) || [],
    realisticConsultantNotes: normalizeGeneratedText(rec.realisticConsultantNotes),
    routeWarnings: rec.routeWarnings?.map((w: string) => normalizeGeneratedText(w) || w) || [],
    transportLogic: normalizeGeneratedText(rec.transportLogic),
    seasonality: rec.seasonality ? {
      ...rec.seasonality,
      weatherReality: normalizeGeneratedText(rec.seasonality.weatherReality),
      crowdReality: normalizeGeneratedText(rec.seasonality.crowdReality),
      priceReality: normalizeGeneratedText(rec.seasonality.priceReality),
      honestConsultantNote: normalizeGeneratedText(rec.seasonality.honestConsultantNote),
    } : null,
  }
}
