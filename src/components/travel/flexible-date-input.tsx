'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar, Info } from 'lucide-react'

interface ParsedDate {
  type: string
  months: number[]
  season?: string
  description: string
}

interface FlexibleDateInputProps {
  value: string
  onChange: (value: string, parsed: ParsedDate) => void
  label?: string
}

// Client-side date parsing
function parseFlexibleDate(input: string): ParsedDate {
  const normalized = input.toLowerCase().trim()
  
  if (normalized.includes('this month')) {
    const currentMonth = new Date().getMonth() + 1
    return {
      type: 'specific_month',
      months: [currentMonth],
      description: `Current month`,
    }
  }
  
  const monthMatch = normalized.match(/(early|late|mid)\s+(\w+)/)
  if (monthMatch) {
    const [, timing, monthName] = monthMatch
    const month = parseMonthName(monthName)
    if (month) {
      return {
        type: `${timing}_month`,
        months: [month],
        description: `${timing.charAt(0).toUpperCase() + timing.slice(1)} ${getMonthName(month)}`,
      }
    }
  }
  
  const betweenMatch = normalized.match(/between\s+(\w+)\s+and\s+(\w+)/)
  if (betweenMatch) {
    const [, month1Name, month2Name] = betweenMatch
    const month1 = parseMonthName(month1Name)
    const month2 = parseMonthName(month2Name)
    if (month1 && month2) {
      const months = getMonthRange(month1, month2)
      return {
        type: 'month_range',
        months,
        description: `${getMonthName(month1)} to ${getMonthName(month2)}`,
      }
    }
  }
  
  const seasons: Record<string, number[]> = {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    fall: [9, 10, 11],
    autumn: [9, 10, 11],
    winter: [12, 1, 2],
  }
  
  for (const [season, months] of Object.entries(seasons)) {
    if (normalized.includes(season)) {
      return {
        type: 'season',
        months,
        season,
        description: `${season.charAt(0).toUpperCase() + season.slice(1)} season`,
      }
    }
  }
  
  if (normalized.includes('best') && (normalized.includes('week') || normalized.includes('window'))) {
    return {
      type: 'best_window',
      months: [],
      description: 'Best available window',
    }
  }
  
  return {
    type: 'flexible',
    months: [],
    description: 'Flexible timing',
  }
}

function parseMonthName(name: string): number | null {
  const months: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  }
  return months[name.toLowerCase()] || null
}

function getMonthName(month: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return names[month - 1] || ''
}

function getMonthRange(start: number, end: number): number[] {
  const months: number[] = []
  let current = start
  
  while (current !== end) {
    months.push(current)
    current = current === 12 ? 1 : current + 1
    if (months.length > 12) break
  }
  months.push(end)
  
  return months
}

export function FlexibleDateInput({ value, onChange, label = "When do you want to travel?" }: FlexibleDateInputProps) {
  const [parsed, setParsed] = useState<ParsedDate | null>(null)

  const handleChange = (input: string) => {
    const result = parseFlexibleDate(input)
    setParsed(result)
    onChange(input, result)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="flexible-date" className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        {label}
      </Label>
      <Input
        id="flexible-date"
        type="text"
        placeholder='e.g., "this month", "late September", "between June and August"'
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
      
      {parsed && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {parsed.description}
          </Badge>
          {parsed.months.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {parsed.months.length} month{parsed.months.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}
      
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium mb-1">Examples:</p>
          <ul className="space-y-0.5">
            <li>• &quot;this month&quot; - Current month</li>
            <li>• &quot;early September&quot; - First 10 days</li>
            <li>• &quot;late November&quot; - Last 10 days</li>
            <li>• &quot;between June and August&quot; - Summer months</li>
            <li>• &quot;spring&quot; or &quot;summer&quot; - Seasonal</li>
            <li>• &quot;best 2-week window&quot; - Optimal timing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
