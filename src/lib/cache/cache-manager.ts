// Production Caching Layer with Upstash Redis (compatible with Vercel KV)
import { Redis } from '@upstash/redis'
import { logger } from '../utils'
import { errorTracker } from '../monitoring/error-tracker'

export interface CacheConfig {
  ttl: number // Time to live in seconds
  namespace: string
}

export interface CacheStats {
  hits: number
  misses: number
  errors: number
  hitRate: number
}

class CacheManager {
  private enabled: boolean
  private redis: Redis | null = null
  private stats: Map<string, CacheStats> = new Map()

  constructor() {
    // Check if Redis/KV is configured (uses same Vercel KV env vars)
    this.enabled = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
    
    if (!this.enabled) {
      logger.warn('Cache: Redis/KV not configured, caching disabled')
    } else {
      this.redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      })
      logger.info('Cache: Upstash Redis enabled (Vercel KV compatible)')
    }
  }

  /**
   * Get from cache
   */
  async get<T>(key: string, namespace: string = 'default'): Promise<T | null> {
    if (!this.enabled || !this.redis) {
      this.recordMiss(namespace)
      return null
    }

    try {
      const fullKey = this.buildKey(key, namespace)
      const value = await this.redis.get<T>(fullKey)
      
      if (value !== null) {
        this.recordHit(namespace)
        logger.info('Cache: HIT', { namespace, key: this.sanitizeKey(key) })
        return value
      } else {
        this.recordMiss(namespace)
        logger.info('Cache: MISS', { namespace, key: this.sanitizeKey(key) })
        return null
      }
    } catch (error) {
      this.recordError(namespace)
      errorTracker.track(error, {
        operation: 'cache-get',
        metadata: { namespace, key: this.sanitizeKey(key) },
      }, 'low')
      return null
    }
  }

  /**
   * Set in cache
   */
  async set<T>(key: string, value: T, config: CacheConfig): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false
    }

    try {
      const fullKey = this.buildKey(key, config.namespace)
      await this.redis.set(fullKey, value, { ex: config.ttl })
      logger.info('Cache: SET', { 
        namespace: config.namespace, 
        key: this.sanitizeKey(key),
        ttl: config.ttl 
      })
      return true
    } catch (error) {
      this.recordError(config.namespace)
      errorTracker.track(error, {
        operation: 'cache-set',
        metadata: { namespace: config.namespace, key: this.sanitizeKey(key) },
      }, 'low')
      return false
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string, namespace: string = 'default'): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false
    }

    try {
      const fullKey = this.buildKey(key, namespace)
      await this.redis.del(fullKey)
      logger.info('Cache: DELETE', { namespace, key: this.sanitizeKey(key) })
      return true
    } catch (error) {
      errorTracker.track(error, {
        operation: 'cache-delete',
        metadata: { namespace, key: this.sanitizeKey(key) },
      }, 'low')
      return false
    }
  }

  /**
   * Get or set pattern
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, config.namespace)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const fresh = await fetcher()
    
    // Store in cache (fire and forget)
    this.set(key, fresh, config).catch(() => {
      // Ignore cache set failures
    })

    return fresh
  }

  /**
   * Get cache statistics
   */
  getStats(namespace?: string): CacheStats | Record<string, CacheStats> {
    if (namespace) {
      return this.stats.get(namespace) || { hits: 0, misses: 0, errors: 0, hitRate: 0 }
    }

    const allStats: Record<string, CacheStats> = {}
    this.stats.forEach((stats, ns) => {
      allStats[ns] = stats
    })
    return allStats
  }

  /**
   * Clear cache statistics
   */
  clearStats() {
    this.stats.clear()
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  // Private methods

  private buildKey(key: string, namespace: string): string {
    return `travelscan:${namespace}:${key}`
  }

  private sanitizeKey(key: string): string {
    // Remove sensitive data from keys for logging
    return key.length > 100 ? `${key.substring(0, 100)}...` : key
  }

  private recordHit(namespace: string) {
    const stats = this.getOrCreateStats(namespace)
    stats.hits++
    this.updateHitRate(stats)
  }

  private recordMiss(namespace: string) {
    const stats = this.getOrCreateStats(namespace)
    stats.misses++
    this.updateHitRate(stats)
  }

  private recordError(namespace: string) {
    const stats = this.getOrCreateStats(namespace)
    stats.errors++
  }

  private getOrCreateStats(namespace: string): CacheStats {
    if (!this.stats.has(namespace)) {
      this.stats.set(namespace, { hits: 0, misses: 0, errors: 0, hitRate: 0 })
    }
    return this.stats.get(namespace)!
  }

  private updateHitRate(stats: CacheStats) {
    const total = stats.hits + stats.misses
    stats.hitRate = total > 0 ? stats.hits / total : 0
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// Cache configuration presets
export const CachePresets = {
  OPENAI_ANALYSIS: {
    namespace: 'openai-analysis',
    ttl: 24 * 60 * 60, // 24 hours
  },
  PROVIDER_FLIGHTS: {
    namespace: 'provider-flights',
    ttl: 6 * 60 * 60, // 6 hours
  },
  PROVIDER_HOTELS: {
    namespace: 'provider-hotels',
    ttl: 6 * 60 * 60, // 6 hours
  },
  PROVIDER_WEATHER: {
    namespace: 'provider-weather',
    ttl: 12 * 60 * 60, // 12 hours
  },
  PROVIDER_EVENTS: {
    namespace: 'provider-events',
    ttl: 24 * 60 * 60, // 24 hours
  },
  KNOWLEDGE_BASE: {
    namespace: 'knowledge',
    ttl: 7 * 24 * 60 * 60, // 7 days
  },
  ROUTE_CALCULATION: {
    namespace: 'route-calc',
    ttl: 12 * 60 * 60, // 12 hours
  },
}
