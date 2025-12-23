import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { Movie } from '@/types'
import { supabase } from '@/lib/supabase'

// Check if API key exists and is valid
const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in environment variables')
}

const genAI = new GoogleGenAI({ apiKey: apiKey || '' })

interface AISearchResult {
  movies: Movie[]
  query: string
  originalQuery: string
}

function detectIndonesian(query: string): boolean {
  const indonesianWords = ['film', 'movie', 'cari', 'tentang', 'yang', 'dan', 'atau', 'seperti', 'adalah', 'ini', 'itu']
  const words = query.toLowerCase().split(' ')
  return words.some(word => indonesianWords.includes(word)) || /[āēīōūāēīōū]/.test(query)
}

function createSearchPrompt(query: string, isIndonesian: boolean): string {
  if (isIndonesian) {
    return `Kamu adalah asisten pencarian film dengan akses internet. Pengguna mencari: "${query}"

Tugas kamu:
1. Gunakan kemampuan web search kamu untuk mencari film-film yang relevan dengan query tersebut
2. Cari informasi dari berbagai sumber tentang film yang cocok dengan deskripsi ini
3. Kembalikan hanya judul-judul film yang benar-benar ada dan relevan, dipisahkan dengan koma
4. Maksimal 10 judul film
5. Jangan tambahkan penjelasan atau teks lain

Contoh:
Input: "penyihir yang warna kulit hijau"
Output: "Wicked, The Wizard of Oz, Maleficent, Harry Potter, The Craft"

Input: "film tentang superhero marvel"
Output: "Avengers, Iron Man, Captain America, Thor, Black Panther"

Sekarang cari untuk query: "${query}" dan gunakan web search untuk menemukan film yang sesuai.`
  } else {
    return `You are a movie search assistant with internet access. User is searching for: "${query}"

Your task:
1. Use your web search capabilities to find relevant movies for this query
2. Search for information from various sources about movies that match this description
3. Return only real, relevant movie titles, separated by commas
4. Maximum 10 movie titles
5. Don't add explanations or other text

Examples:
Input: "green witch movie"
Output: "Wicked, The Wizard of Oz, Maleficent, Harry Potter, The Craft"

Input: "superhero marvel movies"
Output: "Avengers, Iron Man, Captain America, Thor, Black Panther"

Now search for: "${query}" and use web search to find matching movies.`
  }
}


function parseMovieTitles(text: string): string[] {
  const cleaned = text.replace(/["'']/g, '').trim()
  if (!cleaned) return []
  
  return cleaned
    .split(',')
    .map(title => title.trim())
    .filter(title => title.length > 0)
    .slice(0, 5)
}

async function findMoviesInDatabase(titles: string[]): Promise<Movie[]> {
  if (titles.length === 0) return []

  try {
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
    
    const uniqueMovies = allMovies.filter((movie, index, self) => 
      index === self.findIndex((m) => m.id === movie.id)
    )

    return uniqueMovies.slice(0, 5)
  } catch (error) {
    console.error('Error searching database:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  let query = ''
  
  try {
    const body = await request.json()
    query = body.query

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check if API key is available and debug
    console.log('API Key status:', {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      startsWithAIza: apiKey?.startsWith('AIza') || false,
      firstChar: apiKey?.charAt(0) || 'none'
    })

    if (!apiKey || !apiKey.startsWith('AIza')) {
      console.error('Invalid or missing Gemini API key, falling back to regular search')
      return await fallbackSearch(query)
    }

    // Use Gemini with web search capabilities
    const isIndonesian = detectIndonesian(query)
    const prompt = createSearchPrompt(query, isIndonesian)

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    })
    const text = response.text || ''
    const movieTitles = parseMovieTitles(text)
    console.log('Found movies via Gemini web search:', movieTitles)

    // Search for movies in database
    const movies = await findMoviesInDatabase(movieTitles)

    const result: AISearchResult = {
      movies,
      query,
      originalQuery: query
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI search error:', error)
    
    // Use the already extracted query for fallback
    if (query) {
      return await fallbackSearch(query)
    } else {
      console.error('No query available for fallback')
      return NextResponse.json(
        { error: 'Search failed - no query provided' },
        { status: 500 }
      )
    }
  }
}

async function fallbackSearch(query: string) {
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .ilike('title', `%${query}%`)
      .limit(5)

    return NextResponse.json({
      movies: data || [],
      query,
      originalQuery: query
    })
  } catch (error) {
    console.error('Fallback search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
