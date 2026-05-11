# TravelScan AI - Data & EDA Plan

## Overview

This document describes the data sources used by TravelScan AI and proposes an Exploratory Data Analysis (EDA) plan for the graduation project.

---

## Data Sources

### 1. User Input Data

**Description:** Structured inputs collected from users via the analysis form

**Fields (9 total):**

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `departure` | String | "Cairo (CAI)" | Starting location |
| `passportCountry` | String | "Egypt" | Visa filtering |
| `tripLength` | Number | 15 | Duration constraint |
| `travelMonths` | Array[Number] | [9, 10, 11] | Seasonal matching |
| `budget` | Enum | "moderate" | Cost filtering |
| `interests` | Array[String] | ["culture", "food"] | Preference matching |
| `accommodation` | Enum | "hotel" | Lodging preference |
| `tripStructure` | Enum | "multi_country" | Route type |
| `currency` | String | "USD" | Display preference |

**Data Location:** Form submissions in `src/components/travel/guided-analysis-form.tsx`

**Volume:** To be measured from production analytics

**Quality:** Validated via Zod schemas before processing

---

### 2. Fallback Route Library

**Description:** Curated multi-city routes used when AI providers fail

**Purpose:** Ensures 100% system reliability

**Data Location:** 
- Likely in `src/lib/analysis/engine.ts` or separate route data file
- Need to search for fallback route definitions

**Structure (Expected):**
```typescript
{
  routeId: string
  region: string (e.g., "Europe", "Asia", "Americas")
  countries: string[]
  cities: string[]
  tripStructure: "single_city" | "multi_city_same_country" | "multi_country"
  minDays: number
  maxDays: number
  recommendedNights: { [city: string]: number }
  budgetLevel: "budget" | "moderate" | "luxury"
  travelStyle: string[] (e.g., ["culture", "history", "food"])
  highlights: string[]
  warnings: string[]
  fatigueLevel: "Low" | "Medium" | "High"
  seasonalNotes: string
}
```

**Extraction Plan:**
1. Search codebase for fallback route definitions
2. Export to JSON format
3. Convert to CSV for EDA
4. Analyze route properties

**Expected Size:** 50-200 curated routes (to be confirmed)

---

### 3. AI-Generated Recommendation Data

**Description:** Structured outputs from OpenAI GPT-4o

**Schema:** Defined in `src/lib/analysis/schemas.ts`

**Key Fields:**
- `rankedDestinations` - Top 3 recommendations
- `recommendedRoutes` - Ordered stops with nights
- `routeRealismScore` - 0-100 score
- `travelFatigueLevel` - Low/Medium/High
- `routeWarnings` - Array of warnings
- `confidence` - 0-1 confidence score
- `reasons` - Why recommended
- `assumptions` - What was assumed

**Data Location:** Generated per request, optionally saved in database

**Volume:** One response per analysis request

**Quality Control:**
- Zod schema validation
- Optional Claude verification
- Fallback on validation failure

---

### 4. External API Data

#### 4.1 Google Maps/Places API (Optional)
**Purpose:** Airport/city geocoding and autocomplete

**Data Used:**
- Location coordinates
- Airport codes
- City names
- Place IDs

**Availability:** When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured

#### 4.2 Duffel API (Optional)
**Purpose:** Flight availability and pricing

**Data Used:**
- Flight routes
- Price estimates
- Availability

**Availability:** When `DUFFEL_API_TOKEN` is configured

#### 4.3 Hotelbeds API (Optional)
**Purpose:** Hotel availability and pricing

**Data Used:**
- Hotel availability
- Room rates
- Property details

**Availability:** When `HOTELBEDS_API_KEY` is configured

**Note:** System works without these APIs via graceful degradation

---

### 5. User Feedback Data (If Collected)

**Description:** User interactions with recommendations

**Potential Fields:**
- `feedbackType` - thumbs-up, thumbs-down, save-trip, view-details
- `destinationId` - Which recommendation
- `recommendationRank` - 1, 2, or 3
- `totalScore` - Match score
- `queryContext` - Original request

**Data Location:** `src/lib/services/ai-feedback-analyzer.ts`

**Purpose:** Quality improvement and learning

**Status:** Collection mechanism exists, data volume TBD

---

## Data Extraction Plan

### Step 1: Locate Fallback Route Library

**Search Strategy:**
```bash
# Search for route definitions
grep -r "fallback" src/lib/
grep -r "route.*library" src/lib/
grep -r "curated.*routes" src/lib/
grep -r "deterministic.*routes" src/lib/
```

**Expected Locations:**
- `src/lib/analysis/engine.ts` - Main analysis engine
- `src/lib/analysis/fallback-routes.ts` - Dedicated route file
- `src/data/routes.json` - JSON data file

### Step 2: Export to Structured Format

**Target Format:** CSV with columns:
- route_id
- region
- countries (comma-separated)
- cities (comma-separated)
- trip_structure
- min_days
- max_days
- total_nights
- budget_level
- travel_styles (comma-separated)
- fatigue_level
- has_warnings (boolean)

**Export Script (Pseudocode):**
```typescript
// Read fallback routes from code
const routes = getFallbackRoutes()

// Transform to flat structure
const csvData = routes.map(route => ({
  route_id: route.id,
  region: route.region,
  countries: route.countries.join(','),
  cities: route.cities.join(','),
  trip_structure: route.tripStructure,
  min_days: route.minDays,
  max_days: route.maxDays,
  total_nights: calculateTotalNights(route),
  budget_level: route.budgetLevel,
  travel_styles: route.travelStyle.join(','),
  fatigue_level: route.fatigueLevel,
  has_warnings: route.warnings.length > 0
}))

// Write to CSV
writeCsvFile('fallback-routes.csv', csvData)
```

### Step 3: Collect Test Scenario Results

**Data to Collect:**
- Input parameters for each test
- Generated recommendations
- Realism scores
- Fatigue levels
- Warnings issued
- Fallback activations
- Response times

**Format:** CSV with test results

---

## Proposed EDA Analysis

### 1. Route Distribution by Trip Structure

**Analysis:** Count routes by trip structure type

**Visualization:** Bar chart

**Metrics:**
- Number of single-city routes
- Number of multi-city same-country routes
- Number of multi-country routes

**Expected Output:**
```
Trip Structure          | Count | Percentage
------------------------|-------|------------
Single City             |   20  |    20%
Multi-City Same Country |   30  |    30%
Multi-Country           |   50  |    50%
Total                   |  100  |   100%
```

**Insight:** Shows route library coverage across trip types

---

### 2. Route Distribution by Region

**Analysis:** Count routes by geographic region

**Visualization:** Pie chart or bar chart

**Metrics:**
- Routes per region (Europe, Asia, Americas, Africa, Oceania)
- Percentage coverage

**Expected Output:**
```
Region      | Count | Percentage
------------|-------|------------
Europe      |   40  |    40%
Asia        |   25  |    25%
Americas    |   20  |    20%
Africa      |   10  |    10%
Oceania     |    5  |     5%
Total       |  100  |   100%
```

**Insight:** Identifies geographic coverage and gaps

---

### 3. Route Distribution by Duration

**Analysis:** Histogram of route durations

**Visualization:** Histogram with bins (1-7, 8-14, 15-21, 22-30 days)

**Metrics:**
- Average trip length
- Most common duration range
- Min/max durations

**Expected Output:**
```
Duration Range | Count | Percentage
---------------|-------|------------
1-7 days       |   15  |    15%
8-14 days      |   40  |    40%
15-21 days     |   30  |    30%
22-30 days     |   15  |    15%
Total          |  100  |   100%
```

**Insight:** Shows typical trip lengths in library

---

### 4. Route Distribution by Fatigue Level

**Analysis:** Count routes by fatigue level

**Visualization:** Bar chart

**Metrics:**
- Low fatigue routes
- Medium fatigue routes
- High fatigue routes

**Expected Output:**
```
Fatigue Level | Count | Percentage
--------------|-------|------------
Low           |   50  |    50%
Medium        |   35  |    35%
High          |   15  |    15%
Total         |  100  |   100%
```

**Insight:** Validates that library prioritizes reasonable pacing

---

### 5. Route Distribution by Budget Category

**Analysis:** Count routes by budget level

**Visualization:** Bar chart

**Metrics:**
- Budget routes
- Moderate routes
- Luxury routes

**Expected Output:**
```
Budget Level | Count | Percentage
-------------|-------|------------
Budget       |   30  |    30%
Moderate     |   50  |    50%
Luxury       |   20  |    20%
Total        |  100  |   100%
```

**Insight:** Shows budget diversity in recommendations

---

### 6. Route Distribution by Travel Style

**Analysis:** Count routes by interest tags

**Visualization:** Horizontal bar chart (top 10 tags)

**Metrics:**
- Most common travel styles
- Tag frequency

**Expected Output:**
```
Travel Style | Count | Percentage
-------------|-------|------------
Culture      |   70  |    70%
History      |   60  |    60%
Food         |   50  |    50%
Nature       |   40  |    40%
Beach        |   30  |    30%
Adventure    |   25  |    25%
Shopping     |   20  |    20%
Nightlife    |   15  |    15%
```

**Note:** Routes can have multiple tags, so percentages may exceed 100%

**Insight:** Shows which interests are well-covered

---

### 7. Cities per Route Analysis

**Analysis:** Distribution of number of cities per route

**Visualization:** Histogram

**Metrics:**
- Average cities per route
- Most common number of cities
- Range (min/max)

**Expected Output:**
```
Number of Cities | Count | Percentage
-----------------|-------|------------
1 city           |   20  |    20%
2 cities         |   25  |    25%
3 cities         |   30  |    30%
4 cities         |   15  |    15%
5+ cities        |   10  |    10%
Total            |  100  |   100%
```

**Insight:** Shows route complexity distribution

---

### 8. Test Scenario Results Summary

**Analysis:** Pass/fail summary for evaluation scenarios

**Visualization:** Table with checkmarks

**Metrics:**
- Scenarios passed
- Scenarios failed
- Success rate per metric

**Expected Output:**
```
Scenario                    | Pass/Fail | Notes
----------------------------|-----------|------------------
Standard Multi-Country      | ✅ PASS   | Realism: 85/100
Rushed Trip                 | ✅ PASS   | Warning issued
Single Country Multi-City   | ✅ PASS   | Structure correct
Single City                 | ✅ PASS   | No multi-city
OpenAI Failure              | ✅ PASS   | Fallback activated
Claude Disabled             | ✅ PASS   | Still works
Google Maps Missing         | ✅ PASS   | Manual input ok
Hotel/Flight APIs Missing   | ✅ PASS   | Graceful degradation
----------------------------|-----------|------------------
Overall Success Rate        | 8/8 (100%) |
```

**Insight:** Demonstrates system reliability

---

### 9. Route Realism Score Distribution

**Analysis:** Distribution of realism scores from test scenarios

**Visualization:** Histogram

**Metrics:**
- Average realism score
- Score distribution
- Percentage above threshold (>70)

**Expected Output:**
```
Score Range | Count | Percentage
------------|-------|------------
0-30        |    1  |    10%
31-50       |    1  |    10%
51-70       |    2  |    20%
71-85       |    3  |    30%
86-100      |    3  |    30%
Total       |   10  |   100%

Average Score: 72.5
Above Threshold (>70): 60%
```

**Insight:** Shows route quality distribution

---

### 10. Fatigue Level Accuracy

**Analysis:** Correlation between trip pacing and fatigue level

**Visualization:** Scatter plot (cities per day vs fatigue level)

**Metrics:**
- Low fatigue: ≤0.25 cities/day
- Medium fatigue: 0.26-0.5 cities/day
- High fatigue: >0.5 cities/day

**Expected Output:**
```
Fatigue Level | Avg Cities/Day | Correct Classification
--------------|----------------|----------------------
Low           |      0.20      |        100%
Medium        |      0.35      |         90%
High          |      0.60      |         85%
```

**Insight:** Validates fatigue analysis algorithm

---

## Data Quality Checks

### Completeness
- [ ] All routes have required fields
- [ ] No missing cities or countries
- [ ] All durations are positive
- [ ] All fatigue levels are valid

### Consistency
- [ ] Total nights = sum of nights per city
- [ ] Min days ≤ max days
- [ ] Cities match countries
- [ ] Budget levels are valid enums

### Validity
- [ ] Geographic coherence (cities in correct countries)
- [ ] Realistic durations (1-90 days)
- [ ] Reasonable nights per city (1-14)
- [ ] Valid travel style tags

---

## EDA Deliverables

### For Graduation Report

1. **Data Summary Table**
   - Total routes in library
   - Coverage by region
   - Coverage by trip structure
   - Average route characteristics

2. **Distribution Charts** (5-7 charts)
   - Trip structure distribution
   - Regional coverage
   - Duration histogram
   - Fatigue level distribution
   - Budget category distribution

3. **Test Results Table**
   - Scenario pass/fail summary
   - Metric achievement table
   - Edge case handling

4. **Quality Metrics**
   - Data completeness percentage
   - Validation pass rate
   - Fallback activation rate

### For Presentation

1. **Key Statistics Slide**
   - Total routes: [X]
   - Regions covered: [Y]
   - Average realism score: [Z]
   - Test success rate: [W]%

2. **Distribution Chart** (1-2 charts)
   - Trip structure pie chart
   - Regional coverage bar chart

3. **Results Table**
   - Test scenario summary
   - Metric achievement

---

## Implementation Steps

### Phase 1: Data Extraction (2 hours)
1. Locate fallback route library in code
2. Export to JSON format
3. Convert to CSV
4. Validate data structure

### Phase 2: EDA Analysis (2 hours)
1. Load data into pandas/Excel
2. Calculate summary statistics
3. Create distribution charts
4. Generate tables

### Phase 3: Test Data Collection (3 hours)
1. Run all 8 test scenarios
2. Record results in CSV
3. Calculate metrics
4. Create results table

### Phase 4: Visualization (1 hour)
1. Create charts for report
2. Format tables
3. Export as images
4. Prepare for presentation

**Total Effort:** ~8 hours

---

## Expected Findings

### Hypotheses to Test

**H1:** Route library has balanced coverage across trip structures
- Expected: 20% single-city, 30% multi-city, 50% multi-country

**H2:** Most routes are 8-14 days (typical vacation length)
- Expected: 40%+ in this range

**H3:** Majority of routes have Low or Medium fatigue
- Expected: 85%+ are not High fatigue

**H4:** System achieves >90% route structure compliance
- Expected: 100% in test scenarios

**H5:** Fallback reliability is 100%
- Expected: All scenarios pass when AI fails

---

## Data Files to Create

1. **fallback-routes.csv** - Extracted route library
2. **test-scenarios.csv** - Evaluation results
3. **eda-summary.json** - Statistical summary
4. **charts/** - Directory with visualization images

---

## Conclusion

This EDA plan provides a systematic approach to:
1. Extract and document TravelScan AI's data sources
2. Analyze route library properties
3. Validate system performance
4. Create visualizations for graduation report
5. Demonstrate data-driven evaluation

The analysis will support the graduation project's data section and provide quantitative evidence of system quality.
