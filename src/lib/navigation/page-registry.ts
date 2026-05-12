// Page registry for TravelScan AI
// Defines all routes, their purpose, auth requirements, and visibility

export type PageStatus = 'active' | 'internal' | 'dev' | 'admin'
export type AuthLevel = 'public' | 'user' | 'admin' | 'dev'
export type NavVisibility = 'public' | 'userNav' | 'adminNav' | 'hidden'

export interface PageDefinition {
  path: string
  title: string
  purpose: string
  authRequired: AuthLevel
  showInNav: boolean
  visibility: NavVisibility
  status: PageStatus
  icon?: string
  description: string
}

export const PAGE_REGISTRY: PageDefinition[] = [
  // Public Pages
  {
    path: '/',
    title: 'Home',
    purpose: 'Landing page with value proposition',
    authRequired: 'public',
    showInNav: false,
    visibility: 'public',
    status: 'active',
    description: 'Main landing page for TravelScan AI',
  },
  {
    path: '/login',
    title: 'Login',
    purpose: 'User authentication',
    authRequired: 'public',
    showInNav: false,
    visibility: 'public',
    status: 'active',
    description: 'Login page with email/password and Google OAuth',
  },
  {
    path: '/signup',
    title: 'Sign Up',
    purpose: 'User registration',
    authRequired: 'public',
    showInNav: false,
    visibility: 'public',
    status: 'active',
    description: 'Registration page for new users',
  },
  {
    path: '/reset-password',
    title: 'Reset Password',
    purpose: 'Password recovery',
    authRequired: 'public',
    showInNav: false,
    visibility: 'public',
    status: 'active',
    description: 'Request password reset link',
  },
  {
    path: '/update-password',
    title: 'Update Password',
    purpose: 'Set new password',
    authRequired: 'public',
    showInNav: false,
    visibility: 'public',
    status: 'active',
    description: 'Update password after reset',
  },
  {
    path: '/resend-confirmation',
    title: 'Resend Confirmation',
    purpose: 'Resend email verification',
    authRequired: 'public',
    showInNav: false,
    visibility: 'public',
    status: 'active',
    description: 'Resend email confirmation link',
  },
  {
    path: '/auth/callback',
    title: 'Auth Callback',
    purpose: 'OAuth callback handler',
    authRequired: 'public',
    showInNav: false,
    visibility: 'hidden',
    status: 'internal',
    description: 'Handles OAuth authentication callbacks',
  },

  // User Dashboard Pages
  {
    path: '/dashboard',
    title: 'Dashboard',
    purpose: 'User dashboard overview',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'LayoutDashboard',
    description: 'Main dashboard with overview and quick actions',
  },
  {
    path: '/dashboard/analysis',
    title: 'Travel Analysis',
    purpose: 'AI-powered travel recommendation engine',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'Sparkles',
    description: 'Create new travel analysis with AI recommendations',
  },
  {
    path: '/dashboard/saved',
    title: 'Saved Trips',
    purpose: 'View saved travel recommendations',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'Bookmark',
    description: 'Browse and manage saved travel recommendations',
  },
  {
    path: '/dashboard/profile',
    title: 'Profile',
    purpose: 'User profile and preferences',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'User',
    description: 'Manage profile, preferences, and account settings',
  },
  {
    path: '/dashboard/sources',
    title: 'Data Sources',
    purpose: 'View connected data providers',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'Database',
    description: 'View status of AI and data provider integrations',
  },
  {
    path: '/dashboard/alerts',
    title: 'Travel Alerts',
    purpose: 'Price and travel alerts',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'Bell',
    description: 'Manage travel alerts and notifications',
  },
  {
    path: '/dashboard/compare',
    title: 'Compare Trips',
    purpose: 'Compare saved recommendations',
    authRequired: 'user',
    showInNav: true,
    visibility: 'userNav',
    status: 'active',
    icon: 'GitCompare',
    description: 'Compare multiple saved trip recommendations',
  },
  {
    path: '/dashboard/notifications',
    title: 'Notifications',
    purpose: 'View notifications',
    authRequired: 'user',
    showInNav: false,
    visibility: 'hidden',
    status: 'active',
    icon: 'Inbox',
    description: 'View and manage notifications',
  },

  // Internal/Future Pages
  {
    path: '/dashboard/scans',
    title: 'Analysis History',
    purpose: 'View past analyses',
    authRequired: 'user',
    showInNav: false,
    visibility: 'hidden',
    status: 'internal',
    icon: 'History',
    description: 'Redirects to Saved Trips - analysis history',
  },
  {
    path: '/dashboard/opportunities',
    title: 'Travel Opportunities',
    purpose: 'AI-detected travel opportunities',
    authRequired: 'user',
    showInNav: false,
    visibility: 'hidden',
    status: 'internal',
    icon: 'TrendingUp',
    description: 'Future: AI-detected travel deals and opportunities',
  },
  {
    path: '/dashboard/intelligence',
    title: 'Travel Intelligence',
    purpose: 'AI insights and trends',
    authRequired: 'user',
    showInNav: false,
    visibility: 'hidden',
    status: 'internal',
    icon: 'Brain',
    description: 'Future: AI-powered travel insights and trends',
  },

  // Admin Pages
  {
    path: '/dashboard/admin',
    title: 'Admin Dashboard',
    purpose: 'Admin analytics and monitoring',
    authRequired: 'admin',
    showInNav: false,
    visibility: 'adminNav',
    status: 'admin',
    icon: 'Shield',
    description: 'Admin-only analytics dashboard',
  },
  {
    path: '/dashboard/admin/operations',
    title: 'Operations',
    purpose: 'System operations monitoring',
    authRequired: 'admin',
    showInNav: false,
    visibility: 'adminNav',
    status: 'admin',
    description: 'Admin-only operational metrics',
  },
  {
    path: '/dashboard/admin/ml-monitoring',
    title: 'ML Monitoring',
    purpose: 'ML model performance',
    authRequired: 'admin',
    showInNav: false,
    visibility: 'adminNav',
    status: 'admin',
    description: 'Admin-only ML monitoring',
  },
  {
    path: '/dashboard/admin/quality',
    title: 'Quality Monitoring',
    purpose: 'Recommendation quality',
    authRequired: 'admin',
    showInNav: false,
    visibility: 'adminNav',
    status: 'admin',
    description: 'Admin-only quality monitoring',
  },
  {
    path: '/dashboard/admin/feedback-intelligence',
    title: 'Feedback Intelligence',
    purpose: 'AI feedback analysis',
    authRequired: 'admin',
    showInNav: false,
    visibility: 'adminNav',
    status: 'admin',
    description: 'Admin-only feedback intelligence',
  },
  {
    path: '/dashboard/admin/intelligence-signals',
    title: 'Intelligence Signals',
    purpose: 'AI intelligence signals',
    authRequired: 'admin',
    showInNav: false,
    visibility: 'adminNav',
    status: 'admin',
    description: 'Admin-only intelligence signals',
  },

  // Development Pages
  {
    path: '/dashboard/travel-test',
    title: 'Travel Test',
    purpose: 'Development testing tool',
    authRequired: 'dev',
    showInNav: false,
    visibility: 'hidden',
    status: 'dev',
    icon: 'TestTube',
    description: 'Development-only testing page',
  },
]

// Helper functions
export function getPageByPath(path: string): PageDefinition | undefined {
  return PAGE_REGISTRY.find(p => p.path === path)
}

export function getNavigationPages(userRole: 'user' | 'admin' = 'user'): PageDefinition[] {
  return PAGE_REGISTRY.filter(p => {
    if (!p.showInNav) return false
    if (p.authRequired === 'admin' && userRole !== 'admin') return false
    if (p.authRequired === 'dev') return false
    if (p.status === 'internal' || p.status === 'dev' || p.status === 'admin') return false
    return true
  })
}

export function isPageAccessible(path: string, userRole: 'public' | 'user' | 'admin' | 'dev'): boolean {
  const page = getPageByPath(path)
  if (!page) return false

  const roleHierarchy = { public: 0, user: 1, admin: 2, dev: 3 }
  return roleHierarchy[userRole] >= roleHierarchy[page.authRequired]
}
