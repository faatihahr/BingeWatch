'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FiXCircle, FiRefreshCw } from 'react-icons/fi'

export default function PaymentFailedPage() {
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const error = searchParams.get('error')
    const invoiceId = searchParams.get('invoice_id')

    if (error || invoiceId) {
      setErrorDetails({
        error: error || 'Payment verification failed',
        invoiceId,
      })
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
        <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
        <p className="text-gray-300 mb-6">
          We were unable to process your payment. Please try again or contact support if the problem persists.
        </p>

        {errorDetails && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-white font-semibold mb-2">Error Details:</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p><span className="font-medium">Error:</span> {errorDetails.error}</p>
              {errorDetails.invoiceId && (
                <p><span className="font-medium">Invoice ID:</span> {errorDetails.invoiceId}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center justify-center"
          >
            <FiRefreshCw className="mr-2" />
            Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-400">
          <p>If you continue to experience issues, please contact our support team:</p>
          <p>Email: support@binge.com</p>
          <p>Phone: +62 21 1234 5678</p>
        </div>
      </div>
    </div>
  )
}
