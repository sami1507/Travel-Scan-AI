// Verifier layer - checks recommendation quality and evidence support
import type { TravelAnalysisResponse, RankedDestination } from './schemas'

export interface VerificationIssue {
  severity: 'critical' | 'warning' | 'info'
  category: 'evidence' | 'confidence' | 'warnings' | 'explanation'
  message: string
  destination?: string
}

export interface VerificationReport {
  passed: boolean
  score: number // 0-100
  issues: VerificationIssue[]
  recommendations: string[]
}

export class RecommendationVerifier {
  /**
   * Verify that recommendations are well-supported by evidence and scoring
   */
  verify(analysis: TravelAnalysisResponse): VerificationReport {
    const issues: VerificationIssue[] = []
    const recommendations: string[] = []

    // Check 1: Top recommendations should have high scores
    this.verifyScoreAlignment(analysis, issues, recommendations)

    // Check 2: Confidence should match evidence quality
    this.verifyConfidenceCalibration(analysis, issues, recommendations)

    // Check 3: Warnings should be present for risky scenarios
    this.verifyWarnings(analysis, issues, recommendations)

    // Check 4: Explanations should be specific, not generic
    this.verifyExplanationQuality(analysis, issues, recommendations)

    // Check 5: Source labels should be present
    this.verifySourceLabeling(analysis, issues, recommendations)

    // Calculate overall score
    const criticalIssues = issues.filter(i => i.severity === 'critical').length
    const warningIssues = issues.filter(i => i.severity === 'warning').length
    const score = Math.max(0, 100 - (criticalIssues * 20) - (warningIssues * 5))

    return {
      passed: criticalIssues === 0,
      score,
      issues,
      recommendations,
    }
  }

  private verifyScoreAlignment(
    analysis: TravelAnalysisResponse,
    issues: VerificationIssue[],
    recommendations: string[]
  ): void {
    const topDest = analysis.rankedDestinations[0]
    if (!topDest) return

    // Top destination should have score > 60
    if (topDest.totalMatchScore < 60) {
      issues.push({
        severity: 'warning',
        category: 'evidence',
        message: `Top destination has low score (${topDest.totalMatchScore.toFixed(1)}). Consider if ranking is correct.`,
        destination: topDest.destinationName,
      })
    }

    // Check score gaps between top destinations
    if (analysis.rankedDestinations.length >= 2) {
      const scoreDiff = topDest.totalMatchScore - analysis.rankedDestinations[1].totalMatchScore
      if (scoreDiff < 5) {
        recommendations.push(
          `Top two destinations are very close in score (${scoreDiff.toFixed(1)} points). Consider highlighting this in explanation.`
        )
      }
    }

    // Check for score-explanation mismatch
    const hasStrongExplanation = topDest.whyRecommended.length >= 3
    if (topDest.totalMatchScore > 80 && !hasStrongExplanation) {
      issues.push({
        severity: 'warning',
        category: 'explanation',
        message: 'High score but weak explanation. Add more specific reasons.',
        destination: topDest.destinationName,
      })
    }
  }

  private verifyConfidenceCalibration(
    analysis: TravelAnalysisResponse,
    issues: VerificationIssue[],
    recommendations: string[]
  ): void {
    const { confidence } = analysis

    // High confidence should have strong evidence
    if (confidence > 0.8) {
      const hasWarnings = analysis.warnings.length > 0
      const hasAssumptions = analysis.assumptions.length > 0
      
      if (hasWarnings || hasAssumptions) {
        issues.push({
          severity: 'critical',
          category: 'confidence',
          message: `Confidence too high (${(confidence * 100).toFixed(0)}%) given warnings or assumptions present. Reduce confidence.`,
        })
      }

      const topScore = analysis.rankedDestinations[0]?.totalMatchScore || 0
      if (topScore < 70) {
        issues.push({
          severity: 'critical',
          category: 'confidence',
          message: `Confidence ${(confidence * 100).toFixed(0)}% too high for top score of ${topScore.toFixed(1)}. Reduce confidence.`,
        })
      }
    }

    // Low confidence should have warnings
    if (confidence < 0.5 && analysis.warnings.length === 0) {
      recommendations.push(
        'Low confidence detected. Consider adding warnings to explain uncertainty.'
      )
    }

    // Contradictory signals should lower confidence
    const hasLowBudget = analysis.userConstraints.budget === 'budget' || analysis.userConstraints.budget === 'low'
    const hasLuxuryInterests = analysis.userConstraints.interests?.some(
      i => i.toLowerCase().includes('luxury') || i.toLowerCase().includes('premium')
    )
    if (hasLowBudget && hasLuxuryInterests && confidence > 0.6) {
      issues.push({
        severity: 'warning',
        category: 'confidence',
        message: 'Contradictory budget/luxury signals. Consider lowering confidence.',
      })
    }
  }

  private verifyWarnings(
    analysis: TravelAnalysisResponse,
    issues: VerificationIssue[],
    recommendations: string[]
  ): void {
    // Winter travel to beach destinations should have warnings
    const hasBeachInterest = analysis.userConstraints.interests?.some(
      i => i.toLowerCase().includes('beach')
    )
    const hasWinterMonths = analysis.userConstraints.travelMonths?.some(
      m => m === 12 || m === 1 || m === 2
    )
    if (hasBeachInterest && hasWinterMonths && analysis.warnings.length === 0) {
      issues.push({
        severity: 'warning',
        category: 'warnings',
        message: 'Beach destination in winter months should include weather warning.',
      })
    }

    // Budget constraints with expensive destinations should warn
    const hasLowBudget = analysis.userConstraints.budget === 'budget' || analysis.userConstraints.budget === 'low'
    const topDest = analysis.rankedDestinations[0]
    if (hasLowBudget && topDest?.categoryScores.budgetFit < 6 && analysis.warnings.length === 0) {
      recommendations.push(
        'Low budget with poor budget fit score. Consider adding budget warning.'
      )
    }
  }

  private verifyExplanationQuality(
    analysis: TravelAnalysisResponse,
    issues: VerificationIssue[],
    recommendations: string[]
  ): void {
    // Check for generic explanations
    const genericPhrases = [
      'great destination',
      'popular choice',
      'highly recommended',
      'perfect for travelers',
      'amazing place',
    ]

    for (const dest of analysis.rankedDestinations.slice(0, 3)) {
      const hasGeneric = dest.whyRecommended.some(reason =>
        genericPhrases.some(phrase => reason.toLowerCase().includes(phrase))
      )

      if (hasGeneric) {
        issues.push({
          severity: 'warning',
          category: 'explanation',
          message: 'Explanation contains generic phrases. Be more specific.',
          destination: dest.destinationName,
        })
      }

      // Explanations should reference specific scores or features
      const hasSpecificEvidence = dest.whyRecommended.some(reason =>
        /\d+/.test(reason) || // Contains numbers
        reason.includes('score') ||
        reason.includes('rated') ||
        reason.includes('known for')
      )

      if (!hasSpecificEvidence && dest.whyRecommended.length > 0) {
        recommendations.push(
          `Add specific evidence to ${dest.destinationName} explanation (scores, ratings, specific features).`
        )
      }
    }
  }

  private verifySourceLabeling(
    analysis: TravelAnalysisResponse,
    issues: VerificationIssue[],
    recommendations: string[]
  ): void {
    // Top destinations should have source labels
    for (const dest of analysis.rankedDestinations.slice(0, 3)) {
      if (!dest.sourceLabels || dest.sourceLabels.length === 0) {
        issues.push({
          severity: 'warning',
          category: 'evidence',
          message: 'Missing source labels. Add data source attribution.',
          destination: dest.destinationName,
        })
      }

      // Data quality should be labeled
      if (!dest.dataQuality) {
        recommendations.push(
          `Add data quality label to ${dest.destinationName} (knowledge-based, estimated, or demo).`
        )
      }
    }

    // Analysis should list sources used
    if (!analysis.sourcesUsed || analysis.sourcesUsed.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'evidence',
        message: 'No sources listed. Add source attribution to analysis.',
      })
    }
  }

  /**
   * Generate human-readable report
   */
  generateReport(report: VerificationReport): string {
    let output = `\n=== RECOMMENDATION VERIFICATION REPORT ===\n\n`
    output += `Status: ${report.passed ? '✓ PASSED' : '✗ FAILED'}\n`
    output += `Score: ${report.score}/100\n\n`

    if (report.issues.length > 0) {
      output += `Issues Found (${report.issues.length}):\n`
      for (const issue of report.issues) {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
        output += `  ${icon} [${issue.category.toUpperCase()}] ${issue.message}\n`
        if (issue.destination) {
          output += `     Destination: ${issue.destination}\n`
        }
      }
      output += `\n`
    }

    if (report.recommendations.length > 0) {
      output += `Recommendations (${report.recommendations.length}):\n`
      for (const rec of report.recommendations) {
        output += `  💡 ${rec}\n`
      }
    }

    return output
  }
}
