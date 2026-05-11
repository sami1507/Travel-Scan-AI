# TravelScan AI - Project Architecture Documentation

## Overview

This document provides a comprehensive architectural overview of TravelScan AI, including system components, data flows, and key design decisions.

---

## 1. System Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend<br/>React + TypeScript]
        Auth[Supabase Auth Client]
    end
    
    subgraph "Application Layer"
        API[Next.js API Routes<br/>Server Actions]
        Middleware[Authentication<br/>Rate Limiting]
        Validation[Input Validation<br/>Zod Schemas]
    end
    
    subgraph "AI Pipeline Layer"
        Engine[Travel Analysis Engine]
        OpenAI[OpenAI GPT-4o<br/>Primary AI]
        Claude[Claude 3.5 Sonnet<br/>Optional Verifier]
        Fallback[Fallback Route Library<br/>Deterministic]
    end
    
    subgraph "External Services"
        SupabaseDB[(Supabase<br/>PostgreSQL)]
        GoogleMaps[Google Maps API<br/>Optional]
        Duffel[Duffel API<br/>Optional]
        Hotelbeds[Hotelbeds API<br/>Optional]
    end
    
    UI --> Auth
    UI --> API
    Auth --> SupabaseDB
    API --> Middleware
    Middleware --> Validation
    Validation --> Engine
    Engine --> OpenAI
    Engine --> Claude
    Engine --> Fallback
    Engine --> GoogleMaps
    Engine --> Duffel
    Engine --> Hotelbeds
    Engine --> SupabaseDB
    
    style UI fill:#e1f5ff
    style Engine fill:#fff4e6
    style OpenAI fill:#d4edda
    style Claude fill:#d4edda
    style Fallback fill:#f8d7da
    style SupabaseDB fill:#e2e3e5
```

### Component Breakdown

**Client Layer:**
- Next.js 15 with App Router
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- Supabase Auth client for authentication

**Application Layer:**
- Next.js API routes for backend logic
- Server Actions for data mutations
- Authentication middleware
- Rate limiting per user
- Zod schema validation

**AI Pipeline Layer:**
- Travel Analysis Engine (core logic)
- OpenAI GPT-4o integration
- Claude 3.5 Sonnet verifier (optional)
- Fallback route library (deterministic)

**External Services:**
- Supabase PostgreSQL (user data, saved trips)
- Google Maps API (geocoding, optional)
- Duffel API (flights, optional)
- Hotelbeds API (hotels, optional)

---

## 2. AI Recommendation Pipeline

### AI Pipeline Flow Diagram

```mermaid
flowchart TD
    Start([User Submits Analysis Request]) --> Validate[Validate Input<br/>Zod Schema]
    Validate --> BuildContext[Build Analysis Context<br/>9 User Inputs]
    BuildContext --> CheckOpenAI{OpenAI<br/>Available?}
    
    CheckOpenAI -->|Yes| CallOpenAI[Call OpenAI GPT-4o<br/>Structured Output]
    CheckOpenAI -->|No| ActivateFallback[Activate Fallback Library]
    
    CallOpenAI --> ParseResponse[Parse JSON Response<br/>Zod Validation]
    ParseResponse --> ValidResponse{Valid<br/>Response?}
    
    ValidResponse -->|Yes| CheckClaude{Claude<br/>Enabled?}
    ValidResponse -->|No| ActivateFallback
    
    CheckClaude -->|Yes| CallClaude[Call Claude Verifier<br/>Validate Realism]
    CheckClaude -->|No| CalculateScores
    
    CallClaude --> MergeResults[Merge AI Results<br/>Flag Discrepancies]
    MergeResults --> CalculateScores[Calculate Scores<br/>Realism + Fatigue]
    
    ActivateFallback --> MatchConstraints[Match User Constraints<br/>to Curated Routes]
    MatchConstraints --> SelectBest[Select Top 3 Routes]
    SelectBest --> CalculateScores
    
    CalculateScores --> FormatOutput[Format for UI<br/>Add Warnings]
    FormatOutput --> CacheResult[Cache Result<br/>Optional]
    CacheResult --> ReturnToUser([Return Recommendations])
    
    style Start fill:#e1f5ff
    style CallOpenAI fill:#d4edda
    style CallClaude fill:#d4edda
    style ActivateFallback fill:#f8d7da
    style ReturnToUser fill:#e1f5ff
```

### Pipeline Steps Explained

**Step 1: Input Validation**
- Validate 9 user inputs against Zod schema
- Ensure all required fields present
- Check data types and ranges
- Reject invalid requests early

**Step 2: Build Analysis Context**
- Combine user inputs into structured prompt
- Add system instructions
- Format for AI consumption
- Include constraints and preferences

**Step 3: Primary AI Generation (OpenAI)**
- Call GPT-4o with structured output format
- Request JSON matching Zod schema
- Set temperature to 0.3 for consistency
- Track token usage and cost

**Step 4: Response Validation**
- Parse JSON response
- Validate against Zod schema
- Check all required fields present
- Verify data types and ranges

**Step 5: Optional Verification (Claude)**
- If enabled, send recommendation to Claude
- Request realism validation
- Compare with OpenAI output
- Flag significant discrepancies

**Step 6: Fallback Activation**
- Triggered if OpenAI fails or returns invalid data
- Match user constraints to curated routes
- Select top 3 matching routes
- Format as standard recommendation

**Step 7: Score Calculation**
- Calculate route realism score (0-100)
- Determine travel fatigue level (Low/Med/High)
- Compute confidence score
- Add warnings if needed

**Step 8: Output Formatting**
- Structure data for UI display
- Add consultant notes
- Include warnings and alternatives
- Return to user

---

## 3. Provider Fallback Flow

### Fallback Mechanism Diagram

```mermaid
flowchart TD
    Request([Analysis Request]) --> TryOpenAI{Try OpenAI<br/>GPT-4o}
    
    TryOpenAI -->|Success| ValidateOpenAI{Valid<br/>Response?}
    TryOpenAI -->|Timeout/Error| LogError1[Log Error:<br/>OpenAI Failed]
    
    ValidateOpenAI -->|Yes| CheckClaude{Claude<br/>Enabled?}
    ValidateOpenAI -->|No| LogError2[Log Error:<br/>Invalid Response]
    
    LogError1 --> ActivateFallback[Activate Fallback Library]
    LogError2 --> ActivateFallback
    
    CheckClaude -->|Yes| TryClaude{Try Claude<br/>Verifier}
    CheckClaude -->|No| Success1([Return OpenAI Result])
    
    TryClaude -->|Success| MergeAI[Merge AI Results]
    TryClaude -->|Error| LogWarning[Log Warning:<br/>Claude Failed]
    
    MergeAI --> Success2([Return Verified Result])
    LogWarning --> Success1
    
    ActivateFallback --> MatchRoutes[Match User Constraints<br/>to Route Library]
    MatchRoutes --> HasMatches{Found<br/>Matches?}
    
    HasMatches -->|Yes| SelectTop3[Select Top 3 Routes]
    HasMatches -->|No| DefaultRoute[Return Default Route]
    
    SelectTop3 --> Success3([Return Fallback Result])
    DefaultRoute --> Success3
    
    style Request fill:#e1f5ff
    style TryOpenAI fill:#fff4e6
    style TryClaude fill:#fff4e6
    style ActivateFallback fill:#f8d7da
    style Success1 fill:#d4edda
    style Success2 fill:#d4edda
    style Success3 fill:#d4edda
```

### Fallback Strategy

**Level 1: Primary AI (OpenAI)**
- First attempt: OpenAI GPT-4o
- Timeout: 30 seconds
- Retries: 2 attempts
- On failure: Proceed to fallback

**Level 2: Verifier (Claude - Optional)**
- Second layer: Claude 3.5 Sonnet
- Purpose: Validate realism
- On failure: Use OpenAI result only
- Not critical for operation

**Level 3: Fallback Library (Deterministic)**
- Last resort: Curated routes
- Guaranteed: 100% reliability
- Matching: Based on user constraints
- Quality: Pre-validated routes

**Graceful Degradation:**
- External APIs (Google Maps, Duffel, Hotelbeds) are optional
- System works without them
- Manual input accepted if APIs unavailable
- Estimates used instead of real-time data

---

## 4. User Flow

### Complete User Journey Diagram

```mermaid
flowchart TD
    Start([User Visits Landing Page]) --> ViewLanding[View Features<br/>& Benefits]
    ViewLanding --> Decide{Interested?}
    
    Decide -->|No| Leave([Leave Site])
    Decide -->|Yes| Signup[Sign Up<br/>Supabase Auth]
    
    Signup --> VerifyEmail[Verify Email<br/>Optional]
    VerifyEmail --> Login[Login to Dashboard]
    
    Login --> Dashboard[View Dashboard<br/>Stats & Overview]
    Dashboard --> StartAnalysis[Click "New Analysis"]
    
    StartAnalysis --> FillForm[Fill Analysis Form<br/>9 Input Fields]
    FillForm --> SelectStructure[Select Trip Structure<br/>Single/Multi-City/Country]
    SelectStructure --> Submit[Submit Request]
    
    Submit --> ShowLoading[Show Loading Animation<br/>Travel-Themed]
    ShowLoading --> ProcessAI[AI Processing<br/>5-15 seconds]
    
    ProcessAI --> ShowResults[Display Top 3<br/>Recommendations]
    ShowResults --> ReviewCard[Review Recommendation<br/>Route, Scores, Warnings]
    
    ReviewCard --> UserAction{User<br/>Action?}
    
    UserAction -->|View Details| ExpandCard[View Full Details<br/>Route Map, Notes]
    UserAction -->|Save Trip| SaveTrip[Save to Profile]
    UserAction -->|Feedback| SubmitFeedback[Thumbs Up/Down]
    UserAction -->|New Analysis| FillForm
    
    ExpandCard --> UserAction
    SaveTrip --> ViewSaved[View Saved Trips]
    SubmitFeedback --> UserAction
    
    ViewSaved --> Revisit{Revisit<br/>Later?}
    Revisit -->|Yes| Dashboard
    Revisit -->|No| Logout([Logout])
    
    style Start fill:#e1f5ff
    style ProcessAI fill:#fff4e6
    style ShowResults fill:#d4edda
    style Logout fill:#e2e3e5
```

### User Journey Steps

**1. Discovery (Landing Page)**
- User arrives at landing page
- Views value proposition
- Reads features and benefits
- Decides to try the service

**2. Authentication**
- Signs up with email/password
- Verifies email (optional)
- Logs in to dashboard

**3. Dashboard**
- Views overview and stats
- Sees saved trips (if any)
- Clicks "New Analysis" button

**4. Analysis Request**
- Fills 9-field guided form
- Selects trip structure (key decision)
- Submits request

**5. AI Processing**
- Sees travel-themed loading animation
- Waits 5-15 seconds
- Receives top 3 recommendations

**6. Review Results**
- Views recommendation cards
- Checks route details
- Reviews realism scores
- Reads warnings (if any)

**7. User Actions**
- View full details
- Save trip for later
- Provide feedback
- Start new analysis

**8. Return Visits**
- Access saved trips
- Review previous recommendations
- Create new analyses

---

## 5. Evaluation Workflow

### Test Scenario Execution Flow

```mermaid
flowchart TD
    Start([Begin Evaluation]) --> PrepareEnv[Prepare Test Environment<br/>Configure API Keys]
    PrepareEnv --> LoadScenarios[Load 8 Test Scenarios<br/>From Evaluation Plan]
    
    LoadScenarios --> ForEach{For Each<br/>Scenario}
    
    ForEach -->|Next| SetupTest[Setup Test Inputs<br/>Scenario Parameters]
    SetupTest --> ExecuteTest[Execute Analysis Request]
    
    ExecuteTest --> CaptureScreen[Capture Screenshot]
    CaptureScreen --> RecordMetrics[Record Metrics<br/>Scores, Times, Warnings]
    
    RecordMetrics --> CheckPass{Pass<br/>Criteria?}
    
    CheckPass -->|Yes| MarkPass[Mark PASS<br/>Document Results]
    CheckPass -->|No| MarkFail[Mark FAIL<br/>Document Issue]
    
    MarkPass --> MoreScenarios{More<br/>Scenarios?}
    MarkFail --> MoreScenarios
    
    MoreScenarios -->|Yes| ForEach
    MoreScenarios -->|No| CalculateAgg[Calculate Aggregate<br/>Metrics]
    
    CalculateAgg --> CreateTable[Create Results Table<br/>Pass/Fail Summary]
    CreateTable --> GenerateCharts[Generate Charts<br/>Score Distributions]
    GenerateCharts --> WriteReport[Write Evaluation<br/>Report]
    
    WriteReport --> End([Evaluation Complete])
    
    style Start fill:#e1f5ff
    style ExecuteTest fill:#fff4e6
    style MarkPass fill:#d4edda
    style MarkFail fill:#f8d7da
    style End fill:#e1f5ff
```

### Evaluation Metrics Collected

**Per Scenario:**
- Input parameters
- Generated recommendations
- Route realism scores
- Travel fatigue levels
- Warnings issued
- Fallback activations
- Response times
- Pass/fail status

**Aggregate Metrics:**
- Route structure compliance (%)
- Average realism score
- Fatigue accuracy (%)
- Warning quality (%)
- Fallback reliability (%)
- Average response time (seconds)
- Overall success rate (%)

---

## 6. Data Flow Architecture

### Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Input"
        User[User Inputs<br/>9 Fields]
    end
    
    subgraph "Processing"
        Validate[Validation<br/>Zod Schema]
        Engine[Analysis Engine]
        AI[AI Providers<br/>OpenAI/Claude]
        Fallback[Fallback Library]
    end
    
    subgraph "Storage"
        Cache[(Cache<br/>Redis/Memory)]
        DB[(Database<br/>Supabase)]
    end
    
    subgraph "Output"
        Response[Recommendations<br/>JSON]
        UI[User Interface<br/>React]
    end
    
    User --> Validate
    Validate --> Engine
    Engine --> AI
    Engine --> Fallback
    AI --> Cache
    Engine --> Response
    Response --> UI
    Response --> DB
    DB --> UI
    
    style User fill:#e1f5ff
    style AI fill:#d4edda
    style Fallback fill:#f8d7da
    style UI fill:#e1f5ff
```

---

## 7. Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Icons:** Lucide React
- **Animations:** CSS keyframes + Tailwind
- **Forms:** React Hook Form (if used)

### Backend
- **Runtime:** Node.js
- **Framework:** Next.js API Routes + Server Actions
- **Language:** TypeScript
- **Validation:** Zod
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL

### AI & ML
- **Primary AI:** OpenAI GPT-4o
- **Verifier:** Anthropic Claude 3.5 Sonnet
- **SDKs:** OpenAI SDK, Anthropic SDK
- **Prompt Engineering:** Structured output with JSON schema
- **Validation:** Zod schema enforcement

### External APIs
- **Maps:** Google Maps API (optional)
- **Flights:** Duffel API (optional)
- **Hotels:** Hotelbeds API (optional)

### DevOps
- **Deployment:** Vercel
- **Version Control:** Git + GitHub
- **CI/CD:** Vercel automatic deployments
- **Monitoring:** Vercel Analytics (if enabled)

---

## 8. Key Design Decisions

### 1. Hybrid AI Approach
**Decision:** Use OpenAI + optional Claude + deterministic fallback

**Rationale:**
- OpenAI provides creative recommendations
- Claude adds verification layer
- Fallback ensures 100% reliability
- Best of both worlds: AI creativity + guaranteed uptime

**Trade-offs:**
- Increased complexity
- Higher API costs (if Claude enabled)
- Longer response times with verification

---

### 2. Structured Output with Zod
**Decision:** Enforce JSON schema validation on all AI responses

**Rationale:**
- Prevents hallucinations from breaking UI
- Ensures consistent data structure
- Enables type safety in TypeScript
- Allows graceful fallback on invalid data

**Trade-offs:**
- More rigid than free-form text
- Requires careful prompt engineering
- May limit AI creativity slightly

---

### 3. Route Realism Scoring
**Decision:** Quantify route quality with 0-100 score

**Rationale:**
- Provides objective quality metric
- Helps users compare recommendations
- Validates AI suggestions
- Prevents unrealistic routes

**Components:**
- Geographic coherence (30%)
- Transfer feasibility (25%)
- Time allocation (20%)
- Seasonal appropriateness (15%)
- Budget alignment (10%)

---

### 4. Travel Fatigue Analysis
**Decision:** Categorize trips as Low/Medium/High fatigue

**Rationale:**
- Prevents exhausting itineraries
- Warns users about rushed trips
- Improves trip quality
- Unique feature vs. competitors

**Thresholds:**
- Low: ≤1 city per 4+ days
- Medium: 1 city per 2-3 days
- High: >1 city per 2 days

---

### 5. Graceful Degradation
**Decision:** System works even when external APIs fail

**Rationale:**
- Ensures reliability
- Reduces dependency on third parties
- Provides consistent user experience
- Fallback library guarantees uptime

**Implementation:**
- OpenAI fails → Fallback library
- Google Maps missing → Manual input
- Duffel/Hotelbeds missing → Estimates

---

### 6. Next.js App Router
**Decision:** Use Next.js 15 with App Router (not Pages Router)

**Rationale:**
- Modern React Server Components
- Better performance
- Improved routing
- Server Actions for mutations

**Trade-offs:**
- Steeper learning curve
- Some features still experimental
- Migration from Pages Router complex

---

## 9. Security Considerations

### Authentication
- Supabase Auth with email/password
- JWT tokens for session management
- Row-level security in database
- Server-side auth checks

### API Key Protection
- All keys server-side only
- Never exposed to client
- Environment variables
- Not committed to Git

### Input Validation
- Zod schema validation
- XSS prevention
- SQL injection prevention (parameterized queries)
- Rate limiting per user

### Data Privacy
- User data encrypted at rest (Supabase)
- HTTPS for all connections
- No sensitive data in logs
- GDPR compliance considerations

---

## 10. Performance Optimizations

### Caching
- AI responses cached (optional)
- Static pages pre-rendered
- API responses cached where appropriate

### Code Splitting
- Next.js automatic code splitting
- Lazy loading for heavy components
- Dynamic imports for optional features

### Database
- Indexed queries
- Connection pooling (Supabase)
- Efficient query design

### AI Optimization
- Temperature 0.3 for consistency
- Token usage tracking
- Cost monitoring
- Timeout limits (30s)

---

## 11. Scalability Considerations

### Current Architecture
- Serverless (Vercel)
- Auto-scaling
- No server management
- Pay-per-use

### Bottlenecks
- AI API rate limits
- Database connections
- External API quotas

### Future Scaling
- Add caching layer (Redis)
- Implement queue system for high load
- Consider dedicated AI infrastructure
- Database read replicas

---

## 12. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        Dev[Local Development<br/>npm run dev]
    end
    
    subgraph "Version Control"
        Git[Git Repository<br/>GitHub]
    end
    
    subgraph "CI/CD"
        Vercel[Vercel Platform<br/>Auto Deploy]
    end
    
    subgraph "Production"
        Edge[Vercel Edge Network<br/>Global CDN]
        Functions[Serverless Functions<br/>API Routes]
        DB[(Supabase<br/>PostgreSQL)]
    end
    
    subgraph "External"
        OpenAI[OpenAI API]
        Claude[Anthropic API]
        Maps[Google Maps API]
    end
    
    Dev --> Git
    Git --> Vercel
    Vercel --> Edge
    Vercel --> Functions
    Functions --> DB
    Functions --> OpenAI
    Functions --> Claude
    Functions --> Maps
    
    style Dev fill:#e1f5ff
    style Vercel fill:#fff4e6
    style Edge fill:#d4edda
    style DB fill:#e2e3e5
```

---

## Conclusion

TravelScan AI's architecture is designed for:
- **Reliability:** Hybrid AI + fallback ensures 100% uptime
- **Quality:** Realism scoring + fatigue analysis prevent bad recommendations
- **Scalability:** Serverless architecture scales automatically
- **Maintainability:** Clean separation of concerns, TypeScript safety
- **User Experience:** Fast, responsive, professional interface

The combination of modern web technologies, AI capabilities, and thoughtful design decisions creates a production-ready travel planning system that fills a clear gap in the market.
