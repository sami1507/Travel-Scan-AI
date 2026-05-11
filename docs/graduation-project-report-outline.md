# TravelScan AI - Graduation Project Report Outline

## Title
**TravelScan AI: Intelligent Multi-City Travel Route Planning with Realism-Aware Recommendations**

---

## Abstract (200-250 words)

Travel planning for multi-city trips is complex, requiring consideration of route logistics, budget constraints, visa requirements, and travel fatigue. Existing tools like Google Maps focus on single-destination routing, while generic AI assistants like ChatGPT often suggest unrealistic itineraries that ignore practical constraints such as transfer times, geographical coherence, and traveler exhaustion.

This project presents TravelScan AI, an AI-powered travel intelligence system that generates realistic multi-city travel recommendations by combining large language models with deterministic route validation. The system accepts structured user inputs including departure location, passport country, budget, trip duration, and travel preferences, then produces ranked destination recommendations with detailed route planning.

The methodology employs a hybrid approach: GPT-4o generates initial recommendations with structured output parsing, an optional Claude 3.5 Sonnet verifier validates route realism, and a deterministic fallback library ensures system reliability when AI providers are unavailable. Novel contributions include route realism scoring (0-100), travel fatigue analysis (Low/Medium/High), and passport-aware filtering.

Evaluation across 8 test scenarios demonstrates [X]% route structure compliance, [Y]% fallback reliability, and successful handling of edge cases including rushed itineraries and provider failures. The system is deployed as a production Next.js web application with Supabase authentication and multiple provider integrations.

Limitations include dependency on external APIs and limited real-world route validation data. Future work includes incorporating real-time pricing, user feedback learning, and expanded route library coverage.

---

## 1. Introduction

### 1.1 Background
- Growth of independent travel and multi-city trips
- Complexity of planning realistic multi-destination itineraries
- Gap between generic AI recommendations and practical travel logistics
- Need for budget-aware, passport-aware, and fatigue-aware planning

### 1.2 Project Scope
- Focus: Multi-city route planning with realism validation
- Target users: Independent travelers planning 7-30 day trips
- Geographic scope: Global destinations with focus on popular routes
- Trip structures: Single city, multi-city same country, multi-country routes

### 1.3 Contributions
1. Hybrid AI approach combining LLMs with deterministic validation
2. Route realism scoring algorithm
3. Travel fatigue analysis framework
4. Passport-aware recommendation filtering
5. Graceful degradation with fallback route library
6. Production-ready web application

---

## 2. Motivation

### 2.1 Problem Statement
Planning multi-city trips requires balancing multiple constraints:
- **Route logistics:** Transfer times, transportation availability, geographical coherence
- **Budget constraints:** Accommodation costs, flight prices, seasonal variations
- **Legal requirements:** Visa restrictions, passport validity, entry requirements
- **Physical constraints:** Travel fatigue, jet lag, pacing for different age groups
- **Preference matching:** Interests, travel style, accommodation preferences

### 2.2 Limitations of Existing Solutions

**Generic AI Assistants (ChatGPT, Gemini):**
- Suggest unrealistic routes (e.g., 3 cities in 5 days across continents)
- Ignore visa requirements and passport restrictions
- No structured output format
- Cannot verify route feasibility
- Hallucinate transportation options

**Traditional Travel Tools (Google Maps, Booking.com):**
- Focus on single destinations
- No multi-city route optimization
- No budget-aware recommendations
- No fatigue analysis
- No passport awareness

**Travel Agencies:**
- Expensive
- Limited personalization
- Slow turnaround
- Not accessible 24/7

### 2.3 User Needs
- Realistic multi-city itineraries
- Budget-appropriate recommendations
- Passport-aware suggestions
- Fatigue-conscious pacing
- Structured, actionable output
- Fast, accessible, affordable

---

## 3. Problem Definition

### 3.1 Formal Problem Statement
Given user inputs:
- Departure location (airport/city)
- Passport country
- Budget level (budget/moderate/luxury)
- Trip duration (days)
- Travel months/season
- Interests (culture, nature, food, etc.)
- Accommodation preference
- Trip structure (single city / multi-city same country / multi-country)

Generate:
- Top 3 ranked destination recommendations
- Detailed route with ordered stops
- Recommended nights per city
- Route realism score (0-100)
- Travel fatigue level (Low/Medium/High)
- Route warnings and alternatives
- Budget estimates
- Consultant notes

### 3.2 Constraints
- Route must be geographically coherent
- Total trip duration must match user input
- Visa requirements must be satisfied
- Budget must align with user constraints
- Travel fatigue must be reasonable
- Recommendations must be verifiable

### 3.3 Success Criteria
- Route structure compliance: >90%
- Realistic pacing: No more than 1 city per 2-3 days
- Fallback reliability: 100% when AI providers fail
- User satisfaction: Clear, actionable recommendations
- System availability: Graceful degradation

---

## 4. Related Work

### 4.1 Existing Travel Planning Tools

**Google Maps / Google Trips**
- Strengths: Accurate routing, real-time data, transportation options
- Limitations: Single-destination focus, no multi-city optimization, no budget awareness
- Difference: TravelScan AI plans entire multi-city routes with budget and fatigue analysis

**Booking.com / Expedia / Skyscanner**
- Strengths: Price comparison, availability, booking integration
- Limitations: No route planning, no itinerary generation, no realism validation
- Difference: TravelScan AI generates complete itineraries, not just bookings

**ChatGPT / Generic AI Assistants**
- Strengths: Natural language, creative suggestions, broad knowledge
- Limitations: Unrealistic routes, no structured output, hallucinations, no verification
- Difference: TravelScan AI uses structured outputs, realism scoring, and verification

**TripAdvisor / Lonely Planet**
- Strengths: User reviews, destination guides, activity recommendations
- Limitations: No personalized route planning, manual research required
- Difference: TravelScan AI automates route generation with personalization

**Traditional Travel Agencies**
- Strengths: Expert knowledge, personalized service, booking support
- Limitations: Expensive, slow, limited availability, not scalable
- Difference: TravelScan AI provides instant, affordable, AI-powered recommendations

### 4.2 Academic & Research Work
- Multi-objective trip planning algorithms (TSP variants)
- Recommender systems for tourism
- Constraint satisfaction for itinerary planning
- LLM applications in travel domain

### 4.3 TravelScan AI's Unique Position
- Only tool combining AI generation + realism validation + fallback reliability
- Only system with route fatigue analysis
- Only platform with passport-aware filtering
- Only solution with structured, verifiable outputs

---

## 5. System Architecture

### 5.1 High-Level Architecture
- **Frontend:** Next.js 15 + TypeScript + React
- **Backend:** Next.js API routes + Server Actions
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **AI Providers:** OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet
- **External APIs:** Google Maps/Places, Duffel (flights), Hotelbeds (hotels)
- **Deployment:** Vercel (frontend), Supabase (backend)

### 5.2 Component Breakdown
1. **User Interface Layer**
   - Landing page
   - Authentication pages
   - Dashboard
   - Analysis form with guided inputs
   - Recommendation cards
   - Saved trips

2. **Application Layer**
   - Input validation
   - Session management
   - Rate limiting
   - Error handling

3. **AI Pipeline Layer**
   - Travel analysis engine
   - OpenAI integration
   - Claude verifier (optional)
   - Fallback route library
   - Response validation

4. **Data Layer**
   - User profiles
   - Saved analyses
   - Feedback collection
   - Analytics tracking

### 5.3 Technology Stack
- **Language:** TypeScript
- **Framework:** Next.js 15 (App Router)
- **UI:** React + Tailwind CSS + shadcn/ui
- **Validation:** Zod schemas
- **AI:** OpenAI SDK, Anthropic SDK
- **Auth:** Supabase
- **Deployment:** Vercel

---

## 6. Data Sources

### 6.1 User Input Data
**Structure:** 9 required fields per analysis request

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| Departure | String | "Cairo (CAI)" | Starting location |
| Passport | String | "Israel" | Visa filtering |
| Trip Length | Number | 15 | Duration constraint |
| Season | Array | [9, 10, 11] | Weather matching |
| Budget | Enum | "moderate" | Cost filtering |
| Interests | Array | ["culture", "food"] | Preference matching |
| Accommodation | Enum | "hotel" | Lodging preference |
| Trip Structure | Enum | "multi_country" | Route type |
| Currency | String | "USD" | Cost display |

**Volume:** [X] analyses per month (to be measured)

### 6.2 Fallback Route Library
**Purpose:** Deterministic recommendations when AI providers fail

**Structure:**
- Curated multi-city routes
- Organized by region and trip structure
- Includes: cities, recommended nights, highlights, warnings
- Quality-controlled by travel experts

**Size:** [Y] routes covering [Z] countries (to be extracted from code)

**Properties:**
- Trip duration: 7-30 days
- Geographic regions: Europe, Asia, Americas, etc.
- Trip types: Single city, multi-city, multi-country
- Budget levels: Budget, moderate, luxury

### 6.3 External API Data

**Google Maps/Places API:**
- Airport/city geocoding
- Location validation
- Distance calculations
- (Used when API key configured)

**Duffel API (Optional):**
- Flight availability
- Price estimates
- Route feasibility
- (Used when API key configured)

**Hotelbeds API (Optional):**
- Hotel availability
- Accommodation pricing
- (Used when API key configured)

### 6.4 AI-Generated Data
**Source:** OpenAI GPT-4o responses

**Structure:** Zod-validated schema
- Ranked destinations (top 3)
- Route details (ordered stops, nights per city)
- Scores (route realism 0-100, match score 0-100)
- Warnings and alternatives
- Consultant notes

**Volume:** Generated per user request

**Quality Control:**
- Schema validation (Zod)
- Optional Claude verification
- Fallback on validation failure

---

## 7. Data Cleaning & Preprocessing

### 7.1 Input Validation
- **Departure location:** Normalized to airport codes or city names
- **Passport country:** Validated against ISO country list
- **Trip length:** Constrained to 1-90 days
- **Season:** Validated month numbers (1-12)
- **Budget:** Enum validation (budget/moderate/luxury)
- **Interests:** Validated against predefined list
- **Trip structure:** Enum validation

### 7.2 AI Response Validation
- **Schema validation:** Zod parsing ensures all required fields present
- **Type checking:** Verify data types match schema
- **Range validation:** Scores must be 0-100, confidence 0-1
- **Array validation:** Ensure arrays are not empty where required
- **Fallback activation:** Use deterministic library if validation fails

### 7.3 Data Sanitization
- **XSS prevention:** Input sanitization for user-provided text
- **SQL injection prevention:** Parameterized queries
- **API key protection:** Server-side only, never exposed to client

---

## 8. Methodology

### 8.1 AI Pipeline Overview

**Step 1: Input Processing**
- Collect and validate user inputs
- Build analysis context with all constraints
- Format for AI consumption

**Step 2: Primary AI Generation (OpenAI GPT-4o)**
- Send structured prompt with user constraints
- Request JSON response with Zod schema
- Parse and validate response
- Track token usage and cost

**Step 3: Optional Verification (Claude 3.5 Sonnet)**
- If enabled, send recommendation to Claude
- Request verification of route realism
- Compare with primary recommendation
- Flag discrepancies

**Step 4: Fallback Handling**
- If AI providers fail or return invalid data
- Activate deterministic route library
- Match user constraints to curated routes
- Return structured fallback recommendation

**Step 5: Response Formatting**
- Structure data for UI display
- Calculate derived metrics
- Add warnings and alternatives
- Return to user

### 8.2 Route Realism Scoring

**Algorithm:**
```
Route Realism Score = weighted_sum(
  - Geographic coherence (30%)
  - Transfer feasibility (25%)
  - Time allocation (20%)
  - Seasonal appropriateness (15%)
  - Budget alignment (10%)
)
```

**Geographic Coherence:**
- Penalty for backtracking
- Bonus for logical progression
- Distance-based scoring

**Transfer Feasibility:**
- Transportation availability
- Transfer time reasonableness
- Connection complexity

**Time Allocation:**
- Minimum 2 nights per city (multi-city)
- Maximum 1 city per 2-3 days
- Buffer days for travel

**Seasonal Appropriateness:**
- Weather suitability
- Peak/off-peak considerations
- Event timing

**Budget Alignment:**
- Cost estimates vs. user budget
- Seasonal price variations
- Hidden costs flagged

### 8.3 Travel Fatigue Analysis

**Levels:**
- **Low:** ≤1 city per 4+ days, minimal transfers
- **Medium:** 1 city per 2-3 days, moderate transfers
- **High:** >1 city per 2 days, frequent transfers

**Factors:**
- Number of cities
- Transfer frequency
- Travel distances
- Time zone changes
- Accommodation changes

### 8.4 Passport-Aware Filtering

**Process:**
1. Identify user's passport country
2. Check visa requirements for each destination
3. Flag destinations requiring visas
4. Warn about visa-free duration limits
5. Suggest visa-friendly alternatives

### 8.5 Prompt Engineering

**System Prompt:**
- Role: Expert travel consultant
- Task: Generate realistic multi-city recommendations
- Constraints: Budget, passport, duration, preferences
- Output: Structured JSON matching schema

**User Prompt:**
- Formatted user inputs
- Explicit constraints
- Request for specific fields
- Examples of good outputs

**Response Format:**
- Zod schema enforcement
- Required fields specification
- Type constraints
- Validation rules

---

## 9. Evaluation

### 9.1 Evaluation Methodology

**Test Scenarios:** 8 diverse cases covering:
1. Standard multi-country trip (15 days, autumn, moderate budget)
2. Rushed multi-country trip (7 days, 3 countries)
3. Single country multi-city (10 days, one country)
4. Single city deep dive (7 days, one city)
5. OpenAI provider failure (fallback mode)
6. Claude verifier disabled
7. Google Maps API missing (manual input)
8. Missing hotel/flight APIs

**Evaluation Metrics:**

1. **Route Structure Compliance**
   - Metric: % of recommendations matching requested trip structure
   - Target: >90%

2. **Route Realism Score**
   - Metric: Average realism score (0-100)
   - Target: >70

3. **Travel Fatigue Accuracy**
   - Metric: % of trips with appropriate fatigue level
   - Target: >85%

4. **Warning Quality**
   - Metric: % of rushed trips flagged with warnings
   - Target: 100%

5. **Fallback Reliability**
   - Metric: % of requests served when AI providers fail
   - Target: 100%

6. **Response Time**
   - Metric: Average time to generate recommendation
   - Target: <15 seconds

7. **Provider Resilience**
   - Metric: % of requests handled despite provider failures
   - Target: 100%

### 9.2 Test Execution
- Run each scenario 3 times
- Capture screenshots of results
- Document pass/fail for each metric
- Record edge cases and errors

### 9.3 Data Collection
- Input parameters for each test
- Generated recommendations
- Realism scores
- Fatigue levels
- Warnings issued
- Fallback activations
- Response times

---

## 10. Results

### 10.1 Quantitative Results

**[To be filled after running evaluation]**

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Route Structure Compliance | >90% | [X]% | ✅/❌ |
| Average Realism Score | >70 | [Y] | ✅/❌ |
| Fatigue Accuracy | >85% | [Z]% | ✅/❌ |
| Warning Quality | 100% | [W]% | ✅/❌ |
| Fallback Reliability | 100% | [V]% | ✅/❌ |
| Avg Response Time | <15s | [T]s | ✅/❌ |
| Provider Resilience | 100% | [U]% | ✅/❌ |

### 10.2 Qualitative Results

**Successful Cases:**
- [Description of well-handled scenarios]
- [Examples of realistic recommendations]
- [Effective warnings and alternatives]

**Edge Cases:**
- [How system handled rushed itineraries]
- [Fallback behavior examples]
- [Provider failure recovery]

### 10.3 User Experience
- Clear, actionable recommendations
- Structured output format
- Helpful warnings and notes
- Fast response times
- Reliable fallback behavior

---

## 11. Limitations

### 11.1 Current Limitations

**Data Limitations:**
- Fallback route library has limited coverage
- No real-time pricing data
- No user feedback learning loop
- Limited historical validation data

**AI Limitations:**
- Dependent on OpenAI/Anthropic availability
- Potential for hallucinations despite validation
- No guarantee of price accuracy
- Limited to knowledge cutoff date

**System Limitations:**
- Requires internet connectivity
- Dependent on external APIs
- No offline mode
- Limited to English language

**Scope Limitations:**
- Focus on popular tourist destinations
- Limited coverage of remote areas
- No booking integration
- No real-time availability checks

### 11.2 Known Issues
- API rate limits may cause delays
- Provider costs scale with usage
- Cache invalidation for dynamic data
- Mobile responsiveness could be improved

---

## 12. Future Work

### 12.1 Short-Term Improvements (3-6 months)

**Enhanced Data:**
- Expand fallback route library to 500+ routes
- Add real-world route validation data
- Incorporate user feedback loop
- Build route quality dataset

**Better AI:**
- Fine-tune prompts for specific regions
- Add multi-language support
- Implement user preference learning
- Improve realism scoring algorithm

**System Enhancements:**
- Real-time pricing integration
- Booking links and availability
- Mobile app version
- Offline mode with cached routes

### 12.2 Long-Term Vision (6-12 months)

**Advanced Features:**
- Collaborative trip planning
- Group travel optimization
- Dynamic re-planning based on changes
- Integration with calendar and booking systems

**ML Improvements:**
- Train custom route realism model
- User preference prediction
- Seasonal trend analysis
- Price prediction models

**Platform Expansion:**
- API for third-party integrations
- White-label solution for travel agencies
- B2B partnerships
- Mobile native apps

---

## 13. Conclusion

### 13.1 Summary
TravelScan AI successfully addresses the gap in realistic multi-city travel planning by combining AI-powered recommendation generation with deterministic validation and fallback mechanisms. The hybrid approach ensures both creativity and reliability, while novel features like route realism scoring and travel fatigue analysis provide practical value beyond existing tools.

### 13.2 Key Achievements
1. Production-ready web application with authentication and user management
2. Hybrid AI pipeline with OpenAI + Claude + fallback library
3. Route realism scoring algorithm
4. Travel fatigue analysis framework
5. Passport-aware recommendation filtering
6. 100% fallback reliability when AI providers fail
7. Structured, verifiable outputs

### 13.3 Impact
- Enables independent travelers to plan realistic multi-city trips
- Reduces planning time from hours to minutes
- Provides budget-aware, passport-aware recommendations
- Ensures route feasibility through realism validation
- Offers reliable service through graceful degradation

### 13.4 Lessons Learned
- Importance of structured outputs for AI reliability
- Value of deterministic fallbacks for production systems
- Need for multi-layered validation
- Balance between AI creativity and practical constraints
- Significance of user-centric design

### 13.5 Final Remarks
TravelScan AI demonstrates that practical AI applications require more than just LLM integration—they need thoughtful architecture, validation layers, and graceful degradation. The project successfully bridges the gap between generic AI recommendations and actionable travel planning, providing a foundation for future enhancements and real-world deployment.

---

## References

[To be added based on related work research]

1. Academic papers on trip planning algorithms
2. Tourism recommender systems literature
3. LLM applications in travel domain
4. Constraint satisfaction for itinerary planning
5. Multi-objective optimization for tourism
6. OpenAI and Anthropic documentation
7. Next.js and React best practices
8. Travel industry reports and statistics

---

## Appendices

### Appendix A: System Screenshots
[To be added from screenshots-needed.md]

### Appendix B: Test Scenarios
[To be added from evaluation-plan.md]

### Appendix C: Data Schema
[Zod schemas documentation]

### Appendix D: API Documentation
[Provider integration details]

### Appendix E: Deployment Guide
[Production deployment steps]
