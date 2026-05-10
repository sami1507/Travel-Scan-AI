'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  required?: boolean
  className?: string
}

export function Autocomplete({
  options,
  value,
  onChange,
  onSearch,
  placeholder,
  disabled,
  id,
  required,
  className,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Update input value when prop value changes
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
    onSearch(newValue)
    setOpen(true)
    setHighlightedIndex(0)
  }

  const handleSelectOption = (option: AutocompleteOption) => {
    setInputValue(option.label)
    onChange(option.label)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }

    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (options[highlightedIndex]) {
          handleSelectOption(options[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      setOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn('pr-10', className)}
          autoComplete="off"
        />
        <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {open && options.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-1">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer flex items-center justify-between',
                  highlightedIndex === index
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <span>{option.label}</span>
                {inputValue === option.label && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
