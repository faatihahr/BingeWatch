'use client'

import { useState } from 'react'
import { FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiLoader } from 'react-icons/fi'

type PaymentStatusState = 'pending' | 'verifying' | 'success' | 'failed'

interface PaymentStatusProps {
  status: PaymentStatusState
  onPaid: () => void
  onCancel: () => void
}

export default function PaymentStatus({ status, onPaid, onCancel }: PaymentStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<PaymentStatusState>(status)

  const handlePaidClick = async () => {
    setCurrentStatus('verifying')
    
    // Simulate verification process
    setTimeout(() => {
      // Randomly determine success or failure for demo
      // In real app, this would check actual payment status
      const isSuccess = Math.random() > 0.3 // 70% success rate for demo
      setCurrentStatus(isSuccess ? 'success' : 'failed')
    }, 2000)
  }

  const handleCancelClick = () => {
    setCurrentStatus('failed')
    onCancel()
  }

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'pending':
        return <FiClock className="w-5 h-5 text-yellow-500" />
      case 'verifying':
        return <FiLoader className="w-5 h-5 text-blue-500 animate-spin" />
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <FiXCircle className="w-5 h-5 text-red-500" />
      default:
        return <FiAlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (currentStatus) {
      case 'pending':
        return 'Waiting for Payment'
      case 'verifying':
        return 'Verifying Payment'
      case 'success':
        return 'Payment Successful'
      case 'failed':
        return 'Payment Failed'
      default:
        return 'Unknown Status'
    }
  }

  const getStatusColor = () => {
    switch (currentStatus) {
      case 'pending':
        return 'border-yellow-500 bg-yellow-50'
      case 'verifying':
        return 'border-blue-500 bg-blue-50'
      case 'success':
        return 'border-green-500 bg-green-50'
      case 'failed':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const getActionButtonColor = () => {
    switch (currentStatus) {
      case 'pending':
        return 'bg-blue-600 hover:bg-blue-700 text-white'
      case 'verifying':
        return 'bg-gray-400 text-gray-200 cursor-not-allowed'
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white'
      case 'failed':
        return 'bg-red-600 hover:bg-red-700 text-white'
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className={`font-medium ${
            currentStatus === 'pending' ? 'text-yellow-800' :
            currentStatus === 'verifying' ? 'text-blue-800' :
            currentStatus === 'success' ? 'text-green-800' :
            currentStatus === 'failed' ? 'text-red-800' :
            'text-gray-800'
          }`}>
            {getStatusText()}
          </span>
        </div>
        
        {currentStatus === 'verifying' && (
          <div className="text-sm text-blue-700">
            Verifying payment...
          </div>
        )}
        
        {currentStatus === 'success' && (
          <div className="text-sm text-green-700">
            Payment successfully verified
          </div>
        )}
        
        {currentStatus === 'failed' && (
          <div className="text-sm text-red-700">
            Payment failed or cancelled
          </div>
        )}
      </div>
    </div>
  )
}
