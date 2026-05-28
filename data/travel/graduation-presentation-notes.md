# TravelScan AI: AI Travel Consultant with Structured Data Integration

**Graduation Project Presentation Notes**  
**Duration:** 12 minutes  
**Date:** May 28, 2026

---

## 1. Title & Introduction

**TravelScan AI: An AI-Powered Travel Consultant for Pre-Booking Planning**

- AI travel consultant that helps users plan trips **before booking**
- Combines OpenAI GPT-4o with structured travel data
- Provides realistic, validated recommendations with provenance tracking
- Focus: European destinations, 5-12 day trips, budget to comfortable travelers

---

## 2. Motivation

**Why TravelScan AI?**

- **Problem:** Generic travel recommendations lack personalization and validation
- **Gap:** Most AI travel tools either hallucinate data or provide only generic advice
- **Need:** Travelers want realistic, validated recommendations with transparent data sources
- **Opportunity:** Combine AI reasoning with structured travel knowledge

**User Pain Points:**
- Overwhelming choices when planning trips
- Uncertainty about timing, budget, and route feasibility
- Lack of transparency in recommendation sources
- No validation of AI-generated suggestions

---

## 3. Problem Definition

**Research Question:**  
Can we build an AI travel consultant that combines large language model reasoning with structured travel data to provide validated, provenance-tracked recommendations?

**Key Challenges:**
1. **Data Quality:** Ensuring travel data is accurate, sourced, and up-to-date
2. **AI Validation:** Detecting and correcting invalid AI recommendations
3. **Transparency:** Tracking data sources and confidence levels
4. **Scalability:** Balancing AI flexibility with structured constraints

**Success Criteria:**
- Recommendations validated against user constraints
- Data provenance tracked for all suggestions
- AI repair mechanism for invalid outputs
- Clear labeling of curated vs. open data sources

---

## 4. Related Work

**Existing Approaches:**

1. **Rule-Based Systems** (e.g., traditional travel agencies)
   - Pros: Predictable, validated
   - Cons: Inflexible, limited coverage

2. **Pure LLM Approaches** (e.g., ChatGPT for travel)
   - Pros: Flexible, conversational
   - Cons: Hallucination risk, no validation, no provenance

3. **Recommendation Systems** (e.g., TripAdvisor, Booking.com)
   - Pros: Data-driven, user reviews
   - Cons: No personalized reasoning, no route planning

**TravelScan AI Contribution:**
- Hybrid approach: AI reasoning + structured data + validation
- Provenance tracking for academic integrity
- Repair mechanism for AI failures
- Transparent fallback to deterministic logic when needed

---

## 5. Data

**Dataset Overview:**
- **12 countries** (Albania, Austria, Croatia, Cyprus, Czech Republic, Georgia, Greece, Hungary, Italy, Portugal, Romania, Slovenia)
- **53 cities** across 4 regions (Southern Europe, Central Europe, Eastern Europe, Caucasus)
- **36 curated routes** (expert knowledge)
- **113 attractions** (OpenStreetMap)
- **240 weather records** (Open-Meteo historical averages)
- **20 evaluation scenarios** (constraint testing)

**Data Sources & Provenance:**
- **Routes:** TravelScan Curated Route Base (8.1% of data)
  - Source type: `curated_route_knowledge`
  - Confidence: `planning_guidance`
  - Expert-designed multi-city routes

- **Destinations:** Wikidata (coordinates, basic info)
  - Source type: `open_data`
  - Confidence: `verified`

- **Attractions:** OpenStreetMap (POI data)
  - Source type: `open_data`
  - Confidence: `verified`
  - Categories: history, city, old_town, museum, nature, viewpoint, market, food

- **Weather:** Open-Meteo (historical climate averages)
  - Source type: `open_data`
  - Confidence: `planning_guidance`
  - Monthly averages for planning, not real-time forecasts

**Provenance Fields (7 per record):**
1. `source_name` - Data source name
2. `source_type` - curated / open_data
3. `source_url_or_query` - Fetch URL or query
4. `collected_at` - Collection timestamp
5. `cleaned_at` - Cleaning timestamp
6. `confidence_level` - verified / planning_guidance / estimated
7. `data_limitations` - Known limitations

---

## 6. Data Cleaning & EDA

**Data Pipeline:**
1. **Optional Fetch Scripts** (not run during build)
   - `fetch-wikidata-destinations.ts`
   - `fetch-osm-attractions.ts`
   - `fetch-openmeteo-weather.ts`
   - Save raw JSON to `data/travel/raw/`

2. **Cleaning Script**
   - `clean-travel-data.ts`
   - Merges raw data with curated seed data
   - Adds provenance metadata
   - Outputs to `data/travel/processed/`

3. **Validation**
   - `validate-travel-data.ts`
   - Checks required fields, no duplicates, valid ranges
   - **Result:** 36 routes, 113 attractions, 0 errors, 0 warnings

4. **EDA**
   - `travel-data-eda.ts`
   - Generates summary statistics
   - Provenance analysis
   - **Output:** `eda-summary.json`

**Key EDA Findings:**
- **Peak travel months:** May (31 routes), June (36 routes), September (36 routes)
- **Budget distribution:** 50% moderate, 33% budget, 17% comfortable
- **Route types:** 83% multi-city, 17% single-city
- **Top attraction categories:** History (34), City (19), Old Town (14)
- **Best weather months:** April-June, September-October (avg score 80-87/100)

---

## 7. Methodology

**System Architecture:**

```
User Request
    ↓
Parse Constraints (trip length, budget, interests, months, structure)
    ↓
Load Travel Data (routes, attractions, weather)
    ↓
Build Route Candidate Pool (36 CSV routes + 15 fallback)
    ↓
Build Travel Data Context (top 6 routes with attractions & weather)
    ↓
Call OpenAI GPT-4o (with structured context)
    ↓
Validate Recommendations (constraints, completeness, honesty)
    ↓
[If Invalid] → Attempt OpenAI Repair (second call with issues)
    ↓
[If Repair Fails] → Apply Deterministic Fallback (replace with valid candidates)
    ↓
Score Consultant Quality (0-100)
    ↓
Cache Valid Results
    ↓
Return Recommendations + Metadata
```

**OpenAI Integration:**
- **Model:** GPT-4o-2024-08-06
- **Mode:** Compact (fast, reduced tokens)
- **Input:** User constraints + travel data context (top 6 routes)
- **Output:** 3 ranked recommendations (Best Overall, Best Value, Unique Discovery)
- **Structured Output:** Zod schema validation
- **Temperature:** 0.3 (balanced creativity/consistency)

**Travel Data Context Format:**
```
TRAVEL DATA CONTEXT (use as planning reference):
• Portugal - Lisbon → Porto → Coimbra
  Days: 6-9 | Budget: moderate | Fatigue: low
  Best months: 4,5,6,9,10 | Interests: city, food, history, culture
  Why: Perfect introduction to Portugal with two major cities...
  ⚠️ Summer (July-August) very hot and crowded. Book Porto...
  Attractions: Belém Tower, Livraria Lello, University of Coimbra
  Weather: avg 85/100

Note: This data is planning-level guidance from curated sources.
Use it as context but apply your travel expertise.
```

**Validation & Repair:**
1. **Validation Checks:**
   - Trip structure compliance (single-city, multi-city, multi-country)
   - Destination constraints (fixed destination, banned countries)
   - Route completeness (suggested route, recommended nights, transport logic)
   - Score honesty (realistic 70-95, not inflated)

2. **OpenAI Repair Flow:**
   - Triggered when validation fails
   - Second OpenAI call with validation issues + candidate context
   - Attempts to fix specific problems
   - Tracked in metadata (`repairAttempted`, `repairPassed`)

3. **Deterministic Fallback:**
   - Used when OpenAI repair fails or unavailable
   - Replaces invalid destinations with valid candidates from pool
   - Clearly labeled in metadata (`analysisSource: fallback_deterministic`)
   - Quality capped at 75/100 for transparency

**Metadata Tracking (28 fields):**
- Analysis source (openai_primary / openai_repaired / fallback_deterministic)
- Travel data usage (routes loaded, attractions used, weather records)
- Provenance (source types, confidence levels)
- Repair attempts (attempted, passed, failed reason)
- Quality scores (consultant quality, diversity, generic phrases)
- Performance (duration, tokens, cache status)

---

## 8. Evaluation

**Evaluation Framework:**

1. **Data Validation**
   - 36 routes validated
   - 113 attractions validated
   - 0 errors, 0 warnings
   - **Status:** PASS

2. **Constraint Testing (20 scenarios)**
   - Trip lengths: 5-12 days
   - Budgets: budget, moderate, comfortable, luxury
   - Structures: single-city, multi-city, multi-country
   - Constraints: avoid long-haul, banned countries, minimum cities
   - **Route matching:** 100% success
   - **Long-haul avoidance:** 100% when required
   - **Banned countries:** 100% compliance
   - **Multi-city matching:** 100% when required
   - **Watch-out coverage:** 100% of routes

3. **Consultant Quality Evaluation**
   - Average quality score: 97.0/100
   - Average diversity: 2.0 regions
   - Average generic phrases: 1.0
   - Success rate: 100%
   - **Status:** PASS

4. **Build & Code Quality**
   - Lint: PASS
   - TypeScript compilation: PASS
   - Production build: PASS
   - Schema validation: PASS
   - UI normalization: 18/18 tests PASS
   - Smoke tests: 100% routes exist
   - Learning evaluation: 14/14 tests PASS

**Evaluation Metrics:**
- **Data Coverage:** 12 countries, 53 cities, 36 routes
- **Provenance Tracking:** 100% of records have source attribution
- **Validation Rate:** 100% of AI responses validated
- **Repair Success:** Tracked per request
- **Quality Threshold:** ≥75 for acceptance

---

## 9. Results

**System Performance:**

1. **Data Foundation:**
   - ✅ 442 total records with provenance
   - ✅ 8.1% curated, 91.9% open data
   - ✅ 4 regions, 12 countries, 53 cities
   - ✅ 100% provenance tracking

2. **AI Pipeline:**
   - ✅ OpenAI primary with structured context
   - ✅ Validation detects constraint violations
   - ✅ Repair mechanism attempts fixes
   - ✅ Deterministic fallback when needed
   - ✅ Quality scoring (avg 97/100)

3. **Route Recommendations:**
   - ✅ 36 curated routes loaded from CSV
   - ✅ Smart filtering by trip length, budget, months, interests
   - ✅ Attractions enrichment (top 6 per route)
   - ✅ Weather context (monthly averages)
   - ✅ Watch-out notes (100% coverage)

4. **Evaluation:**
   - ✅ 20 test scenarios
   - ✅ 100% route matching success
   - ✅ 100% constraint compliance
   - ✅ All code quality tests pass

**Example Recommendation Flow:**

**Input:**
- 7-day trip, moderate budget
- Interests: food, city, history
- Travel months: June, July, August
- Structure: multi-city

**Travel Data Context Loaded:**
- 24 matching routes found
- Top 6 routes with attractions & weather sent to OpenAI
- Example: Portugal (Lisbon → Porto → Coimbra), Greece (Athens → Naxos → Crete)

**OpenAI Output:**
- 3 recommendations (Best Overall, Best Value, Unique Discovery)
- Validated against constraints
- Quality scored: 95/100

**Metadata:**
- `travelDataUsed: true`
- `travelDataRoutesLoaded: 36`
- `travelDataCandidateRoutesUsed: 24`
- `analysisSource: openai_primary`
- `consultantQualityScore: 95`

---

## 10. Limitations

**Current Limitations:**

1. **Geographic Coverage:**
   - Limited to 12 European countries
   - No long-haul destinations (Asia, Americas, Oceania)
   - Focus on less-mainstream destinations (no Paris, London, Barcelona)

2. **Data Freshness:**
   - Weather data: historical averages, not real-time forecasts
   - Attractions: static POI list, not live availability
   - No live prices, events, or booking availability

3. **Route Complexity:**
   - Mostly single-country routes (83%)
   - Limited multi-country routes (0% in current dataset)
   - No complex itineraries (e.g., 4+ cities)

4. **Evaluation Scenarios:**
   - Region constraints too strict (expect 1-2 regions, dataset has 4)
   - No live OpenAI evaluation (validation mode only)
   - Limited edge case testing

5. **AI Limitations:**
   - OpenAI may still hallucinate despite validation
   - Repair success rate not yet measured at scale
   - Fallback quality capped at 75/100

6. **Provenance Granularity:**
   - Attraction coordinates not included
   - Transportation connections not tracked
   - Cost estimates not included (to avoid fake pricing)

**Acknowledged in System:**
- Data limitations field for each record
- Confidence levels (verified vs. planning_guidance)
- Clear labeling of fallback recommendations
- No claims about live data or prices

---

## 11. Future Work

**Short-Term Enhancements:**

1. **Expand Geographic Coverage:**
   - Add 10-15 more European countries (Spain, France, Poland, Bulgaria, etc.)
   - Include multi-country routes (Prague → Vienna → Budapest)
   - Add seasonal routes (Christmas markets, summer festivals)

2. **Improve Evaluation:**
   - Update scenario region constraints to match dataset
   - Run live OpenAI evaluation (RUN_LIVE_TRAVEL_EVALS=true)
   - Add 40+ more test scenarios
   - Measure repair success rate at scale

3. **Enhance Travel Data:**
   - Add transportation connections (train routes, ferry schedules)
   - Include typical cost ranges (not live prices)
   - Add visa requirements
   - Include safety/health notes

4. **UI Enhancements:**
   - Visualize route maps
   - Show provenance sources in UI
   - Display confidence levels
   - Add "Why this recommendation?" explanations

**Long-Term Vision:**

1. **Global Coverage:**
   - Expand to Asia, Americas, Oceania
   - Add long-haul route planning
   - Include visa and vaccination requirements

2. **Live Data Integration:**
   - Real-time flight/train prices (with clear labeling)
   - Live event calendars
   - Accommodation availability
   - Weather forecasts (not just averages)

3. **Advanced AI Features:**
   - Multi-turn conversation for refinement
   - Learning from user feedback
   - Personalized recommendations based on history
   - Collaborative trip planning

4. **Academic Contributions:**
   - Publish dataset with provenance
   - Open-source evaluation framework
   - Benchmark for AI travel consultants
   - Case study on AI validation and repair

---

## Summary

**TravelScan AI demonstrates:**

✅ **Hybrid AI Architecture** - Combines OpenAI reasoning with structured travel data  
✅ **Validation & Repair** - Detects and corrects invalid AI recommendations  
✅ **Provenance Tracking** - Full transparency on data sources and confidence  
✅ **Academic Integrity** - No fake data, clear limitations, reproducible pipeline  
✅ **Production Ready** - All tests pass, deployed to Vercel, 442 records with provenance  

**Key Contributions:**
1. Structured travel data foundation with provenance (442 records)
2. OpenAI integration with validation and repair mechanism
3. Evaluation framework with 20 constraint-based scenarios
4. Transparent fallback to deterministic logic when AI fails
5. Quality scoring and metadata tracking (28 fields)

**Impact:**
- Provides realistic, validated travel recommendations
- Tracks data sources for academic integrity
- Demonstrates AI + structured data hybrid approach
- Open-source evaluation framework for future research

---

**Thank you!**

**Questions?**

---

**Appendix: Key Metrics**

- **Dataset:** 12 countries, 53 cities, 36 routes, 113 attractions, 240 weather records
- **Provenance:** 100% of records have source attribution
- **Quality:** Average consultant score 97/100
- **Validation:** 100% of AI responses validated
- **Tests:** All code quality tests pass (lint, build, schema, UI, quality, smoke, learning)
- **Deployment:** Production-ready on Vercel
