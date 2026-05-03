'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { User, Save, Loader2 } from 'lucide-react'
import type { UserTravelProfile } from '@/lib/services/user-profile'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserTravelProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const method = profile.id ? 'PATCH' : 'POST'
      const response = await fetch('/api/profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof UserTravelProfile>(
    field: K,
    value: UserTravelProfile[K]
  ) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null)
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentProfile = profile || {} as Partial<UserTravelProfile>
  const completeness = currentProfile.profile_completeness || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Travel Profile</h1>
          <p className="text-muted-foreground mt-1">
            Set your preferences for personalized recommendations
          </p>
        </div>
        <Button onClick={saveProfile} disabled={!hasChanges || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>

      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile Completeness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={completeness} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {completeness}% complete - {completeness === 100 ? 'All set!' : 'Fill in more details for better recommendations'}
          </p>
        </CardContent>
      </Card>

      {/* Budget Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Preferences</CardTitle>
          <CardDescription>
            Your typical budget range for trips
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred Budget Level</Label>
            <Select
              value={currentProfile.preferred_budget_level || ''}
              onValueChange={(value) => updateField('preferred_budget_level', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="budget">Budget ($50-100/day)</SelectItem>
                <SelectItem value="moderate">Moderate ($100-200/day)</SelectItem>
                <SelectItem value="comfortable">Comfortable ($200-400/day)</SelectItem>
                <SelectItem value="luxury">Luxury ($400+/day)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Budget Flexibility</Label>
            <Select
              value={currentProfile.budget_flexibility || ''}
              onValueChange={(value) => updateField('budget_flexibility', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="How flexible is your budget?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict - Must stay within budget</SelectItem>
                <SelectItem value="flexible">Flexible - Can adjust if needed</SelectItem>
                <SelectItem value="very-flexible">Very Flexible - Budget is just a guideline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Travel Style Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Travel Style</CardTitle>
          <CardDescription>
            Rate the importance of these factors (1-10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { key: 'nightlife_importance', label: 'Nightlife', desc: '1 = Not important • 10 = Essential' },
            { key: 'nature_importance', label: 'Nature & Outdoors', desc: '1 = Not important • 10 = Essential' },
            { key: 'comfort_vs_adventure', label: 'Comfort vs Adventure', desc: '1 = Maximum comfort • 10 = Maximum adventure' },
            { key: 'transport_importance', label: 'Transport Quality', desc: '1 = Not important • 10 = Essential' },
            { key: 'safety_importance', label: 'Safety', desc: '1 = Not important • 10 = Essential' },
            { key: 'hotel_quality_importance', label: 'Hotel Quality', desc: '1 = Not important • 10 = Essential' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <Badge variant="secondary">{currentProfile[key as keyof UserTravelProfile] || 5}</Badge>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={currentProfile[key as keyof UserTravelProfile] as number || 5}
                onChange={(e) => updateField(key as keyof UserTravelProfile, parseInt(e.target.value) as any)}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trip Style */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Style</CardTitle>
          <CardDescription>
            Your typical travel patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred Trip Style</Label>
            <Select
              value={currentProfile.preferred_trip_style || ''}
              onValueChange={(value) => updateField('preferred_trip_style', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="How do you usually travel?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo Travel</SelectItem>
                <SelectItem value="couple">Couple/Partner</SelectItem>
                <SelectItem value="family">Family with Kids</SelectItem>
                <SelectItem value="friends">Friends Group</SelectItem>
                <SelectItem value="business">Business Travel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred Pace</Label>
            <Select
              value={currentProfile.preferred_pace || ''}
              onValueChange={(value) => updateField('preferred_pace', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="How fast do you like to travel?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relaxed">Relaxed - 2-3 activities per day</SelectItem>
                <SelectItem value="moderate">Moderate - 4-5 activities per day</SelectItem>
                <SelectItem value="fast">Fast - 6+ activities per day</SelectItem>
                <SelectItem value="very-fast">Very Fast - Pack everything in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={!hasChanges || saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
