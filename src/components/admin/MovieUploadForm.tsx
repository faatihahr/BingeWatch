'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { omdbService } from '@/lib/omdb'
import { formatIDR, parseIDR } from '@/lib/currency'

// Use service role key for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nrsklnfxhvfuqixfvzol.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc2tsbmZ4aHZmdXFpeGZ2em9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM5NzEyOCwiZXhwIjoyMDgxOTczMTI4fQ.y6zcM47UFxhguzBo2EHorHckeWgOrLHnyT4sYllZFaQ',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface MovieFormData {
  title: string
  description: string
  duration: number
  price: number
  genre: string[]
  release_date: string
  rating: number
  thumbnail_url: string
  video_url: string
  trailer_url: string
}

export default function MovieUploadForm() {
  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    description: '',
    duration: 120,
    price: 15000, // Default price in IDR (15,000)
    genre: [],
    release_date: '',
    rating: 5.0,
    thumbnail_url: '',
    video_url: '',
    trailer_url: ''
  })
  const [genreInput, setGenreInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isFetchingRating, setIsFetchingRating] = useState(false)
  const [priceInput, setPriceInput] = useState('15000') // For formatted input

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPriceInput(value)
    
    // Parse and update actual price
    const price = parseIDR(value)
    setFormData(prev => ({
      ...prev,
      price: price
    }))
  }

  const handleAddGenre = () => {
    if (genreInput.trim() && !formData.genre.includes(genreInput.trim())) {
      setFormData(prev => ({
        ...prev,
        genre: [...prev.genre, genreInput.trim()]
      }))
      setGenreInput('')
    }
  }

  const handleRemoveGenre = (genreToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      genre: prev.genre.filter(genre => genre !== genreToRemove)
    }))
  }

  const fetchMovieRating = async () => {
    if (!formData.title) {
      setMessage('Please enter movie title first')
      return
    }

    setIsFetchingRating(true)
    setMessage('Fetching movie information from OMDB...')

    try {
      // Try to find movie by title only first
      let movieDetails = await omdbService.findBestMatch(formData.title)
      
      // If not found, try with release date if provided
      if (!movieDetails && formData.release_date) {
        const year = new Date(formData.release_date).getFullYear().toString()
        movieDetails = await omdbService.findBestMatch(formData.title, year)
      }

      if (movieDetails) {
        // Update form with OMDB data
        setFormData(prev => ({
          ...prev,
          rating: parseFloat(movieDetails.imdbRating || '5.0') || 5.0,
          genre: omdbService.extractGenres(movieDetails.Genre || ''),
          duration: omdbService.extractRuntime(movieDetails.Runtime || '') || 120,
          description: movieDetails.Plot || prev.description,
          thumbnail_url: movieDetails.Poster || prev.thumbnail_url,
          release_date: movieDetails.Released ? new Date(movieDetails.Released).toISOString().split('T')[0] : prev.release_date
        }))

        setMessage(`Successfully fetched data for "${movieDetails.Title}"`)
      } else {
        setMessage('Movie not found in OMDB database')
      }
    } catch (error) {
      console.error('Error fetching movie data:', error)
      setMessage('Error fetching movie data. Please try again.')
    } finally {
      setIsFetchingRating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    // Validate required fields
    if (!formData.title || !formData.description || !formData.video_url) {
      setMessage('Please fill in all required fields')
      setIsSubmitting(false)
      return
    }

    try {
      console.log('Submitting movie data:', formData)
      
      // Prepare data with proper validation
      const movieData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        duration: Number(formData.duration) || 120,
        price: Number(formData.price) || 15000,
        genre: Array.isArray(formData.genre) ? formData.genre : [],
        release_date: formData.release_date || new Date().toISOString().split('T')[0],
        rating: Number(formData.rating) || 5.0,
        thumbnail: formData.thumbnail_url?.trim() || '',
        video_url: formData.video_url.trim(),
        trailer_url: formData.trailer_url?.trim() || ''
      }
      
      console.log('Prepared movie data:', movieData)
      
      const { data, error } = await supabaseAdmin
        .from('movies')
        .insert([movieData])
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Movie uploaded successfully:', data)

      // Verify data was stored
      if (data && data[0]) {
        const { data: verifyData, error: verifyError } = await supabaseAdmin
          .from('movies')
          .select('*')
          .eq('id', data[0].id)
          .single()

        if (verifyError) {
          console.error('Verification error:', verifyError)
          setMessage('Movie uploaded but verification failed')
        } else {
          console.log('Data verified in database:', verifyData)
          setMessage(`Movie "${formData.title}" uploaded and verified successfully!`)
        }
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        duration: 120,
        price: 15000, // Default price in IDR
        genre: [],
        release_date: '',
        rating: 5.0,
        thumbnail_url: '',
        video_url: '',
        trailer_url: ''
      })
      setPriceInput('15000') // Reset price input
    } catch (error) {
      console.error('Upload error:', error)
      setMessage('Error uploading movie. Please check console for details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-semibold mb-6">Upload New Movie</h2>
      
      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.includes('success') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={fetchMovieRating}
                disabled={isFetchingRating || !formData.title}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm cursor-pointer"
              >
                {isFetchingRating ? 'Fetching...' : 'Fetch OMDB Data'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes) *</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              required
              min="1"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price (IDR) *</label>
            <input
              type="text"
              name="price"
              value={formatIDR(formData.price)}
              onChange={handlePriceChange}
              placeholder="Rp 15.000"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Enter price in Indonesian Rupiah</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Release Date *</label>
            <input
              type="date"
              name="release_date"
              value={formData.release_date}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rating (1-10) *</label>
            <input
              type="number"
              name="rating"
              value={formData.rating}
              onChange={handleInputChange}
              required
              min="1"
              max="10"
              step="0.1"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Thumbnail URL *</label>
            <input
              type="url"
              name="thumbnail_url"
              value={formData.thumbnail_url}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Video URL *</label>
          <input
            type="url"
            name="video_url"
            value={formData.video_url}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Trailer URL</label>
          <input
            type="url"
            name="trailer_url"
            value={formData.trailer_url}
            onChange={handleInputChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Optional: YouTube or other video platform URL for movie trailer</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Genres</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGenre())}
              placeholder="Enter genre and press Enter"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddGenre}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.genre.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 rounded-full text-sm"
              >
                {genre}
                <button
                  type="button"
                  onClick={() => handleRemoveGenre(genre)}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? 'Uploading...' : 'Upload Movie'}
        </button>
      </form>
    </div>
  )
}
