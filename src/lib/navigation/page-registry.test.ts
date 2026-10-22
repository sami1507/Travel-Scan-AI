import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { PAGE_REGISTRY, getNavigationPages, getPageByPath, isPageAccessible } from './page-registry'

describe('page registry', () => {
  it('has unique paths', () => {
    const paths = PAGE_REGISTRY.map((p) => p.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('every registered dashboard page exists on disk', () => {
    for (const page of PAGE_REGISTRY.filter((p) => p.path.startsWith('/dashboard'))) {
      const file = path.join(process.cwd(), 'src/app/(dashboard)', page.path, 'page.tsx')
      expect(() => readFileSync(file), `${page.path} has no page.tsx`).not.toThrow()
    }
  })

  it('shows only active, user-level pages in the user navigation', () => {
    const nav = getNavigationPages('user')
    expect(nav.length).toBeGreaterThan(0)
    for (const page of nav) {
      expect(page.status).toBe('active')
      expect(page.authRequired).not.toBe('admin')
    }
  })

  it('does not expose admin or dev pages in navigation', () => {
    const nav = getNavigationPages('admin')
    expect(nav.some((p) => p.authRequired === 'dev')).toBe(false)
    expect(nav.some((p) => p.path.startsWith('/dashboard/admin'))).toBe(false)
  })

  it('enforces the role hierarchy for page access', () => {
    expect(isPageAccessible('/dashboard/admin', 'user')).toBe(false)
    expect(isPageAccessible('/dashboard/admin', 'admin')).toBe(true)
    expect(isPageAccessible('/dashboard/analysis', 'public')).toBe(false)
    expect(isPageAccessible('/login', 'public')).toBe(true)
    expect(isPageAccessible('/no/such/page', 'admin')).toBe(false)
  })

  it('looks pages up by path', () => {
    expect(getPageByPath('/dashboard/alerts')?.title).toBe('Travel Alerts')
    expect(getPageByPath('/nope')).toBeUndefined()
  })
})
