// Rich Feedback UI Component
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, Send, X } from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'

interface RichFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedbackType: 'positive' | 'negative'
  destination: RankedDestination
  onSubmit: (feedback: RichFeedbackData) => Promise<void>
}

export interface RichFeedbackData {
  feedbackType: 'positive' | 'negative'
  selectedReasons: string[]
  comment: string
  preferenceCorrections: {
    budgetImportance?: 'increase' | 'decrease'
    nightlifeImportance?: 'increase' | 'decrease'
    safetyImportance?: 'increase' | 'decrease'
    routeComplexity?: 'simpler' | 'more_complex'
    destinationType?: 'nature' | 'cities'
  }
}

const POSITIVE_REASONS = [
  'Perfect match for my budget',
  'Great timing for weather',
  'Love the suggested activities',
  'Route looks well-planned',
  'Explanation was helpful',
  'Good value for money',
]

const NEGATIVE_REASONS = [
  'Too expensive for my budget',
  'Wrong season/weather',
  'Not interested in activities',
  'Route seems complicated',
  'Explanation unclear',
  'Missing important info',
  'Safety concerns',
  'Too touristy',
]

export function RichFeedbackDialog({
  open,
  onOpenChange,
  feedbackType,
  destination,
  onSubmit,
}: RichFeedbackDialogProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [preferenceCorrections, setPreferenceCorrections] = useState<RichFeedbackData['preferenceCorrections']>({})
  const [submitting, setSubmitting] = useState(false)

  const reasons = feedbackType === 'positive' ? POSITIVE_REASONS : NEGATIVE_REASONS

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        feedbackType,
        selectedReasons,
        comment: comment.trim(),
        preferenceCorrections,
      })
      onOpenChange(false)
      // Reset form
      setSelectedReasons([])
      setComment('')
      setPreferenceCorrections({})
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const togglePreference = (
    key: keyof RichFeedbackData['preferenceCorrections'],
    value: any
  ) => {
    setPreferenceCorrections(prev => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {feedbackType === 'positive' ? (
              <ThumbsUp className="h-5 w-5 text-green-600" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-orange-600" />
            )}
            Help us improve your recommendations
          </DialogTitle>
          <DialogDescription>
            Your feedback helps us understand your preferences better
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Reasons */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              What {feedbackType === 'positive' ? 'worked well' : 'could be better'}?
            </label>
            <div className="flex flex-wrap gap-2">
              {reasons.map(reason => (
                <Badge
                  key={reason}
                  variant={selectedReasons.includes(reason) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => toggleReason(reason)}
                >
                  {reason}
                </Badge>
              ))}
            </div>
          </div>

          {/* Free-text Comment */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Additional comments (optional)
            </label>
            <Textarea
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Preference Corrections */}
          {feedbackType === 'negative' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Help us adjust your preferences
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Budget importance</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={preferenceCorrections.budgetImportance === 'increase' ? 'default' : 'outline'}
                      onClick={() => togglePreference('budgetImportance', 'increase')}
                    >
                      More important
                    </Button>
                    <Button
                      size="sm"
                      variant={preferenceCorrections.budgetImportance === 'decrease' ? 'default' : 'outline'}
                      onClick={() => togglePreference('budgetImportance', 'decrease')}
                    >
                      Less important
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Safety importance</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={preferenceCorrections.safetyImportance === 'increase' ? 'default' : 'outline'}
                      onClick={() => togglePreference('safetyImportance', 'increase')}
                    >
                      More important
                    </Button>
                    <Button
                      size="sm"
                      variant={preferenceCorrections.safetyImportance === 'decrease' ? 'default' : 'outline'}
                      onClick={() => togglePreference('safetyImportance', 'decrease')}
                    >
                      Less important
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Route complexity</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={preferenceCorrections.routeComplexity === 'simpler' ? 'default' : 'outline'}
                      onClick={() => togglePreference('routeComplexity', 'simpler')}
                    >
                      Simpler routes
                    </Button>
                    <Button
                      size="sm"
                      variant={preferenceCorrections.routeComplexity === 'more_complex' ? 'default' : 'outline'}
                      onClick={() => togglePreference('routeComplexity', 'more_complex')}
                    >
                      More stops
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Destination type</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={preferenceCorrections.destinationType === 'nature' ? 'default' : 'outline'}
                      onClick={() => togglePreference('destinationType', 'nature')}
                    >
                      Prefer nature
                    </Button>
                    <Button
                      size="sm"
                      variant={preferenceCorrections.destinationType === 'cities' ? 'default' : 'outline'}
                      onClick={() => togglePreference('destinationType', 'cities')}
                    >
                      Prefer cities
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (selectedReasons.length === 0 && !comment.trim())}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
