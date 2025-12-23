'use client'

import { useState, useEffect } from 'react'
import { omdbService } from '@/lib/omdb'

interface OMDBMovie {
  imdbID: string
  Title: string
  Year: string
  Poster: string
  Type: string
}

interface TopMovieProps {
  movie: OMDBMovie
  rank: number
}

const CrownBadge = ({ rank }: { rank: number }) => {
  const crownColors = {
    1: 'text-yellow-400', // Gold
    2: 'text-gray-300',   // Silver  
    3: 'text-orange-600'  // Bronze
  }

  const crownColor = crownColors[rank as keyof typeof crownColors] || 'text-gray-500'

  return (
    <div className={`absolute top-2 left-2 z-10 ${crownColor} sm:top-3 sm:left-3`}>
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        className="drop-shadow-lg sm:w-10 sm:h-10"
      >
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.71-5L12 12.5 7.15 9l.71 5z"/>
      </svg>
    </div>
  )
}

const TopMovieCard = ({ movie, rank }: TopMovieProps) => {
  return (
    <div className="relative group">
      <CrownBadge rank={rank} />
      <div className="relative overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105 w-32 h-48 sm:w-48 sm:h-72">
        <img
          src={movie.Poster}
          alt={movie.Title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/images/placeholder.png'
          }}
        />
      </div>
    </div>
  )
}

export default function TopMovies() {
  const [topMovies, setTopMovies] = useState<OMDBMovie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopMovies = async () => {
      try {
        const movies = await omdbService.getTopMoviesOfYear(new Date().getFullYear(), 3)
        setTopMovies(movies)
      } catch (error) {
        console.error('Error fetching top movies:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopMovies()
  }, [])

  if (loading) {
    return (
      <div className="py-12 px-4 sm:py-16">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">TOP Movies</h2>
        </div>
        <div className="flex justify-center gap-3 sm:gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-24 h-36 bg-gray-700 rounded-lg sm:w-48 sm:h-72"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (topMovies.length === 0) {
    return null
  }

  return (
    <div className="py-12 px-4 bg-gradient-to-b from-black to-gray-900 sm:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl font-bold text-white mb-2 sm:text-4xl">TOP Movies</h2>
        <p className="text-gray-400 text-sm sm:text-base">Best movies of {new Date().getFullYear()}</p>
      </div>
      
      <div className="flex justify-center items-center gap-4 max-w-6xl mx-auto sm:gap-6">
        {topMovies.map((movie, index) => {
          // Reorder: [2nd, 1st, 3rd] to put 1st in center
          const displayOrder = [1, 0, 2]
          const actualIndex = displayOrder[index]
          const currentMovie = topMovies[actualIndex]
          
          return (
            <div 
              key={currentMovie.imdbID} 
              className={`transition-all duration-300 ${
                actualIndex === 0 ? 'scale-110 sm:scale-110' : actualIndex === 1 ? 'scale-90 sm:scale-100' : 'scale-80 sm:scale-90'
              }`}
            >
              <TopMovieCard movie={currentMovie} rank={actualIndex + 1} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
