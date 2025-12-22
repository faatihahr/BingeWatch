# Supabase Database Setup

## Instructions

### 1. Go to Supabase Dashboard
- Visit https://supabase.com/dashboard
- Select your project: `nrsklnfxhvfuqixfvzol`

### 2. Run SQL Migrations

#### Migration 1: Initial Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Copy and paste the content of `supabase/migrations/001_initial_schema.sql`
3. Click **Run** to execute

#### Migration 2: Seed Data
1. In the same SQL Editor, copy and paste the content of `supabase/migrations/002_seed_data.sql`
2. Click **Run** to execute

### 3. Create Admin User
After setting up authentication, you'll need to create an admin user:

1. Sign up/login through the app first (this creates a user with 'user' role)
2. In Supabase Dashboard → **Table Editor** → **users** table
3. Find your user and change the `role` field from 'user' to 'admin'

### 4. Verify Setup
The database should have:
- `users` table with role-based access
- `movies` table with sample data
- `purchases`, `watch_history`, `favorites` tables
- Row Level Security (RLS) policies
- Triggers for automatic timestamps

### 5. Test the Application
- Admin users can access `/admin` to upload movies
- Regular users can browse `/movies` and purchase/watch films
- All user data is properly secured with RLS

## Database Schema

### Tables
- **users**: User profiles with roles (admin/user)
- **movies**: Movie catalog with metadata
- **purchases**: User purchase records
- **watch_history**: Viewing progress tracking
- **favorites**: User favorite movies

### Security Features
- Row Level Security (RLS) on all tables
- Users can only access their own data
- Admin-only access for movie management
- Automatic user creation on first login

### Functions
- `handle_new_user()`: Auto-create user profile on signup
- `get_user_stats()`: Get user statistics
- `get_movie_stats()`: Get platform statistics
