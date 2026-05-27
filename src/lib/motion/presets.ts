/**
 * TravelScan Motion Presets
 * 
 * Reusable motion configurations for Framer Motion.
 * All animations respect reduced motion preferences.
 */

import { Variants, Transition } from 'framer-motion'

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Base transition configurations
export const transitions = {
  fast: {
    duration: 0.18,
    ease: [0, 0, 0.2, 1],
  } as Transition,
  
  normal: {
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,
  
  slow: {
    duration: 0.32,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,
  
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  } as Transition,
}

// Page-level animations
export const pageFadeIn: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0,
    transition: transitions.fast,
  },
}

// Section reveal
export const sectionReveal: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
}

// Card reveal
export const cardReveal: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: transitions.normal,
  },
}

// Stagger container
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

// Stagger item
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: transitions.fast,
  },
}

// Modal motion
export const modalMotion: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0,
    scale: 0.98,
    transition: transitions.fast,
  },
}

// Button tap
export const buttonTap = {
  scale: 0.97,
  transition: transitions.fast,
}

// Hover lift
export const hoverLift = {
  y: -2,
  transition: transitions.fast,
}

// Route pulse (for loading/scanning effect)
export const routePulse: Variants = {
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1.02, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Loading step reveal
export const loadingStepReveal: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0,
    x: 8,
    transition: transitions.fast,
  },
}

// Fade in up
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
}

// Scale in
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.normal,
  },
}

// Slide in from right
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: transitions.normal,
  },
}

// Helper function to get motion props with reduced motion support
export function getMotionProps(variants: Variants, custom?: any) {
  if (prefersReducedMotion()) {
    return {
      initial: false as const,
      animate: false as const,
    }
  }
  
  return {
    initial: 'initial' as const,
    animate: 'animate' as const,
    exit: 'exit' as const,
    variants,
    custom,
  }
}

// Helper for whileHover with reduced motion support
export function getHoverProps(hoverVariant: any) {
  if (prefersReducedMotion()) {
    return {}
  }
  
  return {
    whileHover: hoverVariant,
  }
}

// Helper for whileTap with reduced motion support
export function getTapProps(tapVariant: any) {
  if (prefersReducedMotion()) {
    return {}
  }
  
  return {
    whileTap: tapVariant,
  }
}
