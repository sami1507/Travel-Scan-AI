// Evaluation layer for travel recommendation quality
// Tests recommendation ranking, confidence, and warning behavior

import { TravelAnalysisEngine } from './engine'
import type { TravelAnalysisResponse, UserConstraints } from './schemas'

export interface EvaluationScenario {
  id: string
  name: string
  description: string
  query: string
  constraints: UserConstraints
  expectedBehavior: {
    topDestinationShouldInclude?: string[]
    topDestinationShouldExclude?: string[]
    shouldHaveWarnings?: boolean
    minConfidence?: number
    maxConfidence?: number
    shouldRankHigher?: { destination: string; than: string }
  }
}

export interface EvaluationResult {
  scenarioId: string
  scenarioName: string
  passed: boolean
  issues: string[]
  analysis: TravelAnalysisResponse
  metrics: {
    topDestination: string
    confidence: number
    warningCount: number
    topScores: number[]
  }
}

export class RecommendationEvaluator {
  private scenarios: EvaluationScenario[] = [
    // Scenario 1: Budget constraint should filter expensive destinations
    {
      id: 'budget-filter-1',
      name: 'Budget Constraint Filtering',
      description: 'Low budget should exclude expensive destinations like Switzerland',
      query: 'Best European city for culture and food',
      constraints: {
        budget: 'budget',
        travelMonths: [6, 7, 8],
        interests: ['culture', 'food'],
      },
      expectedBehavior: {
        topDestinationShouldExclude: ['Zurich', 'Geneva', 'Oslo', 'Copenhagen'],
        topDestinationShouldInclude: ['Budapest', 'Prague', 'Krakow', 'Lisbon'],
        minConfidence: 0.6,
      },
    },

    // Scenario 2: Weather constraints should affect recommendations
    {
      id: 'weather-timing-1',
      name: 'Weather-Based Timing',
      description: 'Winter months should deprioritize beach destinations',
      query: 'Best beach destination in Europe',
      constraints: {
        budget: 'moderate',
        travelMonths: [12, 1, 2],
        interests: ['beach', 'nature'],
      },
      expectedBehavior: {
        shouldHaveWarnings: true,
        topDestinationShouldExclude: ['Greek Islands', 'Croatia'],
        minConfidence: 0.4,
        maxConfidence: 0.7,
      },
    },

    // Scenario 3: Safety concerns should trigger warnings
    {
      id: 'safety-warning-1',
      name: 'Safety Warning Detection',
      description: 'High safety importance should trigger warnings for risky destinations',
      query: 'Adventure travel in South America',
      constraints: {
        budget: 'moderate',
        travelMonths: [6, 7],
        interests: ['adventure', 'nature'],
      },
      expectedBehavior: {
        shouldHaveWarnings: true,
        minConfidence: 0.5,
      },
    },

    // Scenario 4: Specific interests should affect ranking
    {
      id: 'interest-ranking-1',
      name: 'Interest-Based Ranking',
      description: 'Nightlife interest should rank party cities higher',
      query: 'Best city for young travelers',
      constraints: {
        budget: 'moderate',
        travelMonths: [7, 8],
        interests: ['nightlife', 'culture'],
      },
      expectedBehavior: {
        topDestinationShouldInclude: ['Barcelona', 'Berlin', 'Amsterdam', 'Lisbon'],
        shouldRankHigher: { destination: 'Barcelona', than: 'Vienna' },
      },
    },

    // Scenario 5: Contradictory constraints should reduce confidence
    {
      id: 'confidence-calibration-1',
      name: 'Confidence Calibration',
      description: 'Contradictory constraints should lower confidence',
      query: 'Luxury beach resort on extreme budget',
      constraints: {
        budget: 'budget',
        travelMonths: [7, 8],
        interests: ['beach'],
      },
      expectedBehavior: {
        shouldHaveWarnings: true,
        maxConfidence: 0.6,
      },
    },

    // Scenario 6: Clear preferences should increase confidence
    {
      id: 'confidence-calibration-2',
      name: 'High Confidence Scenario',
      description: 'Clear, consistent preferences should yield high confidence',
      query: 'Budget-friendly cultural city in Europe',
      constraints: {
        budget: 'budget',
        travelMonths: [5, 6],
        interests: ['culture', 'history', 'food'],
      },
      expectedBehavior: {
        minConfidence: 0.75,
        topDestinationShouldInclude: ['Prague', 'Budapest', 'Krakow'],
      },
    },
  ]

  async runEvaluation(scenarioId?: string): Promise<EvaluationResult[]> {
    const engine = new TravelAnalysisEngine()
    const scenariosToRun = scenarioId
      ? this.scenarios.filter(s => s.id === scenarioId)
      : this.scenarios

    const results: EvaluationResult[] = []

    for (const scenario of scenariosToRun) {
      try {
        const analysis = await engine.analyze({
          query: scenario.query,
          budget: scenario.constraints.budget as any,
          travelMonths: scenario.constraints.travelMonths,
          interests: scenario.constraints.interests,
        })
        const result = this.evaluateScenario(scenario, analysis)
        results.push(result)
      } catch (error) {
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: false,
          issues: [`Failed to run analysis: ${error}`],
          analysis: {} as TravelAnalysisResponse,
          metrics: {
            topDestination: 'N/A',
            confidence: 0,
            warningCount: 0,
            topScores: [],
          },
        })
      }
    }

    return results
  }

  private evaluateScenario(
    scenario: EvaluationScenario,
    analysis: TravelAnalysisResponse
  ): EvaluationResult {
    const issues: string[] = []
    const topDestination = analysis.rankedDestinations[0]?.destinationName || 'N/A'
    const topScores = analysis.rankedDestinations.slice(0, 5).map(d => d.totalMatchScore)

    // Check top destination includes
    if (scenario.expectedBehavior.topDestinationShouldInclude) {
      const hasExpected = scenario.expectedBehavior.topDestinationShouldInclude.some(
        name => topDestination.toLowerCase().includes(name.toLowerCase())
      )
      if (!hasExpected) {
        issues.push(
          `Top destination "${topDestination}" not in expected list: ${scenario.expectedBehavior.topDestinationShouldInclude.join(', ')}`
        )
      }
    }

    // Check top destination excludes
    if (scenario.expectedBehavior.topDestinationShouldExclude) {
      const hasExcluded = scenario.expectedBehavior.topDestinationShouldExclude.some(
        name => topDestination.toLowerCase().includes(name.toLowerCase())
      )
      if (hasExcluded) {
        issues.push(
          `Top destination "${topDestination}" should not be in: ${scenario.expectedBehavior.topDestinationShouldExclude.join(', ')}`
        )
      }
    }

    // Check warnings
    if (scenario.expectedBehavior.shouldHaveWarnings) {
      if (analysis.warnings.length === 0) {
        issues.push('Expected warnings but none were generated')
      }
    }

    // Check confidence bounds
    if (scenario.expectedBehavior.minConfidence !== undefined) {
      if (analysis.confidence < scenario.expectedBehavior.minConfidence) {
        issues.push(
          `Confidence ${analysis.confidence.toFixed(2)} below minimum ${scenario.expectedBehavior.minConfidence}`
        )
      }
    }
    if (scenario.expectedBehavior.maxConfidence !== undefined) {
      if (analysis.confidence > scenario.expectedBehavior.maxConfidence) {
        issues.push(
          `Confidence ${analysis.confidence.toFixed(2)} above maximum ${scenario.expectedBehavior.maxConfidence}`
        )
      }
    }

    // Check ranking order
    if (scenario.expectedBehavior.shouldRankHigher) {
      const { destination, than } = scenario.expectedBehavior.shouldRankHigher
      const destIndex = analysis.rankedDestinations.findIndex(
        d => d.destinationName.toLowerCase().includes(destination.toLowerCase())
      )
      const thanIndex = analysis.rankedDestinations.findIndex(
        d => d.destinationName.toLowerCase().includes(than.toLowerCase())
      )
      if (destIndex >= 0 && thanIndex >= 0 && destIndex > thanIndex) {
        issues.push(`${destination} should rank higher than ${than}`)
      }
    }

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: issues.length === 0,
      issues,
      analysis,
      metrics: {
        topDestination,
        confidence: analysis.confidence,
        warningCount: analysis.warnings.length,
        topScores,
      },
    }
  }

  generateReport(results: EvaluationResult[]): string {
    const passed = results.filter(r => r.passed).length
    const total = results.length
    const passRate = ((passed / total) * 100).toFixed(1)

    let report = `\n=== RECOMMENDATION QUALITY EVALUATION ===\n\n`
    report += `Pass Rate: ${passed}/${total} (${passRate}%)\n\n`

    for (const result of results) {
      report += `\n[${result.passed ? '✓' : '✗'}] ${result.scenarioName}\n`
      report += `    Scenario: ${result.scenarioId}\n`
      report += `    Top Destination: ${result.metrics.topDestination}\n`
      report += `    Confidence: ${result.metrics.confidence.toFixed(2)}\n`
      report += `    Warnings: ${result.metrics.warningCount}\n`
      
      if (result.issues.length > 0) {
        report += `    Issues:\n`
        result.issues.forEach(issue => {
          report += `      - ${issue}\n`
        })
      }
    }

    return report
  }
}
