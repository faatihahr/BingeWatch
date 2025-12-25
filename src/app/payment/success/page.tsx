'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FiCheckCircle, FiLoader } from 'react-icons/fi'

export default function PaymentSuccessPage() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const verifyPayment = async () => {
      const invoiceId = searchParams.get('invoice_id')
      const externalId = searchParams.get('external_id')

      if (invoiceId && externalId) {
        try {
          // Call API to verify payment status
          const response = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoiceId,
              externalId,
            }),
          })

          const data = await response.json()
          
          if (data.success) {
            setPaymentDetails(data.payment)
          } else {
            // Redirect to failed page if verification fails
            router.push('/payment/failed')
          }
        } catch (error) {
          console.error('Payment verification error:', error)
          router.push('/payment/failed')
        }
      } else {
        router.push('/payment/failed')
      }

      setIsVerifying(false)
    }

    verifyPayment()
  }, [searchParams, router])

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Verifying Payment...</h2>
          <p className="text-gray-400">Please wait while we confirm your payment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
        <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-gray-300 mb-6">
          Thank you for your purchase. Your membership has been activated.
        </p>

        {paymentDetails && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-white font-semibold mb-2">Payment Details:</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p><span className="font-medium">Transaction ID:</span> {paymentDetails.id}</p>
              <p><span className="font-medium">Amount:</span> Rp {paymentDetails.amount?.toLocaleString('id-ID')}</p>
              <p><span className="font-medium">Status:</span> <span className="text-green-400">PAID</span></p>
              <p><span className="font-medium">Date:</span> {new Date(paymentDetails.paid_at).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
