'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, User } from 'lucide-react'
import { FlexibleDateInput } from './flexible-date-input'
import Link from 'next/link'

interface AnalysisFormProps {
  onSubmit: (data: {
    query: string
    budget: string
    travelMonths: number[]
    interests: string[]
    flexibleDateInput?: string
  }) => void
  loading: boolean
}

export function AnalysisForm({ onSubmit, loading }: AnalysisFormProps) {
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState('moderate')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [flexibleDateInput, setFlexibleDateInput] = useState('')
  const [useFlexibleDates, setUseFlexibleDates] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    loadProfileDefaults()
  }, [])

  const loadProfileDefaults = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setHasProfile(true)
          if (data.profile.preferred_budget_level) {
            setBudget(data.profile.preferred_budget_level)
          }
          if (data.profile.preferred_interests?.length > 0) {
            setSelectedInterests(data.profile.preferred_interests)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setProfileLoaded(true)
    }
  }

  const months = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ]

  const interests = ['beach', 'culture', 'food', 'nightlife', 'nature', 'adventure', 'history', 'shopping']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    
    onSubmit({
      query,
      budget,
      travelMonths: selectedMonths,
      interests: selectedInterests,
      flexibleDateInput: useFlexibleDates ? flexibleDateInput : undefined,
    })
  }

  const handleFlexibleDateChange = (input: string, parsed: any) => {
    setFlexibleDateInput(input)
    if (parsed.months && parsed.months.length > 0) {
      setSelectedMonths(parsed.months)
    }
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    )
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Travel Analysis</CardTitle>
            <CardDescription>
              Get evidence-based destination recommendations powered by AI
            </CardDescription>
          </div>
          {profileLoaded && (
            hasProfile ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Profile Active
              </Badge>
            ) : (
              <Link href="/dashboard/profile">
                <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-accent">
                  <User className="h-3 w-3" />
                  Set Profile
                </Badge>
              </Link>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="query">What are you looking for?</Label>
            <Input
              id="query"
              placeholder="e.g., Best beach destination for summer vacation"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget Level</Label>
            <select
              id="budget"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={loading}
            >
              <option value="budget">Budget ($50-100/day)</option>
              <option value="moderate">Moderate ($100-200/day)</option>
              <option value="comfortable">Comfortable ($200-400/day)</option>
              <option value="luxury">Luxury ($400+/day)</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>Travel Timing</Label>
              <button
                type="button"
                onClick={() => setUseFlexibleDates(!useFlexibleDates)}
                className="text-xs text-primary hover:underline"
              >
                {useFlexibleDates ? 'Use specific months' : 'Use flexible dates'}
              </button>
            </div>

            {useFlexibleDates ? (
              <FlexibleDateInput
                value={flexibleDateInput}
                onChange={handleFlexibleDateChange}
                label=""
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {months.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => toggleMonth(month.value)}
                    disabled={loading}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                      selectedMonths.includes(month.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-accent'
                    }`}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Interests (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md border capitalize transition-colors ${
                    selectedInterests.includes(interest)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading || !query.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Destinations
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
