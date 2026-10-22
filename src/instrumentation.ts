// Runs once when the Next.js server starts: surface configuration problems in the logs
// immediately instead of as confusing runtime failures later.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { getEnvReport } = await import('./lib/env')
  const report = getEnvReport()

  if (!report.ok) {
    console.error(
      `[config] Missing required environment variables: ${report.missingRequired.join(', ')}. ` +
        'The app will not work correctly until they are set (see .env.example).'
    )
  }

  const disabled = Object.entries(report.integrations)
    .filter(([, integration]) => !integration.enabled)
    .map(([name]) => name)

  if (disabled.length > 0) {
    console.info(`[config] Optional integrations not configured (graceful fallbacks active): ${disabled.join(', ')}`)
  }
}
