/**
 * Clear Analysis Client State
 * 
 * Safely clears all client-side analysis state to recover from errors
 * or prepare for a fresh analysis.
 */

export function clearAnalysisClientState() {
  if (typeof window === 'undefined') return

  try {
    // Clear any localStorage keys that might store analysis
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.includes('analysis') ||
        key.includes('travel-scan') ||
        key.includes('recommendation')
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        // Ignore individual removal errors
      }
    })
    
    // Clear sessionStorage as well
    const sessionKeysToRemove: string[] = []
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (
        key.includes('analysis') ||
        key.includes('travel-scan') ||
        key.includes('recommendation')
      )) {
        sessionKeysToRemove.push(key)
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key)
      } catch (e) {
        // Ignore individual removal errors
      }
    })
    
    console.log('Analysis client state cleared')
  } catch (error) {
    console.warn('Failed to clear some analysis state:', error)
  }
}
