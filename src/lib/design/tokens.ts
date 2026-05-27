/**
 * TravelScan Design Tokens
 * 
 * Design system tokens for colors, spacing, typography, motion, and more.
 * Ensures visual consistency across the entire application.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Base surfaces
    surface: {
      primary: 'hsl(0, 0%, 100%)',        // Pure white
      secondary: 'hsl(210, 20%, 98%)',    // Off-white
      tertiary: 'hsl(210, 15%, 96%)',     // Light gray
      elevated: 'hsl(0, 0%, 100%)',       // White with shadow
    },

    // Text hierarchy
    text: {
      primary: 'hsl(220, 25%, 15%)',      // Deep navy
      secondary: 'hsl(220, 15%, 35%)',    // Medium gray
      tertiary: 'hsl(220, 10%, 55%)',     // Light gray
      disabled: 'hsl(220, 5%, 70%)',      // Very light gray
    },

    // Brand colors
    brand: {
      primary: 'hsl(210, 85%, 50%)',      // Travel blue
      primaryHover: 'hsl(210, 85%, 45%)', 
      primaryLight: 'hsl(210, 85%, 95%)',
      
      intelligence: 'hsl(185, 70%, 50%)', // Soft cyan/teal
      intelligenceLight: 'hsl(185, 70%, 95%)',
      
      consultant: 'hsl(220, 25%, 15%)',   // Deep navy
    },

    // Semantic colors
    semantic: {
      success: 'hsl(145, 65%, 45%)',      // Green
      successLight: 'hsl(145, 65%, 95%)',
      
      warning: 'hsl(40, 95%, 55%)',       // Amber
      warningLight: 'hsl(40, 95%, 95%)',
      
      danger: 'hsl(0, 75%, 55%)',         // Red
      dangerLight: 'hsl(0, 75%, 95%)',
      
      info: 'hsl(210, 85%, 50%)',         // Blue
      infoLight: 'hsl(210, 85%, 95%)',
    },

    // Route-specific
    route: {
      mainstream: 'hsl(210, 85%, 50%)',
      unique: 'hsl(280, 65%, 55%)',
      balanced: 'hsl(185, 70%, 50%)',
    },

    // Borders
    border: {
      subtle: 'hsl(220, 15%, 90%)',
      default: 'hsl(220, 15%, 85%)',
      strong: 'hsl(220, 15%, 75%)',
    },

    // Overlays
    overlay: {
      light: 'hsla(220, 25%, 15%, 0.05)',
      medium: 'hsla(220, 25%, 15%, 0.10)',
      strong: 'hsla(220, 25%, 15%, 0.60)',
    },
  },

  gradients: {
    subtle: 'linear-gradient(135deg, hsl(210, 85%, 98%) 0%, hsl(185, 70%, 98%) 100%)',
    intelligence: 'linear-gradient(135deg, hsl(185, 70%, 95%) 0%, hsl(210, 85%, 95%) 100%)',
    premium: 'linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsl(210, 20%, 98%) 100%)',
  },

  typography: {
    fontFamily: {
      sans: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      mono: 'var(--font-mono, ui-monospace, monospace)',
    },

    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
  },

  borderRadius: {
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 hsla(220, 25%, 15%, 0.05)',
    md: '0 4px 6px -1px hsla(220, 25%, 15%, 0.08), 0 2px 4px -2px hsla(220, 25%, 15%, 0.05)',
    lg: '0 10px 15px -3px hsla(220, 25%, 15%, 0.10), 0 4px 6px -4px hsla(220, 25%, 15%, 0.05)',
    xl: '0 20px 25px -5px hsla(220, 25%, 15%, 0.12), 0 8px 10px -6px hsla(220, 25%, 15%, 0.05)',
    inner: 'inset 0 2px 4px 0 hsla(220, 25%, 15%, 0.05)',
  },

  motion: {
    duration: {
      instant: '100ms',
      fast: '180ms',
      normal: '250ms',
      slow: '320ms',
      slower: '400ms',
    },

    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },

    stagger: {
      fast: 40,
      normal: 60,
      slow: 80,
    },
  },

  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    overlay: 1200,
    modal: 1300,
    popover: 1400,
    toast: 1500,
  },
} as const

export type DesignTokens = typeof DESIGN_TOKENS

// Helper function to get CSS custom properties
export function getCSSVariables() {
  return {
    '--surface-primary': DESIGN_TOKENS.colors.surface.primary,
    '--surface-secondary': DESIGN_TOKENS.colors.surface.secondary,
    '--text-primary': DESIGN_TOKENS.colors.text.primary,
    '--text-secondary': DESIGN_TOKENS.colors.text.secondary,
    '--brand-primary': DESIGN_TOKENS.colors.brand.primary,
    '--brand-intelligence': DESIGN_TOKENS.colors.brand.intelligence,
  }
}
