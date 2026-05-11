# TravelScan AI - Evaluation Plan

## Overview

This document defines comprehensive evaluation scenarios, metrics, and pass/fail criteria for TravelScan AI graduation project assessment.

---

## Evaluation Metrics

### 1. Route Structure Compliance
**Definition:** Percentage of recommendations that match the requested trip structure

**Measurement:**
- Single city request → Single city recommendation
- Multi-city same country → Multiple cities in one country
- Multi-country → Cities across multiple countries

**Target:** >90%

**Formula:** `(Matching recommendations / Total recommendations) × 100`

---

### 2. Route Realism Score
**Definition:** Average realism score across all generated routes

**Components:**
- Geographic coherence (30%)
- Transfer feasibility (25%)
- Time allocation (20%)
- Seasonal appropriateness (15%)
- Budget alignment (10%)

**Target:** >70/100

**Formula:** Weighted sum of component scores

---

### 3. Travel Fatigue Accuracy
**Definition:** Percentage of trips with correctly assessed fatigue level

**Levels:**
- Low: ≤1 city per 4+ days
- Medium: 1 city per 2-3 days
- High: >1 city per 2 days

**Target:** >85%

**Validation:** Manual review of nights-per-city allocation

---

### 4. Warning Quality
**Definition:** Percentage of rushed/problematic trips that receive appropriate warnings

**Warning Types:**
- Too many cities for duration
- Insufficient time per city
- Long transfer distances
- Visa complications
- Budget misalignment

**Target:** 100% for objectively rushed trips

---

### 5. Fallback Reliability
**Definition:** Percentage of requests successfully served when AI providers fail

**Target:** 100%

**Measurement:** System must return valid recommendation even when:
- OpenAI API is unavailable
- Claude API is unavailable
- Both AI providers fail

---

### 6. Response Time
**Definition:** Time from request submission to recommendation display

**Target:** <15 seconds (90th percentile)

**Measurement:** Client-side timing from form submit to results render

---

### 7. Provider Resilience
**Definition:** Percentage of requests handled despite external API failures

**Scenarios:**
- Google Maps API missing
- Duffel API missing
- Hotelbeds API missing
- Multiple APIs missing

**Target:** 100% (graceful degradation)

---

## Test Scenarios

### Scenario 1: Standard Multi-Country Trip (Baseline)

**Input:**
```
Departure: Cairo (CAI)
Passport: Egypt
Trip Length: 15 days
Season: Autumn (September, October, November)
Budget: Moderate
Interests: Culture, History, Food
Accommodation: Hotel
Trip Structure: Multi-country
Currency: USD
```

**Expected Behavior:**
- 3 ranked recommendations
- Each recommendation has 2-4 countries
- Route realism score >70
- Travel fatigue: Low or Medium
- Ordered stops with nights per city
- Total nights = 15
- No warnings (trip is reasonable)

**Evaluation Criteria:**
- ✅ Route structure: Multi-country
- ✅ Realism score: >70
- ✅ Fatigue level: Low or Medium
- ✅ Total nights: 15
- ✅ Geographic coherence: Logical progression
- ✅ Response time: <15s

**Pass/Fail Metric:**
- PASS: All criteria met
- FAIL: Any criterion violated

**Screenshot Needed:**
- Full recommendation card showing route, scores, nights allocation

---

### Scenario 2: Rushed Multi-Country Trip (Warning Test)

**Input:**
```
Departure: New York (JFK)
Passport: United States
Trip Length: 7 days
Season: Summer (June, July, August)
Budget: Moderate
Interests: Sightseeing, Culture
Accommodation: Hotel
Trip Structure: Multi-country
Currency: USD
```

**Expected Behavior:**
- 3 recommendations (may suggest fewer countries than typical)
- Route realism score: 40-70 (lower due to rushed nature)
- Travel fatigue: **High**
- **Warning issued:** "This itinerary involves frequent transfers and may be exhausting"
- Route warnings present
- Alternative suggestions provided

**Evaluation Criteria:**
- ✅ Warning displayed
- ✅ Fatigue level: High
- ✅ Realism score: Reflects rushed nature
- ✅ Alternative suggestions provided
- ✅ Route warnings present

**Pass/Fail Metric:**
- PASS: Warning issued + fatigue = High
- FAIL: No warning or fatigue = Low/Medium

**Screenshot Needed:**
- Recommendation card with warning alert
- Route warnings section
- Fatigue level indicator

---

### Scenario 3: Single Country Multi-City

**Input:**
```
Departure: London (LHR)
Passport: United Kingdom
Trip Length: 10 days
Season: Spring (March, April, May)
Budget: Budget
Interests: Nature, Adventure
Accommodation: Hostel
Trip Structure: Single country, multi-city
Currency: GBP
```

**Expected Behavior:**
- 3 recommendations
- Each recommendation: **Single country only**
- Multiple cities within that country
- Route realism score >75 (easier to plan single country)
- Travel fatigue: Low or Medium
- Budget-appropriate suggestions

**Evaluation Criteria:**
- ✅ Route structure: Single country
- ✅ Multiple cities within one country
- ✅ Realism score: >75
- ✅ Budget alignment: Budget-friendly options
- ✅ No multi-country suggestions

**Pass/Fail Metric:**
- PASS: All recommendations are single-country
- FAIL: Any multi-country recommendation

**Screenshot Needed:**
- Recommendation showing single country with multiple cities
- Budget indicator

---

### Scenario 4: Single City Deep Dive

**Input:**
```
Departure: Tokyo (NRT)
Passport: Japan
Trip Length: 7 days
Season: Autumn (September, October, November)
Budget: Luxury
Interests: Food, Culture, Shopping
Accommodation: Hotel
Trip Structure: Single country, one city
Currency: JPY
```

**Expected Behavior:**
- 3 recommendations
- Each recommendation: **Single city only**
- No multi-city routes
- Route realism score >85 (simplest structure)
- Travel fatigue: Low
- Luxury accommodation suggestions
- Focus on activities within the city

**Evaluation Criteria:**
- ✅ Route structure: Single city
- ✅ No multi-city suggestions
- ✅ Realism score: >85
- ✅ Fatigue level: Low
- ✅ Luxury budget reflected

**Pass/Fail Metric:**
- PASS: All recommendations are single-city
- FAIL: Any multi-city recommendation

**Screenshot Needed:**
- Single city recommendation card
- Luxury budget indicator

---

### Scenario 5: OpenAI Provider Failure (Fallback Test)

**Input:**
```
Departure: Paris (CDG)
Passport: France
Trip Length: 12 days
Season: Winter (December, January, February)
Budget: Moderate
Interests: Art, History
Accommodation: Apartment
Trip Structure: Multi-country
Currency: EUR
```

**Test Setup:**
- Temporarily disable OpenAI API key or simulate API failure
- System should activate fallback route library

**Expected Behavior:**
- Fallback library activated
- 3 recommendations still provided
- Recommendations from curated route library
- Clear indication that fallback mode is active (optional)
- Route structure still matches request
- Response time: <5s (faster than AI)

**Evaluation Criteria:**
- ✅ Fallback activated successfully
- ✅ 3 recommendations provided
- ✅ Route structure matches request
- ✅ No system crash or error
- ✅ Recommendations are valid and realistic

**Pass/Fail Metric:**
- PASS: System returns valid recommendations
- FAIL: System crashes or returns error

**Screenshot Needed:**
- Fallback recommendation (may look slightly different)
- System logs showing fallback activation (if visible)

---

### Scenario 6: Claude Verifier Disabled

**Input:**
```
Departure: Dubai (DXB)
Passport: United Arab Emirates
Trip Length: 14 days
Season: Spring (March, April, May)
Budget: Luxury
Interests: Luxury, Shopping, Beach
Accommodation: Hotel
Trip Structure: Multi-country
Currency: AED
```

**Test Setup:**
- Disable Claude API key or set `ENABLE_CLAUDE_VERIFIER=false`
- System should rely on OpenAI only

**Expected Behavior:**
- OpenAI generates recommendations
- No Claude verification step
- Recommendations still valid
- Route realism score calculated
- No system degradation

**Evaluation Criteria:**
- ✅ Recommendations generated successfully
- ✅ No errors or crashes
- ✅ Realism score present
- ✅ Response time: <15s

**Pass/Fail Metric:**
- PASS: System works normally without Claude
- FAIL: System crashes or requires Claude

**Screenshot Needed:**
- Normal recommendation (indistinguishable from Claude-verified)

---

### Scenario 7: Google Maps API Missing (Manual Input Test)

**Input:**
```
Departure: "Singapore" (typed manually, not autocomplete)
Passport: Singapore
Trip Length: 10 days
Season: Summer (June, July, August)
Budget: Moderate
Interests: Food, Culture
Accommodation: Hotel
Trip Structure: Multi-country
Currency: SGD
```

**Test Setup:**
- Remove or disable Google Maps API key
- User must type departure city manually

**Expected Behavior:**
- Form accepts manual text input
- System processes request without geocoding
- Recommendations still generated
- No crash or error
- May have slightly less precise location matching

**Evaluation Criteria:**
- ✅ Manual input accepted
- ✅ Recommendations generated
- ✅ No system crash
- ✅ Graceful degradation

**Pass/Fail Metric:**
- PASS: System works with manual input
- FAIL: System requires Google Maps API

**Screenshot Needed:**
- Form with manual text input (no autocomplete dropdown)
- Successful recommendation result

---

### Scenario 8: Missing Hotel/Flight APIs (Graceful Degradation)

**Input:**
```
Departure: Sydney (SYD)
Passport: Australia
Trip Length: 14 days
Season: Autumn (March, April, May)
Budget: Moderate
Interests: Nature, Adventure, Beach
Accommodation: Hotel
Trip Structure: Multi-country
Currency: AUD
```

**Test Setup:**
- Remove Duffel API key (flights)
- Remove Hotelbeds API key (hotels)
- System should still generate recommendations without real-time pricing

**Expected Behavior:**
- Recommendations generated without real-time pricing
- Budget estimates based on general knowledge
- No flight/hotel availability checks
- System does not crash
- Clear indication that pricing is estimated (optional)

**Evaluation Criteria:**
- ✅ Recommendations generated
- ✅ No system crash
- ✅ Budget estimates provided
- ✅ Graceful degradation

**Pass/Fail Metric:**
- PASS: System works without external pricing APIs
- FAIL: System crashes or requires APIs

**Screenshot Needed:**
- Recommendation with estimated pricing
- No real-time availability data

---

## Additional Edge Case Tests

### Scenario 9: Passport with Visa Restrictions

**Input:**
```
Departure: Tel Aviv (TLV)
Passport: Israel
Trip Length: 15 days
Season: Spring
Budget: Moderate
Interests: Culture, History
Accommodation: Hotel
Trip Structure: Multi-country
Currency: USD
```

**Expected Behavior:**
- Recommendations avoid countries with Israeli passport restrictions
- Warnings about visa requirements if applicable
- Alternative suggestions for visa-friendly destinations

**Evaluation Criteria:**
- ✅ Passport restrictions respected
- ✅ Visa warnings present if needed
- ✅ Recommendations are legally feasible

---

### Scenario 10: Very Long Trip (30 days)

**Input:**
```
Departure: Los Angeles (LAX)
Passport: United States
Trip Length: 30 days
Season: Summer
Budget: Budget
Interests: Backpacking, Nature
Accommodation: Hostel
Trip Structure: Multi-country
Currency: USD
```

**Expected Behavior:**
- Recommendations with 5-8 cities
- Appropriate pacing (3-5 nights per city)
- Travel fatigue: Low to Medium
- Realism score >75

**Evaluation Criteria:**
- ✅ Appropriate number of cities for 30 days
- ✅ Realistic pacing
- ✅ Budget-friendly options

---

## Evaluation Execution Plan

### Phase 1: Preparation (1 day)
1. Set up test environment
2. Prepare test inputs
3. Configure API keys for failure scenarios
4. Set up screenshot capture tools

### Phase 2: Execution (2 days)
1. Run each scenario 3 times
2. Capture screenshots for each
3. Record metrics:
   - Response times
   - Realism scores
   - Fatigue levels
   - Warnings issued
   - Fallback activations
4. Document any errors or unexpected behavior

### Phase 3: Analysis (1 day)
1. Calculate aggregate metrics
2. Identify patterns
3. Document edge cases
4. Create results summary table

### Phase 4: Documentation (1 day)
1. Write evaluation results section
2. Create comparison charts
3. Prepare screenshots for presentation
4. Document lessons learned

---

## Results Summary Template

### Overall Metrics

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Route Structure Compliance | >90% | [X]% | ✅/❌ |
| Average Realism Score | >70 | [Y] | ✅/❌ |
| Fatigue Accuracy | >85% | [Z]% | ✅/❌ |
| Warning Quality | 100% | [W]% | ✅/❌ |
| Fallback Reliability | 100% | [V]% | ✅/❌ |
| Avg Response Time | <15s | [T]s | ✅/❌ |
| Provider Resilience | 100% | [U]% | ✅/❌ |

### Scenario Results

| Scenario | Pass/Fail | Notes |
|----------|-----------|-------|
| 1. Standard Multi-Country | ✅/❌ | |
| 2. Rushed Trip | ✅/❌ | |
| 3. Single Country Multi-City | ✅/❌ | |
| 4. Single City | ✅/❌ | |
| 5. OpenAI Failure | ✅/❌ | |
| 6. Claude Disabled | ✅/❌ | |
| 7. Google Maps Missing | ✅/❌ | |
| 8. Hotel/Flight APIs Missing | ✅/❌ | |

### Key Findings
- [Summary of successful scenarios]
- [Edge cases discovered]
- [System limitations identified]
- [Unexpected behaviors]

---

## Screenshot Checklist

For each scenario, capture:
- [ ] Analysis form with inputs
- [ ] Loading state (if visible)
- [ ] Recommendation cards (all 3)
- [ ] Route details
- [ ] Warnings/alerts (if present)
- [ ] Fatigue level indicator
- [ ] Realism score
- [ ] Any error messages (for failure scenarios)

---

## Success Criteria

**Evaluation is successful if:**
- ✅ All 8 core scenarios executed
- ✅ Metrics calculated for each
- ✅ Screenshots captured
- ✅ Results documented
- ✅ Pass/fail determined for each scenario
- ✅ Overall system performance assessed
- ✅ Limitations identified
- ✅ Results ready for presentation

**Minimum passing threshold:**
- 7/8 scenarios must pass
- Fallback reliability must be 100%
- No critical system crashes
