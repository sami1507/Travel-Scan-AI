'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Autocomplete, type AutocompleteOption } from '@/components/ui/autocomplete'
import { Loader2, ArrowRight, ArrowLeft, Check, Plane, Shield, Clock, Calendar, Heart, Route, Wallet, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { searchAirports, formatAirportDisplay } from '@/lib/data/airports'
import { searchCountries, formatCountryDisplay } from '@/lib/data/countries'

type TripStructure = 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'

interface GuidedAnalysisFormProps {
  onSubmit: (data: {
    query: string
    departureCity: string
    budget: string
    tripLength: number
    travelMonths: number[]
    interests: string[]
    tripStructure: TripStructure
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

const TRIP_STRUCTURES = [
  {
    value: 'single_country_one_city' as TripStructure,
    label: 'Single Country - One City',
    description: 'Deep dive into one city with optional day trips',
    icon: '🏙️',
  },
  {
    value: 'single_country_multi_city' as TripStructure,
    label: 'Single Country - Multiple Cities',
    description: 'Explore 2-4 cities within one country',
    icon: '🗺️',
  },
  {
    value: 'multi_country' as TripStructure,
    label: 'Multiple Countries',
    description: 'Cross-border route with 2-3 countries',
    icon: '🌍',
  },
]

export function GuidedAnalysisForm({ onSubmit, loading }: GuidedAnalysisFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
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
  const [tripStructure, setTripStructure] = useState<TripStructure>('single_country_multi_city')
  const [optionalNote, setOptionalNote] = useState('')
  const [hasProfile, setHasProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  
  // Autocomplete state
  const [airportOptions, setAirportOptions] = useState<AutocompleteOption[]>([])
  const [countryOptions, setCountryOptions] = useState<AutocompleteOption[]>([])

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
      departureCity,
      budget,
      tripLength: parseInt(tripLength) || 7,
      travelMonths,
      interests: travelStyles,
      tripStructure,
    })
  }

  const isFormValid = departureCity && passport && (selectedMonth || selectedSeason)

  const canGoToStep2 = departureCity && passport
  const canGoToStep3 = tripLength && (selectedMonth || selectedSeason)
  const canGoToStep4 = tripStructure && travelStyles.length > 0

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  const [direction, setDirection] = useState(0)

  const goToNextStep = () => {
    setDirection(1)
    nextStep()
  }

  const goToPrevStep = () => {
    setDirection(-1)
    prevStep()
  }

  return (
    <Card className="border-2 overflow-hidden">
      <CardContent className="p-0">
        {/* Progress Bar */}
        <div className="bg-muted/30 px-8 py-6 border-b">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    currentStep === step
                      ? 'text-white ring-4 ring-[hsl(22,100%,62%)]/25'
                      : currentStep > step
                      ? 'text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  style={currentStep >= step ? { background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' } : {}}
                >
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 md:w-20 h-1 mx-2 transition-all ${
                      currentStep > step ? 'bg-[hsl(22,100%,62%)]' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 1: Where are you coming from? */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Let&apos;s plan your trip ✈️</h2>
                  <p className="text-muted-foreground">A few quick questions and we&apos;ll find your perfect destination</p>
                </div>

                <div className="space-y-5 max-w-xl mx-auto">
                  <div className="space-y-2.5">
                    <Label htmlFor="departure" className="flex items-center gap-2 text-base font-medium">
                      <Plane className="h-5 w-5" />
                      Departure City/Airport
                    </Label>
                    <Autocomplete
                      id="departure"
                      placeholder="e.g., New York, JFK"
                      value={departureCity}
                      onChange={setDepartureCity}
                      onSearch={(query) => {
                        const results = searchAirports(query)
                        setAirportOptions(results.map(airport => ({
                          value: airport.code,
                          label: formatAirportDisplay(airport)
                        })))
                      }}
                      options={airportOptions}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="passport" className="flex items-center gap-2 text-base font-medium">
                      <Shield className="h-5 w-5" />
                      Passport Country
                    </Label>
                    <Autocomplete
                      id="passport"
                      placeholder="e.g., United States, United Kingdom"
                      value={passport}
                      onChange={setPassport}
                      onSearch={(query) => {
                        const results = searchCountries(query)
                        setCountryOptions(results.map(country => ({
                          value: country.code,
                          label: formatCountryDisplay(country)
                        })))
                      }}
                      options={countryOptions}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!canGoToStep2}
                    size="lg"
                    className="min-w-[200px] border-0 text-white shadow-orange-200"
                    style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: How long & when? */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">When are you traveling?</h2>
                </div>

                <div className="space-y-6 max-w-xl mx-auto">
                  <div className="space-y-3">
                    <Label htmlFor="tripLength" className="flex items-center gap-2 text-base font-medium">
                      <Clock className="h-5 w-5" />
                      Trip Length (days)
                    </Label>
                    <Input
                      id="tripLength"
                      type="number"
                      min="1"
                      max="30"
                      placeholder="7"
                      value={tripLength}
                      onChange={(e) => setTripLength(e.target.value)}
                      disabled={loading}
                      className="text-lg h-14 text-center"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Calendar className="h-5 w-5" />
                      Season or Month
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
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(SEASONS).map(([key, season]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedSeason(key as keyof typeof SEASONS)}
                            disabled={loading}
                            className={`p-5 rounded-lg border-2 transition-all text-center ${
                              selectedSeason === key
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-input hover:border-primary/50'
                            }`}
                          >
                            <div className="text-3xl mb-2">{season.icon}</div>
                            <div className="font-semibold">{season.label}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <select
                        className="w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-base"
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
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    onClick={goToPrevStep}
                    variant="outline"
                    size="lg"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!canGoToStep3}
                    size="lg"
                    className="min-w-[200px] border-0 text-white shadow-orange-200"
                    style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: What's your vibe? */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">What kind of trip?</h2>
                </div>

                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Route className="h-5 w-5" />
                      Trip Structure
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {TRIP_STRUCTURES.map((structure) => (
                        <button
                          key={structure.value}
                          type="button"
                          onClick={() => setTripStructure(structure.value)}
                          disabled={loading}
                          className={`p-5 rounded-lg border-2 transition-all text-left relative ${
                            tripStructure === structure.value
                              ? 'border-[hsl(199,89%,68%)] bg-[hsl(199,89%,68%)]/8 ring-2 ring-[hsl(199,89%,68%)]/25'
                              : 'border-input hover:border-[hsl(199,89%,68%)]/50'
                          }`}
                        >
                          {tripStructure === structure.value && (
                            <div className="absolute top-3 right-3">
                              <Check className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
                            </div>
                          )}
                          <div className="text-3xl mb-3">{structure.icon}</div>
                          <div className="font-semibold mb-1 text-sm">{structure.label}</div>
                          <div className="text-xs text-muted-foreground">{structure.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Heart className="h-5 w-5" />
                      Interests (select all that apply)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {TRAVEL_STYLES.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => toggleTravelStyle(style.value)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-full border-2 transition-all flex items-center gap-2 ${
                            travelStyles.includes(style.value)
                              ? 'border-[hsl(199,89%,68%)] bg-[hsl(199,89%,68%)]/8 text-[hsl(199,60%,35%)] font-medium'
                              : 'border-input hover:border-[hsl(199,89%,68%)]/50'
                          }`}
                        >
                          <span className="text-lg">{style.icon}</span>
                          <span className="text-sm">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    onClick={goToPrevStep}
                    variant="outline"
                    size="lg"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!canGoToStep4}
                    size="lg"
                    className="min-w-[200px] border-0 text-white shadow-orange-200"
                    style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: What's your budget? */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">What&apos;s your budget level?</h2>
                </div>

                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Wallet className="h-5 w-5" />
                      Daily Budget
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setBudget('budget')}
                        disabled={loading}
                        className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                          budget === 'budget'
                            ? 'border-[hsl(199,89%,68%)] bg-[hsl(199,89%,68%)]/8 ring-2 ring-[hsl(199,89%,68%)]/25'
                            : 'border-input hover:border-[hsl(199,89%,68%)]/50'
                        }`}
                      >
                        {budget === 'budget' && (
                          <div className="absolute top-3 right-3">
                            <Check className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
                          </div>
                        )}
                        <div className="text-3xl mb-2">💰</div>
                        <div className="font-semibold mb-1">Budget</div>
                        <div className="text-sm text-muted-foreground">$50-100/day</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBudget('moderate')}
                        disabled={loading}
                        className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                          budget === 'moderate'
                            ? 'border-[hsl(199,89%,68%)] bg-[hsl(199,89%,68%)]/8 ring-2 ring-[hsl(199,89%,68%)]/25'
                            : 'border-input hover:border-[hsl(199,89%,68%)]/50'
                        }`}
                      >
                        {budget === 'moderate' && (
                          <div className="absolute top-3 right-3">
                            <Check className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
                          </div>
                        )}
                        <div className="text-3xl mb-2">💵</div>
                        <div className="font-semibold mb-1">Moderate</div>
                        <div className="text-sm text-muted-foreground">$100-200/day</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBudget('comfortable')}
                        disabled={loading}
                        className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                          budget === 'comfortable'
                            ? 'border-[hsl(199,89%,68%)] bg-[hsl(199,89%,68%)]/8 ring-2 ring-[hsl(199,89%,68%)]/25'
                            : 'border-input hover:border-[hsl(199,89%,68%)]/50'
                        }`}
                      >
                        {budget === 'comfortable' && (
                          <div className="absolute top-3 right-3">
                            <Check className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
                          </div>
                        )}
                        <div className="text-3xl mb-2">💳</div>
                        <div className="font-semibold mb-1">Comfortable</div>
                        <div className="text-sm text-muted-foreground">$200-400/day</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBudget('luxury')}
                        disabled={loading}
                        className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                          budget === 'luxury'
                            ? 'border-[hsl(199,89%,68%)] bg-[hsl(199,89%,68%)]/8 ring-2 ring-[hsl(199,89%,68%)]/25'
                            : 'border-input hover:border-[hsl(199,89%,68%)]/50'
                        }`}
                      >
                        {budget === 'luxury' && (
                          <div className="absolute top-3 right-3">
                            <Check className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
                          </div>
                        )}
                        <div className="text-3xl mb-2">💎</div>
                        <div className="font-semibold mb-1">Luxury</div>
                        <div className="text-sm text-muted-foreground">$400+/day</div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-base font-medium text-muted-foreground">
                      Anything specific? (optional)
                    </Label>
                    <Input
                      id="note"
                      placeholder="e.g. I love hidden cafes and local markets"
                      value={optionalNote}
                      onChange={(e) => setOptionalNote(e.target.value)}
                      disabled={loading}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    onClick={goToPrevStep}
                    variant="outline"
                    size="lg"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !isFormValid}
                    size="lg"
                    className="min-w-[250px] h-12 border-0 text-white shadow-orange-200"
                    style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Finding Destinations...
                      </>
                    ) : (
                      <>
                        Find My Destinations <Sparkles className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>
    </Card>
  )
}
