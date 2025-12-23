'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface FilterState {
  genre: string | null
  year: string | null
}

interface FilterContextType {
  filters: FilterState
  setGenre: (genre: string | null) => void
  setYear: (year: string | null) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    genre: null,
    year: null
  })

  const setGenre = (genre: string | null) => {
    setFilters(prev => ({ ...prev, genre }))
  }

  const setYear = (year: string | null) => {
    setFilters(prev => ({ ...prev, year }))
  }

  const clearFilters = () => {
    setFilters({
      genre: null,
      year: null
    })
  }

  const hasActiveFilters = filters.genre !== null || filters.year !== null

  return (
    <FilterContext.Provider value={{
      filters,
      setGenre,
      setYear,
      clearFilters,
      hasActiveFilters
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}
