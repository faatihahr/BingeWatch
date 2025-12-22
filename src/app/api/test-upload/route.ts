import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Test data untuk verify upload
    const testData = {
      title: 'Test Movie ' + Date.now(),
      description: 'Test movie description',
      duration: 120,
      price: 15000,
      genre: ['Action', 'Drama'],
      release_date: '2024-01-01',
      rating: 8.5,
      thumbnail: 'https://example.com/poster.jpg',
      video_url: 'https://example.com/video.mp4'
    }

    console.log('Testing upload to Supabase...')
    console.log('Test data:', testData)

    // Insert test data
    const { data, error } = await supabase
      .from('movies')
      .insert([testData])
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 })
    }

    console.log('Upload successful:', data)

    // Verify data was inserted by fetching it
    if (data && data[0]) {
      const { data: verifyData, error: verifyError } = await supabase
        .from('movies')
        .select('*')
        .eq('id', data[0].id)
        .single()

      if (verifyError) {
        console.error('Verification error:', verifyError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to verify inserted data',
          details: verifyError
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Test upload successful',
        insertedData: data[0],
        verifiedData: verifyData
      })
    }

    return NextResponse.json({ 
        success: false, 
        error: 'No data returned from insert'
      }, { status: 500 })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Test fetch all movies
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Movies fetched successfully',
      count: data?.length || 0,
      movies: data
    })

  } catch (error) {
    console.error('Fetch movies error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
