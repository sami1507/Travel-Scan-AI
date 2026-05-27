'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { loadingStepReveal, getMotionProps } from '@/lib/motion/presets'
import { DESIGN_TOKENS } from '@/lib/design/tokens'
import { 
  Search, 
  DollarSign, 
  Route, 
  Calendar, 
  Gauge, 
  Brain,
  Check 
} from 'lucide-react'

interface LoadingStep {
  id: string
  label: string
  icon: React.ReactNode
  duration: number
}

const LOADING_STEPS: LoadingStep[] = [
  {
    id: 'understanding',
    label: 'Understanding your trip preferences',
    icon: <Search className="h-5 w-5" />,
    duration: 1200,
  },
  {
    id: 'budget',
    label: 'Reading your budget and travel style',
    icon: <DollarSign className="h-5 w-5" />,
    duration: 1000,
  },
  {
    id: 'routes',
    label: 'Comparing realistic routes',
    icon: <Route className="h-5 w-5" />,
    duration: 1500,
  },
  {
    id: 'season',
    label: 'Checking season and crowd reality',
    icon: <Calendar className="h-5 w-5" />,
    duration: 1200,
  },
  {
    id: 'fatigue',
    label: 'Balancing route fatigue',
    icon: <Gauge className="h-5 w-5" />,
    duration: 1000,
  },
  {
    id: 'recommendations',
    label: 'Preparing consultant recommendations',
    icon: <Brain className="h-5 w-5" />,
    duration: 1500,
  },
]

export function AnalysisLoadingExperience() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (currentStepIndex >= LOADING_STEPS.length) return

    const currentStep = LOADING_STEPS[currentStepIndex]
    const timer = setTimeout(() => {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]))
      setCurrentStepIndex(prev => prev + 1)
    }, currentStep.duration)

    return () => clearTimeout(timer)
  }, [currentStepIndex])

  const progress = ((currentStepIndex) / LOADING_STEPS.length) * 100

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-white p-8"
        style={{
          borderColor: DESIGN_TOKENS.colors.border.subtle,
          boxShadow: DESIGN_TOKENS.shadows.lg,
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 mb-4"
          >
            <Brain className="h-8 w-8 text-blue-600" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            AI Travel Consultant at Work
          </h2>
          
          <p className="text-gray-600">
            Analyzing your travel preferences and finding the best routes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          
          <div className="mt-2 text-sm text-gray-500 text-center">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Loading Steps */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {LOADING_STEPS.map((step, index) => {
              const isCompleted = completedSteps.has(step.id)
              const isCurrent = index === currentStepIndex
              const isUpcoming = index > currentStepIndex

              if (isUpcoming) return null

              return (
                <motion.div
                  key={step.id}
                  {...(getMotionProps(loadingStepReveal) as any)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isCurrent ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isCurrent
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? 'text-gray-500'
                          : isCurrent
                          ? 'text-gray-900'
                          : 'text-gray-600'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>

                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"
                    />
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            This analysis uses real AI to understand your needs
          </p>
        </div>
      </motion.div>
    </div>
  )
}
