'use client'

import { motion } from 'framer-motion'
import { cardReveal, getMotionProps } from '@/lib/motion/presets'
import { ReactNode } from 'react'
import { DESIGN_TOKENS } from '@/lib/design/tokens'
import { Brain } from 'lucide-react'

interface ConsultantPanelProps {
  title: string
  children: ReactNode
  icon?: ReactNode
  variant?: 'default' | 'intelligence' | 'warning'
}

export function ConsultantPanel({ 
  title, 
  children, 
  icon, 
  variant = 'default' 
}: ConsultantPanelProps) {
  const motionProps = getMotionProps(cardReveal)
  
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: DESIGN_TOKENS.colors.border.subtle,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    intelligence: {
      bg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
      border: DESIGN_TOKENS.colors.brand.intelligence,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
    warning: {
      bg: 'bg-amber-50',
      border: DESIGN_TOKENS.colors.semantic.warning,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  }
  
  const styles = variantStyles[variant]
  
  return (
    <motion.div
      {...(motionProps as any)}
      className={`rounded-xl border p-6 ${styles.bg}`}
      style={{
        borderColor: styles.border,
        boxShadow: DESIGN_TOKENS.shadows.md,
      }}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 rounded-lg ${styles.iconBg} p-2.5 ${styles.iconColor}`}>
          {icon || <Brain className="h-5 w-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {title}
          </h3>
          
          <div className="text-gray-700 space-y-3">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
