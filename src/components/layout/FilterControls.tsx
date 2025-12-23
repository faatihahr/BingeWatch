'use client'

import FilterDropdown from './FilterDropdown'
import { useFilters } from '@/contexts/FilterContext'
import { FiTrash2 } from 'react-icons/fi'

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 
  'Romance', 'Sci-Fi', 'Thriller', 'Animation', 'Documentary', 'Crime', 
  'Family', 'Musical', 'War', 'Western'
]

const YEARS = [
  '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016',
  '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007',
  '2006', '2005', '2004', '2003', '2002', '2001', '2000'
]

export default function FilterControls() {
  const { filters, setGenre, setYear, clearFilters, hasActiveFilters } = useFilters()

  return (
    <div className="flex items-center space-x-3">
      <FilterDropdown
        type="genre"
        label="Genre"
        options={GENRES}
        selectedValue={filters.genre}
        onSelect={setGenre}
      />
      
      <FilterDropdown
        type="year"
        label="Year"
        options={YEARS}
        selectedValue={filters.year}
        onSelect={setYear}
      />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
          aria-label="Clear all filters"
        >
          <FiTrash2 className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  )
}
