'use client'

import { useState, useEffect, useRef } from 'react'
import { Movie } from '@/types'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const searchMovies = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .ilike('title', `%${query}%`)
          .limit(5)
          .order('title')

        if (error) {
          console.error('Error searching movies:', error)
          setSuggestions([])
        } else {
          setSuggestions(data || [])
        }
      } catch (error) {
        console.error('Error searching movies:', error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchMovies, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(value.trim() !== '')
  }

  const handleSuggestionClick = (movie: Movie) => {
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(query.trim() !== '')}
          placeholder="Search movies..."
          className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((movie) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                onClick={() => handleSuggestionClick(movie)}
                className="block p-3 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {movie.thumbnail ? (
                    <img
                      src={movie.thumbnail}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/40x56/374151/6B7280?text=No+Poster'
                      }}
                    />
                  ) : (
                    <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">
                      No Poster
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{movie.title}</p>
                    <p className="text-gray-400 text-sm truncate">{movie.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-blue-400 text-sm font-semibold">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0
                        }).format(movie.price)}
                      </span>
                      <span className="text-yellow-400 text-sm">★</span>
                      <span className="text-gray-400 text-sm">{movie.rating}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : query.trim() !== '' ? (
            <div className="p-4 text-center text-gray-400">
              <p>No movies found for "{query}"</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
