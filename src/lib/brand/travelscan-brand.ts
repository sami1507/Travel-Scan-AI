/**
 * TravelScan Brand System
 * 
 * Source of truth for brand positioning, personality, voice, and visual direction.
 * This ensures consistency across all UI components and copy.
 */

export const BRAND_SYSTEM = {
  positioning: {
    tagline: 'AI Travel Consultant before booking',
    promise: 'Understand where to go, why, when, and how — before you pay.',
    differentiation: [
      'Route-first intelligence',
      'Honest about uncertainty',
      'Consultant-grade analysis',
      'Pre-booking clarity',
    ],
  },

  personality: {
    core: ['smart', 'calm', 'honest', 'practical', 'structured', 'premium-light', 'route-aware'],
    avoid: ['hype', 'urgency', 'cheap', 'generic', 'arrogant', 'childish'],
  },

  voice: {
    principles: [
      'Clear and consultant-like',
      'Confident but not arrogant',
      'Honest about uncertainty',
      'Explains why, not just what',
      'Avoids travel brochure language',
      'Direct and practical',
    ],
    examples: {
      good: [
        'Recommended Routes',
        'Why These Routes Fit',
        'Before You Book: Watch Outs',
        'Route Reality',
        'Planning Confidence',
        'Season & Budget Reality',
      ],
      bad: [
        'Perfect Trip',
        'Best Ever',
        'Unforgettable Journey',
        'World-Class',
        'Amazing Deals',
        'Limited Time Offer',
      ],
    },
  },

  forbiddenPhrases: [
    'perfect trip',
    'best ever',
    'unforgettable journey',
    'world-class',
    'cheap deal',
    'limited time',
    'act now',
    'don\'t miss out',
    'once in a lifetime',
    'guaranteed',
    'amazing',
    'incredible',
    'spectacular',
  ],

  preferredLanguage: {
    recommendations: 'Recommended Routes',
    insights: 'Why These Routes Fit',
    warnings: 'Before You Book: Watch Outs',
    confidence: 'Planning Confidence',
    analysis: 'Consultant Analysis',
    brief: 'AI Travel Consultant Brief',
    reality: 'Route Reality',
    season: 'Season & Budget Reality',
    notes: 'Consultant Notes',
  },

  visualDirection: {
    mood: 'Premium light, calm, intelligent, trustworthy',
    avoid: [
      'Loud travel agency style',
      'Cheap deals aggregator look',
      'Dark hacker aesthetic',
      'Generic blue SaaS dashboard',
      'Childish or playful',
    ],
    principles: [
      'Clean white/off-white backgrounds',
      'Deep navy text for readability',
      'Travel blue as primary accent',
      'Soft cyan/teal for intelligence features',
      'Amber for caution, green for confidence',
      'Red only for real risks',
      'Subtle gradients, not bold',
      'Soft borders and calm shadows',
      'Generous white space',
    ],
  },

  motionPrinciples: {
    philosophy: 'Subtle, premium, fast, smooth, not distracting',
    rules: [
      'Respect reduced motion preferences',
      'Use 180-320ms for small UI',
      'Max 400ms for section entrance',
      'Stagger 40-80ms between items',
      'Hover lift should be subtle',
      'Buttons have tap feedback',
      'Cards should not jump',
      'Motion should enhance, not distract',
    ],
  },

  componentNaming: {
    conventions: [
      'Descriptive and clear',
      'Avoid generic names like "Box" or "Container"',
      'Use domain language: Route, Consultant, Brief',
      'Prefix shared components with purpose',
    ],
    examples: {
      good: ['ConsultantPanel', 'RouteCard', 'TrustBadge', 'InsightBlock'],
      bad: ['Box', 'Thing', 'Item', 'Wrapper'],
    },
  },
} as const

export type BrandSystem = typeof BRAND_SYSTEM
