// Content Security Policy builder. Pure functions so the policy is unit-testable.
// Scripts are authorised by a per-request nonce + 'strict-dynamic' (no 'unsafe-inline').
// Next.js reads the nonce from the request's CSP header and applies it to the
// inline bootstrap scripts it renders, so every page must be rendered dynamically.

export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function buildCsp(nonce: string, isProduction: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Dev-mode HMR/source maps need eval; never in production.
    ...(isProduction ? [] : ["'unsafe-eval'"]),
  ]

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    // Tailwind/framer-motion emit inline style attributes; inline styles can't run code.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://vercel.live',
      'https://maps.googleapis.com',
    ],
    'frame-src': ["'self'", 'https://vercel.live'],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')

  return isProduction ? `${policy}; upgrade-insecure-requests` : policy
}
