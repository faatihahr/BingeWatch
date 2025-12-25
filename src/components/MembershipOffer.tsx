'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MembershipType } from '@/types'

interface MembershipOfferProps {
  onUpgrade?: (membershipType: MembershipType) => void
}

export default function MembershipOffer({ onUpgrade }: MembershipOfferProps) {
  const router = useRouter()
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembershipTypes()
  }, [])

  const fetchMembershipTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .order('price', { ascending: true })

      if (error) throw error
      setMembershipTypes(data || [])
    } catch (error) {
      console.error('Error fetching membership types:', error)
      // Fallback to mock data if database fails
      const mockMembershipTypes: MembershipType[] = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Gabut',
          description: 'Basic membership with 7-day movie access',
          price: 0,
          duration_days: 365,
          movie_access_days: 7,
          can_purchase_movies: true,
          created_at: new Date().toISOString()
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Akut',
          description: 'Premium membership with unlimited movie access for 30 days',
          price: 50000,
          duration_days: 30,
          movie_access_days: undefined,
          can_purchase_movies: false,
          created_at: new Date().toISOString()
        }
      ]
      setMembershipTypes(mockMembershipTypes)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = (membershipType: MembershipType) => {
    if (membershipType.price > 0) {
      router.push(`/payment/membership/checkout?membershipId=${membershipType.id}`)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-6 border border-purple-500/30">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Upgrade Your Membership</h2>
        <p className="text-gray-300">Choose the perfect plan for your movie watching needs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {membershipTypes.map((membershipType) => (
          <div 
            key={membershipType.id}
            className={`relative bg-gray-800 rounded-lg p-6 border ${
              membershipType.name === 'Akut' 
                ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                : 'border-gray-700'
            }`}
          >
            {membershipType.name === 'Akut' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>
            )}
            
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-white mb-2">{membershipType.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{membershipType.description}</p>
              <div className="text-3xl font-bold text-blue-400 mb-1">
                Rp {membershipType.price === 0 ? 'Free' : membershipType.price.toLocaleString('id-ID')}
              </div>
              <p className="text-gray-400 text-sm">
                {membershipType.duration_days} days access
              </p>
            </div>
            
            <ul className="space-y-2 mb-6">
              {membershipType.name === 'Gabut' ? (
                <>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Purchase individual movies
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    7-day movie access after purchase
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Watch history tracking
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Unlimited movie access
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    No individual purchases needed
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    All movies available instantly
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Premium support
                  </li>
                </>
              )}
            </ul>
            
            <button
              onClick={() => handleUpgrade(membershipType)}
              className={`w-full py-3 px-4 rounded-md font-semibold transition-all ${
                membershipType.name === 'Akut'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                  : membershipType.price === 0
                  ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={membershipType.price === 0}
            >
              {membershipType.price === 0 ? 'Current Plan' : `Upgrade to ${membershipType.name}`}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          All memberships include watch history, favorites, and personal recommendations
        </p>
      </div>
    </div>
  )
}
