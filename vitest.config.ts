import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // tsconfig uses jsx: preserve for Next; tests need the bundler to transform JSX (react-pdf routes)
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Coverage gate for the code where mistakes cost most: security, validation, scoring,
    // data providers and the recommendation post-processing pipeline. Run: npm run test:coverage
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/security/**',
        'src/lib/validation.ts',
        'src/lib/env.ts',
        'src/lib/scoring/**',
        'src/lib/providers/real-*.ts',
        'src/lib/providers/live-climate.ts',
        'src/lib/analysis/fallback-recommendations.ts',
        'src/lib/analysis/normalize-recommendation.ts',
        'src/lib/analysis/validate-analysis-request.ts',
        'src/lib/analysis/route-candidate-pool.ts',
        'src/lib/analysis/consultant-quality-score.ts',
        'src/lib/analysis/diversity-enforcement.ts',
        'src/app/api/health/route.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: { statements: 70, branches: 60, functions: 70, lines: 70 },
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
