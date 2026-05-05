// Pairwise Comparison Ranker - intelligently compares recommendations against each other
import type { RankedDestination } from '../analysis/schemas'
import { logger } from '../utils'

export interface ComparisonResult {
  winner: RankedDestination
  loser: RankedDestination
  reason: string
  confidenceDelta: number
}

export class PairwiseRanker {
  /**
   * Compare two recommendations and determine which should rank higher
   */
  compareRecommendations(
    optionA: RankedDestination,
    optionB: RankedDestination,
    userConstraints: {
      budget?: string
      travelMonths?: number[]
      interests?: string[]
      travelStyle?: string
      pace?: string
    }
  ): ComparisonResult {
    const reasons: string[] = []
    let scoreA = 0
    let scoreB = 0

    // Factor 1: Budget fit (weight: 0.25)
    if (userConstraints.budget) {
      const budgetA = optionA.categoryScores.budgetFit
      const budgetB = optionB.categoryScores.budgetFit
      if (budgetA > budgetB + 1) {
        scoreA += 0.25
        reasons.push(`${optionA.destinationName} has better budget fit (${budgetA}/10 vs ${budgetB}/10)`)
      } else if (budgetB > budgetA + 1) {
        scoreB += 0.25
        reasons.push(`${optionB.destinationName} has better budget fit (${budgetB}/10 vs ${budgetA}/10)`)
      }
    }

    // Factor 2: Seasonal fit (weight: 0.2)
    if (userConstraints.travelMonths && userConstraints.travelMonths.length > 0) {
      const monthsA = optionA.bestMonths.filter(m => userConstraints.travelMonths!.includes(m)).length
      const monthsB = optionB.bestMonths.filter(m => userConstraints.travelMonths!.includes(m)).length
      if (monthsA > monthsB) {
        scoreA += 0.2
        reasons.push(`${optionA.destinationName} has better seasonal timing`)
      } else if (monthsB > monthsA) {
        scoreB += 0.2
        reasons.push(`${optionB.destinationName} has better seasonal timing`)
      }
    }

    // Factor 3: Safety (weight: 0.15)
    const safetyA = optionA.categoryScores.safety
    const safetyB = optionB.categoryScores.safety
    if (safetyA > safetyB + 1) {
      scoreA += 0.15
      reasons.push(`${optionA.destinationName} is safer (${safetyA}/10 vs ${safetyB}/10)`)
    } else if (safetyB > safetyA + 1) {
      scoreB += 0.15
      reasons.push(`${optionB.destinationName} is safer (${safetyB}/10 vs ${safetyA}/10)`)
    }

    // Factor 4: Evidence quality (weight: 0.15)
    const evidenceA = this.calculateEvidenceQuality(optionA)
    const evidenceB = this.calculateEvidenceQuality(optionB)
    if (evidenceA > evidenceB + 0.1) {
      scoreA += 0.15
      reasons.push(`${optionA.destinationName} has stronger evidence backing`)
    } else if (evidenceB > evidenceA + 0.1) {
      scoreB += 0.15
      reasons.push(`${optionB.destinationName} has stronger evidence backing`)
    }

    // Factor 5: Interest alignment (weight: 0.15)
    if (userConstraints.interests && userConstraints.interests.length > 0) {
      const interestA = this.calculateInterestScore(optionA, userConstraints.interests)
      const interestB = this.calculateInterestScore(optionB, userConstraints.interests)
      if (interestA > interestB + 0.5) {
        scoreA += 0.15
        reasons.push(`${optionA.destinationName} better matches your interests`)
      } else if (interestB > interestA + 0.5) {
        scoreB += 0.15
        reasons.push(`${optionB.destinationName} better matches your interests`)
      }
    }

    // Factor 6: Overall match score (weight: 0.1)
    if (optionA.totalMatchScore > optionB.totalMatchScore + 5) {
      scoreA += 0.1
    } else if (optionB.totalMatchScore > optionA.totalMatchScore + 5) {
      scoreB += 0.1
    }

    // Determine winner
    const winner = scoreA > scoreB ? optionA : scoreB > scoreA ? optionB : optionA
    const loser = winner === optionA ? optionB : optionA
    const mainReason = reasons.length > 0 ? reasons[0] : 'Similar overall quality'

    return {
      winner,
      loser,
      reason: mainReason,
      confidenceDelta: Math.abs(scoreA - scoreB),
    }
  }

  /**
   * Perform pairwise ranking on a list of candidates
   */
  pairwiseRank(
    candidates: RankedDestination[],
    userConstraints: any
  ): Array<RankedDestination & { rankingReason: string }> {
    if (candidates.length <= 1) {
      return candidates.map(c => ({ ...c, rankingReason: 'Only candidate' }))
    }

    // Build comparison matrix
    const wins = new Map<string, number>()
    const reasons = new Map<string, string[]>()

    for (const candidate of candidates) {
      wins.set(candidate.destinationId, 0)
      reasons.set(candidate.destinationId, [])
    }

    // Compare each pair
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const comparison = this.compareRecommendations(
          candidates[i],
          candidates[j],
          userConstraints
        )

        const winnerId = comparison.winner.destinationId
        wins.set(winnerId, (wins.get(winnerId) || 0) + 1)
        reasons.get(winnerId)?.push(comparison.reason)
      }
    }

    // Sort by wins
    const ranked = [...candidates].sort((a, b) => {
      const winsA = wins.get(a.destinationId) || 0
      const winsB = wins.get(b.destinationId) || 0
      if (winsA !== winsB) return winsB - winsA
      return b.totalMatchScore - a.totalMatchScore
    })

    // Add ranking reasons
    return ranked.map((candidate, index) => {
      const candidateReasons = reasons.get(candidate.destinationId) || []
      const rankingReason =
        index === 0
          ? candidateReasons.length > 0
            ? `Ranked #1 because: ${candidateReasons[0]}`
            : 'Highest overall match score'
          : candidateReasons.length > 0
          ? candidateReasons[0]
          : 'Lower overall match score'

      return {
        ...candidate,
        rankingReason,
      }
    })
  }

  /**
   * Calculate evidence quality score
   */
  private calculateEvidenceQuality(destination: RankedDestination): number {
    let quality = 0

    // Data quality
    if (destination.dataQuality === 'knowledge-based') quality += 0.4
    else if (destination.dataQuality === 'estimated') quality += 0.2

    // Source count
    quality += Math.min(destination.sourceLabels.length * 0.15, 0.3)

    // Reason specificity
    const specificReasons = destination.whyRecommended.filter(r => r.length > 30)
    quality += Math.min(specificReasons.length * 0.1, 0.3)

    return quality
  }

  /**
   * Calculate interest alignment score
   */
  private calculateInterestScore(destination: RankedDestination, interests: string[]): number {
    const interestMap: Record<string, keyof typeof destination.categoryScores> = {
      nightlife: 'nightlife',
      nature: 'nature',
      culture: 'nature',
      adventure: 'nature',
      relaxation: 'nature',
    }

    let score = 0
    let count = 0

    for (const interest of interests) {
      const key = interestMap[interest.toLowerCase()]
      if (key && destination.categoryScores[key]) {
        score += destination.categoryScores[key]
        count++
      }
    }

    return count > 0 ? score / count : 5
  }
}

export const pairwiseRanker = new PairwiseRanker()
