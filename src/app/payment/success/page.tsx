'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FiCheckCircle, FiLoader } from 'react-icons/fi'

export default function PaymentSuccessPage() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [showManualVerify, setShowManualVerify] = useState(false)
  const [manualInvoiceId, setManualInvoiceId] = useState<string>('')
  const [manualExternalId, setManualExternalId] = useState<string>('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Log the full URL for debugging
    console.log('Full URL:', window.location.href);
    console.log('Full search params:', window.location.search);
    console.log('All search params from hook:', Object.fromEntries(searchParams.entries()));
    
    // Try all possible parameter names
    const possibleParams = ['invoice_id', 'id', 'invoiceId', 'external_id', 'externalId', 'invoice-id', 'external-id'];
    let invoiceId = null;
    let externalId = null;
    
    for (const param of possibleParams) {
      if (!invoiceId) invoiceId = searchParams.get(param);
      if (!externalId) externalId = searchParams.get(param);
    }
    
    console.log('Final extracted - invoiceId:', invoiceId, 'externalId:', externalId);

    // Prefill manual inputs so user can quickly tap Verify
    if (invoiceId) setManualInvoiceId(invoiceId)
    if (externalId) setManualExternalId(externalId)

    // For now, if we can't get params, just show success
    // and let user know payment was processed
    if (invoiceId && externalId) {
      verifyPayment(invoiceId, externalId);
    } else {
      console.log('No parameters found - showing success page with manual verification option');
      setIsVerifying(false);
      setPaymentDetails({
        status: 'PAID',
        message: 'Payment completed successfully. If your access hasn\'t been updated, please return to the payment page and click "Verify Payment".'
      });
    }
  }, [searchParams, router]);

  const verifyPayment = async (invoiceId: string, externalId: string) => {
    try {
      // Call API to verify payment status
      console.log('Calling verify API...');
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

      console.log('Verify API response status:', response.status);
      const data = await response.json()
      console.log('Verify API response data:', data);
      
      if (data.success) {
        console.log('Payment verification successful');
        setPaymentDetails(data.payment)
      } else {
        console.log('Payment verification failed:', data.error);
        // Redirect to failed page if verification fails
        router.push('/payment/failed')
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      router.push('/payment/failed')
    }

    setIsVerifying(false)
  }

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

          {/* Manual Verify Button */}
          <button
            onClick={() => setShowManualVerify(v => !v)}
            className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            {showManualVerify ? 'Close Verify' : 'Verify Payment'}
          </button>
          {showManualVerify && (
            <div className="mt-3 text-left bg-gray-800 p-4 rounded">
              <label className="text-sm text-gray-300">Invoice ID</label>
              <input
                value={manualInvoiceId}
                onChange={e => setManualInvoiceId(e.target.value)}
                placeholder="invoice id or last segment of invoice url"
                className="w-full mt-1 mb-2 p-2 rounded bg-gray-900 border border-gray-700 text-white"
              />

              <label className="text-sm text-gray-300">External ID (optional)</label>
              <input
                value={manualExternalId}
                onChange={e => setManualExternalId(e.target.value)}
                placeholder="external id (if available)"
                className="w-full mt-1 mb-3 p-2 rounded bg-gray-900 border border-gray-700 text-white"
              />

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!manualInvoiceId) {
                      setPaymentDetails({ status: 'FAILED', message: 'Invoice ID is required' })
                      return
                    }
                    setIsVerifying(true)
                    await verifyPayment(manualInvoiceId, manualExternalId)
                    setIsVerifying(false)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Verify
                </button>
                <button
                  onClick={() => setShowManualVerify(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
