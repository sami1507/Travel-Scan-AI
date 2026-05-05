// Evaluation Scenarios - repeatable test cases for ML quality
import type { EvaluationScenario } from './ml-evaluator'

/**
 * Standard evaluation scenarios for recommendation quality
 */
export const evaluationScenarios: EvaluationScenario[] = [
  {
    scenarioId: 'budget-conscious-family',
    name: 'Budget-Conscious Family Travel',
    description: 'Family looking for affordable destinations with good safety and activities',
    userContext: {
      budget: 'low',
      travelStyle: 'family',
      interests: ['nature', 'culture'],
    },
    expectedBehavior: 'Should prioritize safe, affordable, family-friendly destinations',
    testCases: [
      {
        input: {
          query: 'affordable family vacation with nature and culture',
          budget: 'low',
          travelStyle: 'family',
          interests: ['nature', 'culture'],
        },
        expectedTopDestinations: ['Portugal', 'Greece', 'Croatia'],
        minimumAcceptanceRate: 0.7,
      },
    ],
  },
  {
    scenarioId: 'luxury-couple-beach',
    name: 'Luxury Couple Beach Vacation',
    description: 'Couple seeking luxury beach destination with good weather',
    userContext: {
      budget: 'luxury',
      travelStyle: 'couple',
      interests: ['beach', 'relaxation'],
    },
    expectedBehavior: 'Should prioritize luxury beach destinations with excellent weather',
    testCases: [
      {
        input: {
          query: 'luxury beach vacation for couple',
          budget: 'luxury',
          travelStyle: 'couple',
          interests: ['beach', 'relaxation'],
        },
        expectedTopDestinations: ['Maldives', 'Seychelles', 'Bora Bora'],
        minimumAcceptanceRate: 0.7,
      },
    ],
  },
  {
    scenarioId: 'solo-adventure-nature',
    name: 'Solo Adventure in Nature',
    description: 'Solo traveler seeking adventure and nature experiences',
    userContext: {
      budget: 'moderate',
      travelStyle: 'solo',
      interests: ['adventure', 'nature', 'hiking'],
    },
    expectedBehavior: 'Should prioritize safe adventure destinations with strong nature offerings',
    testCases: [
      {
        input: {
          query: 'solo adventure trip with hiking and nature',
          budget: 'moderate',
          travelStyle: 'solo',
          interests: ['adventure', 'nature', 'hiking'],
        },
        expectedTopDestinations: ['New Zealand', 'Iceland', 'Norway'],
        minimumAcceptanceRate: 0.7,
      },
    ],
  },
  {
    scenarioId: 'friends-nightlife-city',
    name: 'Friends Group City Nightlife',
    description: 'Group of friends seeking vibrant nightlife and city experiences',
    userContext: {
      budget: 'moderate',
      travelStyle: 'friends',
      interests: ['nightlife', 'culture', 'food'],
    },
    expectedBehavior: 'Should prioritize cities with strong nightlife and cultural scenes',
    testCases: [
      {
        input: {
          query: 'city trip with great nightlife and food for friends',
          budget: 'moderate',
          travelStyle: 'friends',
          interests: ['nightlife', 'culture', 'food'],
        },
        expectedTopDestinations: ['Barcelona', 'Berlin', 'Amsterdam'],
        minimumAcceptanceRate: 0.7,
      },
    ],
  },
  {
    scenarioId: 'seasonal-timing-summer',
    name: 'Summer Timing Sensitivity',
    description: 'Traveler specifically looking for summer destinations',
    userContext: {
      budget: 'moderate',
      travelMonths: [6, 7, 8],
    },
    expectedBehavior: 'Should prioritize destinations with excellent summer weather',
    testCases: [
      {
        input: {
          query: 'summer vacation destination',
          budget: 'moderate',
          travelMonths: [6, 7, 8],
        },
        expectedTopDestinations: ['Greece', 'Croatia', 'Spain'],
        minimumAcceptanceRate: 0.7,
      },
    ],
  },
  {
    scenarioId: 'route-complexity-multi-city',
    name: 'Multi-City Route Suitability',
    description: 'Traveler wanting to visit multiple cities in one trip',
    userContext: {
      budget: 'moderate',
      pace: 'moderate',
    },
    expectedBehavior: 'Should recommend routes with good transport connections and manageable distances',
    testCases: [
      {
        input: {
          query: 'multi-city Europe trip with good connections',
          budget: 'moderate',
          pace: 'moderate',
        },
        expectedTopDestinations: ['Paris', 'Amsterdam', 'Brussels'],
        minimumAcceptanceRate: 0.6,
      },
    ],
  },
  {
    scenarioId: 'accommodation-apartment-long-stay',
    name: 'Apartment for Long Stay',
    description: 'Traveler seeking apartment accommodation for extended stay',
    userContext: {
      budget: 'moderate',
      tripDuration: 14,
      travelStyle: 'family',
    },
    expectedBehavior: 'Should recommend destinations with good apartment options',
    testCases: [
      {
        input: {
          query: '2-week family trip with apartment stay',
          budget: 'moderate',
          travelStyle: 'family',
          tripDuration: 14,
        },
        expectedTopDestinations: ['Lisbon', 'Barcelona', 'Prague'],
        minimumAcceptanceRate: 0.6,
      },
    ],
  },
  {
    scenarioId: 'confidence-calibration-high-certainty',
    name: 'High Confidence Calibration',
    description: 'Clear user preferences should yield high confidence recommendations',
    userContext: {
      budget: 'luxury',
      travelStyle: 'couple',
      interests: ['beach'],
      travelMonths: [12, 1, 2],
    },
    expectedBehavior: 'Should return high-confidence recommendations for clear preferences',
    testCases: [
      {
        input: {
          query: 'luxury beach vacation in winter',
          budget: 'luxury',
          travelStyle: 'couple',
          interests: ['beach'],
          travelMonths: [12, 1, 2],
        },
        expectedTopDestinations: ['Maldives', 'Caribbean', 'Dubai'],
        minimumAcceptanceRate: 0.8,
      },
    ],
  },
]

/**
 * Get scenario by ID
 */
export function getScenario(scenarioId: string): EvaluationScenario | undefined {
  return evaluationScenarios.find(s => s.scenarioId === scenarioId)
}

/**
 * Get all scenario IDs
 */
export function getScenarioIds(): string[] {
  return evaluationScenarios.map(s => s.scenarioId)
}
