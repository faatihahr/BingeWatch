'use client'

import { useState } from 'react'
import { FiX, FiCheck, FiCreditCard, FiShield, FiClock } from 'react-icons/fi'
import { MembershipType } from '@/types'

interface MembershipPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  membershipType: MembershipType
  onConfirmPurchase: () => void
}

export default function MembershipPurchaseModal({ 
  isOpen, 
  onClose, 
  membershipType, 
  onConfirmPurchase 
}: MembershipPurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleConfirmPurchase = async () => {
    setIsProcessing(true)
    try {
      await onConfirmPurchase()
      onClose()
    } catch (error) {
      console.error('Purchase error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800">
          <h2 className="text-xl font-semibold text-white">Upgrade to {membershipType.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Membership Info */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">{membershipType.name} Membership</h3>
              <span className="text-2xl font-bold text-blue-400">
                Rp {membershipType.price.toLocaleString('id-ID')}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-3">{membershipType.description}</p>
            <div className="flex items-center text-gray-400 text-sm">
              <FiClock className="mr-2" />
              {membershipType.duration_days} days access
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h4 className="text-white font-semibold mb-3">What you'll get:</h4>
            <div className="space-y-2">
              {membershipType.name === 'Akut' ? (
                <>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Unlimited movie access for 30 days</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Watch any movie without individual purchases</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Full watch history tracking</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Continue watching feature</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiShield className="text-purple-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Premium member benefits</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Purchase individual movies</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">7-day movie access after purchase</span>
                  </div>
                  <div className="flex items-start text-gray-300">
                    <FiCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-sm">Watch history tracking</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex items-center text-gray-400 text-sm mb-2">
              <FiCreditCard className="mr-2" />
              Payment Information
            </div>
            <p className="text-gray-300 text-sm">
              You will be redirected to secure payment page to complete your purchase.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPurchase}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center justify-center"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
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
    </div>
  )
}
