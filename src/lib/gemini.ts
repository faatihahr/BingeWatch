import { Movie } from '@/types'
import { supabase } from '@/lib/supabase'

interface AISearchResult {
  movies: Movie[]
  query: string
  originalQuery: string
}

export class GeminiSearchService {
  async searchMovies(query: string): Promise<AISearchResult> {
    try {
      // Call the API route
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error('AI search failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error in AI search:', error)
      // Fallback to regular search
      return this.fallbackSearch(query)
    }
  }

  private detectIndonesian(query: string): boolean {
    const indonesianWords = ['film', 'movie', 'cari', 'tentang', 'yang', 'dan', 'atau', 'seperti', 'adalah', 'ini', 'itu']
    const words = query.toLowerCase().split(' ')
    return words.some(word => indonesianWords.includes(word)) || /[āēīōūāēīōū]/.test(query)
  }

  private createSearchPrompt(query: string, isIndonesian: boolean): string {
    if (isIndonesian) {
      return `Kamu adalah asisten pencarian film. Pengguna mencari: "${query}"

Tugas kamu:
1. Pahami maksud pencarian pengguna (bisa berupa deskripsi, genre, aktor, sutradara, atau keywords apapun)
2. Identifikasi film-film yang relevan berdasarkan deskripsi tersebut
3. Kembalikan hanya judul-judul film yang mungkin ada, dipisahkan dengan koma
4. Maksimal 5 judul film
5. Jangan tambahkan penjelasan atau teks lain

Contoh:
Input: "film tentang superhero marvel"
Output: "Avengers, Iron Man, Captain America, Thor, Black Panther"

Input: "film romantis yang lucu"
Output: "Crazy Rich Asians, The Proposal, 50 First Dates, Notting Hill, Love Actually"

Sekarang untuk query: "${query}"`
    } else {
      return `You are a movie search assistant. User is searching for: "${query}"

Your task:
1. Understand the user's search intent (could be description, genre, actor, director, or any keywords)
2. Identify relevant movies based on that description
3. Return only possible movie titles, separated by commas
4. Maximum 5 movie titles
5. Don't add explanations or other text

Examples:
Input: "superhero marvel movies"
Output: "Avengers, Iron Man, Captain America, Thor, Black Panther"

Input: "funny romantic movies"
Output: "Crazy Rich Asians, The Proposal, 50 First Dates, Notting Hill, Love Actually"

Now for query: "${query}"`
    }
  }

  private parseMovieTitles(text: string): string[] {
    // Clean the response and split by commas
    const cleaned = text.replace(/["'']/g, '').trim()
    if (!cleaned) return []
    
    return cleaned
      .split(',')
      .map(title => title.trim())
      .filter(title => title.length > 0)
      .slice(0, 5) // Limit to 5 titles
  }

  private async findMoviesInDatabase(titles: string[]): Promise<Movie[]> {
    if (titles.length === 0) return []

    try {
      // Search for each title in the database
      const searches = titles.map(async (title) => {
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .ilike('title', `%${title}%`)
          .limit(2)

        return data || []
      })

      const results = await Promise.all(searches)
      const allMovies = results.flat()
      
      // Remove duplicates and limit to 5 results
      const uniqueMovies = allMovies.filter((movie, index, self) => 
        index === self.findIndex((m) => m.id === movie.id)
      )

      return uniqueMovies.slice(0, 5)
    } catch (error) {
      console.error('Error searching database:', error)
      return []
    }
  }

  private async fallbackSearch(query: string): Promise<AISearchResult> {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', `%${query}%`)
        .limit(5)

      return {
        movies: data || [],
        query,
        originalQuery: query
      }
    } catch (error) {
      console.error('Fallback search error:', error)
      return {
        movies: [],
        query,
        originalQuery: query
      }
    }
  }
}

export const geminiSearch = new GeminiSearchService()
