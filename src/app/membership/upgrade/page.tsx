'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiX, FiCheck, FiCreditCard, FiShield, FiClock, FiArrowLeft } from 'react-icons/fi'
import { MembershipType } from '@/types'

export default function MembershipUpgradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const membershipId = searchParams.get('id')
  const [membershipType, setMembershipType] = useState<MembershipType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (membershipId) {
      fetchMembershipType()
    }
  }, [membershipId])

  const fetchMembershipType = async () => {
    try {
      // Mock data - replace with actual API call
      const mockMembershipTypes: MembershipType[] = [
        {
          id: '1',
          name: 'Gabut',
          description: 'Basic membership with 7-day movie access',
          price: 0,
          duration_days: 365,
          movie_access_days: 7,
          can_purchase_movies: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Akut',
          description: 'Premium membership with unlimited movie access for 30 days',
          price: 50000,
          duration_days: 30,
          movie_access_days: undefined,
          can_purchase_movies: false,
          created_at: new Date().toISOString()
        }
      ]

      const membership = mockMembershipTypes.find(m => m.id === membershipId)
      setMembershipType(membership || null)
    } catch (error) {
      console.error('Error fetching membership type:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPurchase = async () => {
    if (!membershipType) return

    setIsProcessing(true)
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to success page or back to dashboard
      router.push('/dashboard?upgrade=success')
    } catch (error) {
      console.error('Purchase error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!membershipType) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Membership Not Found</h1>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button 
            onClick={() => router.push('/dashboard')}
            className="mr-4 text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Upgrade Membership</h1>
            <p className="text-gray-400">Review your membership upgrade details</p>
          </div>
        </div>

        {/* Membership Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{membershipType.name} Membership</h2>
                <p className="text-purple-100">{membershipType.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  Rp {membershipType.price.toLocaleString('id-ID')}
                </div>
                <div className="text-purple-100 text-sm">
                  {membershipType.duration_days} days access
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">What you'll get:</h3>
            <div className="space-y-3">
              {membershipType.name === 'Akut' ? (
                <>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>Unlimited movie access for 30 days</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>Watch any movie without individual purchases</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>Full watch history and continue watching</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiShield className="text-purple-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>Premium member benefits and support</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>No ads and priority streaming</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>Purchase individual movies</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>7-day movie access after purchase</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span>Watch history tracking</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex items-center mb-4">
            <FiCreditCard className="mr-3 text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Payment Information</h3>
          </div>
          <p className="text-gray-300 mb-4">
            You will be redirected to our secure payment partner to complete your purchase. 
            All payment information is encrypted and secure.
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-400">
                Rp {membershipType.price.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors font-semibold"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmPurchase}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md transition-all font-semibold flex items-center justify-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing Payment...
              </>
            ) : (
              <>
                <FiCreditCard className="mr-2" />
                Confirm Purchase
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
