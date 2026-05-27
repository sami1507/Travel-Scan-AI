'use client'

import { motion } from 'framer-motion'
import { sectionReveal, getMotionProps } from '@/lib/motion/presets'
import { ReactNode } from 'react'

interface MotionSectionProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function MotionSection({ children, className = '', delay = 0 }: MotionSectionProps) {
  const motionProps = getMotionProps(sectionReveal)
  
  return (
    <motion.section
      {...motionProps}
      className={className}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </motion.section>
  )
}
