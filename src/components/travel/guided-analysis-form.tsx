'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, User, Plane, Calendar, Wallet, Clock, Heart, Home, Shield } from 'lucide-react'
import Link from 'next/link'

interface GuidedAnalysisFormProps {
  onSubmit: (data: {
    query: string
    budget: string
    travelMonths: number[]
    interests: string[]
  }) => void
  loading: boolean
}

const SEASONS = {
  winter: { label: 'Winter', months: [12, 1, 2], icon: '❄️' },
  spring: { label: 'Spring', months: [3, 4, 5], icon: '🌸' },
  summer: { label: 'Summer', months: [6, 7, 8], icon: '☀️' },
  autumn: { label: 'Autumn', months: [9, 10, 11], icon: '🍂' },
}

const TRAVEL_STYLES = [
  { value: 'city', label: 'City Life', icon: '🏙️' },
  { value: 'nature', label: 'Nature', icon: '🏞️' },
  { value: 'nightlife', label: 'Nightlife', icon: '🎉' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'history', label: 'History & Culture', icon: '🏛️' },
  { value: 'relaxation', label: 'Relaxation', icon: '🧘' },
]

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'apartment', label: 'Apartment', icon: '🏠' },
  { value: 'either', label: 'Either', icon: '🏘️' },
]

export function GuidedAnalysisForm({ onSubmit, loading }: GuidedAnalysisFormProps) {
  const [departureCity, setDepartureCity] = useState('')
  const [passport, setPassport] = useState('')
  const [budget, setBudget] = useState('moderate')
  const [currency, setCurrency] = useState('USD')
  const [tripLength, setTripLength] = useState('7')
  const [timingMode, setTimingMode] = useState<'month' | 'season'>('season')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<keyof typeof SEASONS | null>(null)
  const [travelStyles, setTravelStyles] = useState<string[]>([])
  const [accommodation, setAccommodation] = useState('either')
  const [optionalNote, setOptionalNote] = useState('')
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
          if (data.profile.home_airport) {
            setDepartureCity(data.profile.home_airport)
          }
          if (data.profile.passport_country) {
            setPassport(data.profile.passport_country)
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
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  const toggleTravelStyle = (style: string) => {
    setTravelStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Build query from structured inputs
    const queryParts: string[] = []
    
    if (departureCity) queryParts.push(`Traveling from ${departureCity}`)
    if (passport) queryParts.push(`passport: ${passport}`)
    if (tripLength) queryParts.push(`${tripLength} days`)
    if (travelStyles.length > 0) queryParts.push(`interests: ${travelStyles.join(', ')}`)
    if (accommodation !== 'either') queryParts.push(`prefer ${accommodation}`)
    if (optionalNote) queryParts.push(optionalNote)
    
    const query = queryParts.join('. ')
    
    // Determine travel months
    let travelMonths: number[] = []
    if (timingMode === 'month' && selectedMonth) {
      travelMonths = [selectedMonth]
    } else if (timingMode === 'season' && selectedSeason) {
      travelMonths = SEASONS[selectedSeason].months
    }
    
    onSubmit({
      query,
      budget,
      travelMonths,
      interests: travelStyles,
    })
  }

  const isFormValid = departureCity && passport && (selectedMonth || selectedSeason)

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Get Travel Recommendations</CardTitle>
            <CardDescription className="text-base mt-1">
              Answer a few questions to get 3 personalized destination recommendations
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
          {/* Departure & Passport */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Departure City/Airport
              </Label>
              <Input
                id="departure"
                placeholder="e.g., New York, JFK"
                value={departureCity}
                onChange={(e) => setDepartureCity(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Passport Country
              </Label>
              <Input
                id="passport"
                placeholder="e.g., USA, UK, Canada"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Budget & Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Budget Level
              </Label>
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
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={loading}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          {/* Trip Length */}
          <div className="space-y-2">
            <Label htmlFor="tripLength" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trip Length (days)
            </Label>
            <Input
              id="tripLength"
              type="number"
              min="1"
              max="365"
              placeholder="7"
              value={tripLength}
              onChange={(e) => setTripLength(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Travel Timing */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              When do you want to travel?
            </Label>
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                variant={timingMode === 'season' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimingMode('season')}
                disabled={loading}
              >
                By Season
              </Button>
              <Button
                type="button"
                variant={timingMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimingMode('month')}
                disabled={loading}
              >
                Specific Month
              </Button>
            </div>

            {timingMode === 'season' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SEASONS).map(([key, season]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedSeason(key as keyof typeof SEASONS)}
                    disabled={loading}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      selectedSeason === key
                        ? 'border-primary bg-primary/10'
                        : 'border-input hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{season.icon}</div>
                    <div className="font-medium">{season.label}</div>
                  </button>
                ))}
              </div>
            ) : (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={loading}
              >
                <option value="">Select a month</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Travel Style */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Travel Style (select all that apply)
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TRAVEL_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => toggleTravelStyle(style.value)}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    travelStyles.includes(style.value)
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{style.icon}</span>
                    <span className="text-sm font-medium">{style.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Accommodation */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Accommodation Preference
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {ACCOMMODATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAccommodation(type.value)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    accommodation === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm text-muted-foreground">
              Additional Notes (Optional)
            </Label>
            <Input
              id="note"
              placeholder="Any specific preferences or requirements?"
              value={optionalNote}
              onChange={(e) => setOptionalNote(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || !isFormValid} 
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Finding Your Perfect Destinations...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Get 3 Recommendations
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
