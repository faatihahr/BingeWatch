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
  trailer_url?: string
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
  expires_at?: string
  is_expired: boolean
  purchase_date: string
  payment_method?: string
  payment_status?: string
  movie?: Movie
}

export interface MembershipType {
  id: string
  name: string
  description: string
  price: number
  duration_days: number
  movie_access_days?: number
  can_purchase_movies: boolean
  created_at: string
}

export interface Membership {
  id: string
  user_id: string
  membership_type_id: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  membership_type?: MembershipType
}
