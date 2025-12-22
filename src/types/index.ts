export interface User {
  id: string
  name: string
  email: string
  image?: string
  role: 'admin' | 'user'
}

export interface Movie {
  id: string
  title: string
  description: string
  thumbnail: string
  video_url: string
  duration: number
  price: number
  genre: string[]
  release_date: string
  rating: number
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  movie_id: string
  amount: number
  created_at: string
  movie?: Movie
}
