'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { formatIDR } from '@/lib/currency'
import { Purchase } from '@/types'

interface PurchaseWithDetails extends Purchase {
  payment_method?: string
  payment_status?: string
  purchase_date: string
}

export default function PurchaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const purchaseId = params.id as string

  const [purchase, setPurchase] = useState<PurchaseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Service role client to bypass RLS for purchase lookup
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

  useEffect(() => {
    if (!purchaseId) {
      setError('Purchase ID is required')
      setLoading(false)
      return
    }

    const fetchPurchaseDetails = async () => {
      try {
        const { data: purchaseData, error: purchaseError } = await supabaseAdmin
          .from('purchases')
          .select(`
            *,
            movie: movies (*)
          `)
          .eq('id', purchaseId)
          .maybeSingle()

        if (purchaseError) throw purchaseError
        if (!purchaseData) {
          setError('Purchase not found')
          setLoading(false)
          return
        }

        // Transform the data to match our interface
        const purchaseWithDetails: PurchaseWithDetails = {
          ...purchaseData,
          purchase_date: purchaseData.purchase_date || purchaseData.created_at,
          payment_method: purchaseData.payment_method || 'Credit Card',
          payment_status: purchaseData.payment_status || 'Completed'
        }

        setPurchase(purchaseWithDetails)
      } catch (err) {
        console.error('Error fetching purchase details:', err)
        setError('Failed to load purchase details')
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseDetails()
  }, [purchaseId])

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading purchase details...</div>
      </div>
    )
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Purchase not found'}</div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Purchase Details</h1>
          <p className="text-gray-400 mt-2">View your purchase information and payment details</p>
        </div>

        <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Purchase Information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-bold mb-6">Purchase Information</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Purchase ID:</span>
                  <span className="font-medium text-sm">{purchase.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Purchase Date:</span>
                  <span className="font-medium">{new Date(purchase.purchase_date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="font-medium">{purchase.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Status:</span>
                  <span className={`font-medium ${purchase.payment_status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {purchase.payment_status}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-400">{formatIDR(purchase.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Access Status */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="font-semibold mb-2">Access Status</h4>
                <p className="text-sm text-gray-300">
                  {purchase.is_expired ? (
                    <span className="text-red-400">Expired</span>
                  ) : (
                    <span className="text-green-400">Active</span>
                  )}
                </p>
                {purchase.expires_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    Expires: {new Date(purchase.expires_at).toLocaleDateString('id-ID')}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {purchase.movie && (
                  <button
                    onClick={() => router.push(`/movies/${purchase.movie?.id}`)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors cursor-pointer"
                  >
                    Watch Movie
                  </button>
                )}
                <button
                  onClick={handleBack}
                  className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-md font-medium transition-colors cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Movie Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Movie Details</h2>
              
              {purchase.movie ? (
                <div>
                  <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    <img
                      src={purchase.movie.thumbnail}
                      alt={purchase.movie.title}
                      className="w-full sm:w-32 h-48 sm:h-48 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold mb-2">{purchase.movie.title}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Rating:</span>
                          <span className="ml-2 font-semibold">{purchase.movie.rating}/10</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Duration:</span>
                          <span className="ml-2">{purchase.movie.duration} min</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Release:</span>
                          <span className="ml-2">{new Date(purchase.movie.release_date).getFullYear()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Price:</span>
                          <span className="ml-2 font-semibold">{formatIDR(purchase.movie.price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Synopsis</h4>
                    <p className="text-gray-300 leading-relaxed">{purchase.movie.description}</p>
                  </div>

                  {/* Genres */}
                  <div>
                    <h4 className="font-semibold mb-2">Genres</h4>
                    <div className="flex flex-wrap gap-2">
                      {purchase.movie.genre.map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Movie details not available</p>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="bg-gray-800 rounded-lg p-6 mt-6">
              <h2 className="text-xl font-bold mb-6">Payment Details</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="font-mono text-sm">{purchase.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="font-medium">{purchase.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Status:</span>
                  <span className={`font-medium ${purchase.payment_status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {purchase.payment_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Purchase Date:</span>
                  <span className="font-medium">{new Date(purchase.purchase_date).toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Paid:</span>
                    <span className="text-green-400">{formatIDR(purchase.amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
