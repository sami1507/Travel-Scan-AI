/**
 * Format score for display - rounds to 1 decimal or integer
 */
export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null || !isFinite(score)) {
    return '0'
  }
  
  // Round to 1 decimal place
  const rounded = Math.round(score * 10) / 10
  
  // If it's a whole number, display without decimal
  if (rounded % 1 === 0) {
    return rounded.toString()
  }
  
  return rounded.toFixed(1)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || !isFinite(value)) {
    return '0%'
  }
  
  const rounded = Math.round(value * 10) / 10
  
  if (rounded % 1 === 0) {
    return `${rounded}%`
  }
  
  return `${rounded.toFixed(1)}%`
}
