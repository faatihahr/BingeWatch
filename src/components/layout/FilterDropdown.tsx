'use client'

import { useState, useEffect, useRef } from 'react'

interface FilterDropdownProps {
  type: 'genre' | 'year' | 'country'
  label: string
  options: string[]
  selectedValue: string | null
  onSelect: (value: string | null) => void
}

export default function FilterDropdown({ 
  type, 
  label, 
  options, 
  selectedValue, 
  onSelect 
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (value: string | null) => {
    onSelect(value)
    setIsOpen(false)
  }

  const getDisplayValue = () => {
    if (selectedValue) return selectedValue
    return label
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
          selectedValue 
            ? 'bg-blue-600 border-blue-600 text-white' 
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-500'
        }`}
      >
        <span className="text-sm font-medium">{getDisplayValue()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-48 max-h-64 overflow-y-auto">
          <button
            onClick={() => handleSelect(null)}
            className="block w-full text-left px-4 py-2 text-gray-400 hover:bg-gray-700 transition-colors text-sm"
          >
            All {label}
          </button>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`block w-full text-left px-4 py-2 transition-colors text-sm ${
                selectedValue === option
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
