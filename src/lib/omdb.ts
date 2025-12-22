interface OMDBMovie {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
  Ratings?: Array<{
    Source: string
    Value: string
  }>
  imdbRating?: string
  Metascore?: string
}

interface OMDBSearchResponse {
  Search: OMDBMovie[]
  totalResults: string
  Response: string
}

interface OMDBDetailResponse {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: Array<{
    Source: string
    Value: string
  }>
  Metascore: string
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  DVD: string
  BoxOffice: string
  Production: string
  Website: string
  Response: string
}

export class OMDBService {
  private apiKey: string
  private baseUrl = 'https://www.omdbapi.com/'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY || 'c60b069d'
    console.log('OMDB API Key:', this.apiKey ? 'Set' : 'Not set')
  }

  async searchMovie(title: string): Promise<OMDBMovie[]> {
    try {
      console.log('Searching movie:', title, 'with API key:', this.apiKey)
      
      const response = await fetch(
        `${this.baseUrl}?apikey=${this.apiKey}&s=${encodeURIComponent(title)}&type=movie`
      )
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('OMDB API key is invalid or expired. Please check your NEXT_PUBLIC_OMDB_API_KEY environment variable.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.Response === 'False') {
        throw new Error(data.Error || 'Movie not found')
      }
      
      return data.Search || []
    } catch (error) {
      console.error('OMDB search error:', error)
      throw error
    }
  }

  async getMovieDetails(title: string, year?: string): Promise<OMDBDetailResponse | null> {
    try {
      let url = `${this.baseUrl}?apikey=${this.apiKey}&t=${encodeURIComponent(title)}&type=movie`
      
      if (year) {
        url += `&y=${year}`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('OMDB API key is invalid or expired. Please check your NEXT_PUBLIC_OMDB_API_KEY environment variable.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: OMDBDetailResponse = await response.json()
      
      if (data.Response === 'False') {
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting movie details:', error)
      return null
    }
  }

  async getMovieRating(title: string, year?: string): Promise<number> {
    try {
      const details = await this.getMovieDetails(title, year)
      
      if (!details || !details.imdbRating) {
        return 0
      }

      // Convert IMDB rating (0-10) to our scale (0-10)
      const imdbRating = parseFloat(details.imdbRating)
      
      if (isNaN(imdbRating)) {
        return 0
      }

      return imdbRating
    } catch (error) {
      console.error('Error getting movie rating:', error)
      return 0
    }
  }

  async findBestMatch(movieTitle: string, movieYear?: string): Promise<OMDBDetailResponse | null> {
    try {
      // First try exact match with year
      let details = await this.getMovieDetails(movieTitle, movieYear)
      
      if (details) {
        return details
      }

      // If not found, try without year
      details = await this.getMovieDetails(movieTitle)
      
      if (details) {
        return details
      }

      // If still not found, try searching and getting first result
      const searchResults = await this.searchMovie(movieTitle)
      
      if (searchResults.length > 0) {
        const firstResult = searchResults[0]
        return await this.getMovieDetails(firstResult.Title, firstResult.Year)
      }

      return null
    } catch (error) {
      console.error('Error finding best match:', error)
      return null
    }
  }

  extractGenres(genreString: string): string[] {
    if (!genreString) return []
    
    return genreString.split(',').map(genre => genre.trim()).filter(genre => genre.length > 0)
  }

  extractRuntime(runtimeString: string): number {
    if (!runtimeString) return 0
    
    // Extract number from runtime string (e.g., "120 min" -> 120)
    const match = runtimeString.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }
}

export const omdbService = new OMDBService()
