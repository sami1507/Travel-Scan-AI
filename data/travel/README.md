# TravelScan AI - Travel Data Foundation

## Purpose

This dataset forms the **data foundation** for the TravelScan AI graduation project. It supports the AI Travel Consultant by providing:

1. **Curated route knowledge base** - Expert-curated multi-city routes with realistic planning guidance
2. **Structured geographic data** - Destinations, cities, and regions with coordinates and characteristics
3. **Attraction and POI data** - Points of interest categorized by type and interest tags
4. **Seasonal weather patterns** - Planning-level climate guidance for destination selection
5. **Evaluation scenarios** - Test cases for measuring recommendation quality

## Dataset Files

### 1. `destinations.csv`
**Purpose:** Geographic foundation of destinations  
**Fields:** country, city, region, latitude, longitude, budget_level, main_interests, notes  
**Coverage:** 12 countries, 52 cities across Southern Europe, Central Europe, Eastern Europe, and Caucasus  
**Use Case:** Destination filtering, geographic clustering, budget matching

### 2. `routes.csv` ⭐ **Core Dataset**
**Purpose:** Curated multi-city route knowledge base  
**Fields:** route_id, country, route_name, route_type, cities, recommended_nights, min_days, max_days, budget_level, fatigue_level, best_months, avoid_months, interests, region, why_route_fits, watch_out  
**Coverage:** 36 routes (12 countries × 3 routes each)  
**Route Types:**
- `single_country_multi_city` - Multiple cities in one country
- `single_country_one_city` - Single city with day trips
- `multi_country` - Cross-border routes

**Use Case:** Route recommendation engine, candidate pool generation, validation guardrails

### 3. `attractions.csv`
**Purpose:** Points of interest and activities  
**Fields:** country, city, name, category, interest_tags, typical_duration_hours, best_time_of_day, source_type, notes  
**Coverage:** 140+ attractions across 12 countries  
**Categories:** history, food, nature, city, museum, market, viewpoint, beach, old_town, day_trip  
**Use Case:** Itinerary enrichment, interest matching, activity suggestions

### 4. `monthly_weather.csv`
**Purpose:** Planning-level seasonal climate guidance  
**Fields:** country, city, month, avg_temp_c, rain_risk, weather_score, crowd_risk, summer_warning, season_note  
**Coverage:** Monthly data for major cities  
**Use Case:** Seasonal filtering, best month recommendations, crowd avoidance

### 5. `evaluation_scenarios.json`
**Purpose:** Test scenarios for recommendation quality evaluation  
**Coverage:** 20 diverse scenarios covering:
- Different trip lengths (5-12 days)
- Budget levels (budget, moderate, comfortable, luxury)
- Trip structures (single city, multi-city, multi-country)
- Interest combinations
- Constraint scenarios (avoid mainstream, fixed destination, weak input)

**Use Case:** Automated testing, quality metrics, regression testing

## Data Sources and Methodology

### Conceptual Data Sources

This dataset is built using publicly available structured knowledge and open data:

1. **Wikidata** - Structured public knowledge base for:
   - Geographic coordinates
   - City/country relationships
   - Population and administrative data
   - UNESCO World Heritage sites

2. **OpenStreetMap / Overpass API** - Open geographic data for:
   - Points of interest (POIs)
   - Attraction locations
   - City boundaries
   - Transportation nodes

3. **Open-Meteo** - Open weather data for:
   - Historical climate patterns
   - Seasonal temperature averages
   - Precipitation patterns

4. **Expert Curation** - Travel planning knowledge for:
   - Route design and sequencing
   - Fatigue level assessment
   - Budget tier classification
   - Watch-out notes and before-booking checks

### Data Collection Process

1. **Route Design**
   - Selected 12 countries based on accessibility from major European hubs
   - Designed 3 routes per country (single-city, multi-city, regional)
   - Validated route logistics (train connections, distances, fatigue)
   - Added realistic planning notes (watch-outs, booking tips)

2. **Destination Enrichment**
   - Extracted city coordinates from Wikidata
   - Classified budget levels based on cost-of-living indices
   - Tagged main interests based on destination characteristics

3. **Attraction Curation**
   - Selected major POIs from OpenStreetMap
   - Categorized by type and interest alignment
   - Added typical visit duration and timing recommendations

4. **Weather Aggregation**
   - Compiled monthly climate averages from Open-Meteo
   - Calculated weather scores (temperature + rain risk)
   - Added crowd risk based on tourism seasonality

5. **Evaluation Scenario Design**
   - Created diverse test cases covering common travel patterns
   - Defined expected outcomes for validation
   - Included edge cases (weak input, strict constraints)

## Data Limitations

### What This Dataset IS:
✅ **Planning-level travel guidance** - Suitable for route selection and seasonal recommendations  
✅ **Curated knowledge base** - Expert-designed routes with realistic constraints  
✅ **Structured evaluation framework** - Test scenarios for measuring recommendation quality  
✅ **Open data foundation** - Built on publicly available geographic and climate data

### What This Dataset IS NOT:
❌ **Live pricing data** - No real-time flight/hotel prices (use APIs for live data)  
❌ **Current event listings** - No specific event dates or festivals (seasonal patterns only)  
❌ **Real-time weather** - Historical climate patterns, not current forecasts  
❌ **Comprehensive POI database** - Curated highlights, not exhaustive listings  
❌ **Visa/entry requirements** - General guidance only, not legal advice

## How This Supports the Graduation Project

### 1. Data Collection & Cleaning
- **Collection:** Demonstrates integration of multiple open data sources (Wikidata, OSM, Open-Meteo)
- **Cleaning:** Shows data normalization, deduplication, and quality validation
- **Documentation:** Clear provenance and methodology for each data source

### 2. Exploratory Data Analysis (EDA)
- **Geographic Distribution:** Route coverage across regions
- **Seasonal Patterns:** Best months analysis, crowd/weather correlation
- **Budget Analysis:** Route distribution by budget tier
- **Interest Clustering:** Common interest combinations

### 3. Methodology
- **Route Design:** Expert curation process for multi-city routes
- **Validation Framework:** Automated testing with evaluation scenarios
- **Quality Metrics:** Measurable outcomes (route completeness, constraint satisfaction)

### 4. Evaluation
- **Automated Testing:** 20 evaluation scenarios with expected outcomes
- **Quality Scoring:** Consultant quality metrics (route completeness, watch-outs, honesty)
- **Regression Testing:** Continuous validation of recommendation quality

### 5. AI Integration
- **Candidate Pool Generation:** Routes serve as context for OpenAI recommendations
- **Validation Guardrails:** Route constraints prevent invalid recommendations
- **Repair Flow:** OpenAI can fix invalid outputs using route knowledge base
- **Honest Metadata:** Clear tracking of AI vs. deterministic recommendations

## Usage Examples

### Load Routes for Candidate Pool
```typescript
import { parse } from 'csv-parse/sync'
import fs from 'fs'

const routesCSV = fs.readFileSync('data/travel/routes.csv', 'utf-8')
const routes = parse(routesCSV, { columns: true })

// Filter routes by budget and trip length
const candidateRoutes = routes.filter(r => 
  r.budget_level === 'moderate' && 
  parseInt(r.min_days) <= 7 && 
  parseInt(r.max_days) >= 7
)
```

### Weather-Based Filtering
```typescript
const weatherCSV = fs.readFileSync('data/travel/monthly_weather.csv', 'utf-8')
const weather = parse(weatherCSV, { columns: true })

// Find best destinations for June
const juneDestinations = weather.filter(w => 
  w.month === '6' && 
  parseInt(w.weather_score) >= 80 &&
  w.crowd_risk !== 'very_high'
)
```

### Run Evaluation Scenarios
```typescript
import scenarios from './data/travel/evaluation_scenarios.json'

for (const scenario of scenarios) {
  const result = await travelEngine.analyze({
    departureCity: scenario.departureCity,
    tripLength: scenario.tripLength,
    budget: scenario.budget,
    travelMonths: scenario.travelMonths,
    interests: scenario.interests,
    tripStructure: scenario.tripStructure
  })
  
  // Validate against expected outcomes
  validateResult(result, scenario.expected)
}
```

## Data Versioning

**Version:** 1.0.0  
**Last Updated:** May 28, 2026  
**Coverage:** 12 countries, 52 cities, 36 routes, 140+ attractions  
**Regions:** Southern Europe, Central Europe, Eastern Europe, Caucasus

## Future Enhancements

- [ ] Expand to 20+ countries
- [ ] Add transportation connections (train, bus, ferry)
- [ ] Include visa requirement rules
- [ ] Add seasonal event patterns (festivals, holidays)
- [ ] Integrate real-time pricing APIs
- [ ] Add user feedback loop for route quality

## License

This dataset is compiled from open data sources:
- **Wikidata:** CC0 1.0 Universal Public Domain Dedication
- **OpenStreetMap:** Open Database License (ODbL)
- **Open-Meteo:** CC BY 4.0

Curated route knowledge and evaluation scenarios: MIT License

## Contact

For questions about this dataset or the TravelScan AI graduation project, please refer to the main project documentation.
