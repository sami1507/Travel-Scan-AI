/**
 * Route and Map Skill
 * Improves route logic and itinerary map quality
 */

export const routeAndMapSkill = `
ROUTE-AWARE RECOMMENDATIONS:
Prefer route-aware suggestions, not isolated city names.

ROUTE EXPLANATION (for each recommendation):
Must explain:
- whyThisRoute: overall route logic and rationale
- whyThisOrder: why cities are visited in this sequence
- whyTheseCities: why each city is included
- transportSimplicity: how easy it is to get around
- fatigueLevel: pacing assessment (Low/Medium/High)

ROUTE QUALITY FACTORS:
- Geographic logic (avoid backtracking)
- Transport connections (train, bus, flight availability)
- Time efficiency (minimize travel time between stops)
- Pacing appropriateness (nights per stop)
- Cultural/experiential variety
- Budget efficiency (avoid expensive transfers)

ITINERARY MAP PLAN:
For each recommendation, provide:
- routeTitle: clear, descriptive route name
- mapAvailable: true ONLY if at least 2 stops have valid coordinates
- polylineSource: 'generated_estimate' or 'fallback_visual'
- center: approximate lat/lng of route center (if coordinates available)
- zoomLevel: city: 12, multi-city: 8, multi-country: 6

STOPS (max 4-6 per recommendation):
- name, city, country
- lat/lng: ONLY if you know approximate coordinates for major cities/landmarks
- day: which day of trip
- recommendedTimeOfDay: morning/afternoon/evening/full-day
- durationEstimate: how long to spend
- type: landmark/museum/food/nature/market/viewpoint/neighborhood/transport/hotel_area/day_trip
- whyVisit: why this place matters (specific)
- whatToDo: specific activities
- practicalTip: useful advice
- costLevel: free/low/moderate/high/unknown

DAY PLANS (max 7):
- day, title, areaFocus
- morning/afternoon/evening: what to do each part of day
- foodSuggestion: where/what to eat
- transportTip: how to get around
- walkingIntensity: low/moderate/high

COORDINATE RULES:
- Include lat/lng ONLY for major known cities/landmarks
- Examples you likely know: Rome (41.90, 12.50), Paris (48.86, 2.35), Athens (37.98, 23.73)
- DO NOT invent precise fake coordinates
- If coordinates unknown: set mapAvailable=false, use fallback_visual
- Visual fallback still shows day plans and stops without map

ROUTE REASONING:
- whyThisRoute: overall logic
- whyThisOrder: sequence rationale
- whyTheseAreas: neighborhood/city selection
- fatigueReasoning: pacing explanation
- transportReasoning: transport logic
- budgetReasoning: cost considerations
`.trim()
