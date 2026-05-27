'use client'

import { motion } from 'framer-motion'
import { fadeInUp, getMotionProps } from '@/lib/motion/presets'
import { ReactNode } from 'react'
import { DESIGN_TOKENS } from '@/lib/design/tokens'

interface PageHeroProps {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  gradient?: boolean
}

export function PageHero({ title, description, icon, actions, gradient = false }: PageHeroProps) {
  const motionProps = getMotionProps(fadeInUp)
  
  return (
    <motion.div 
      {...(motionProps as any)}
      className={`relative overflow-hidden rounded-xl border p-8 ${
        gradient ? 'bg-gradient-to-br from-blue-50 to-cyan-50' : 'bg-white'
      }`}
      style={{
        borderColor: DESIGN_TOKENS.colors.border.subtle,
        boxShadow: DESIGN_TOKENS.shadows.sm,
      }}
    >
      <div className="relative z-10">
        {icon && (
          <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-100 p-3 text-blue-600">
            {icon}
          </div>
        )}
        
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {title}
        </h1>
        
        {description && (
          <p className="mt-3 text-lg text-gray-600 max-w-3xl">
            {description}
          </p>
        )}
        
        {actions && (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions}
          </div>
        )}
      </div>
      
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
      )}
    </motion.div>
  )
}
