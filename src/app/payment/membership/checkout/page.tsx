'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { formatIDR } from '@/lib/currency'
import { xendit } from '@/lib/xendit'
import { FiCreditCard, FiSmartphone, FiClock, FiCheckCircle, FiAlertCircle, FiX, FiAward, FiStar } from 'react-icons/fi'
import PaymentStatus from '@/components/PaymentStatus'

// Service role client - outside component to prevent multiple instances
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

interface MembershipType {
  id: string
  name: string
  description: string
  price: number
  duration_days: number
  movie_access_days?: number
  can_purchase_movies: boolean
}

interface PaymentStatus {
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'expired'
  invoiceUrl?: string
  vaNumber?: string
  paymentMethod?: string
  expiresAt?: Date
}

export default function MembershipCheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const membershipId = searchParams.get('membershipId')

  const [membershipType, setMembershipType] = useState<MembershipType | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'pending' })
  const [uiPaymentStatus, setUiPaymentStatus] = useState<'pending' | 'verifying' | 'success' | 'failed'>('pending')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [selectedEwallet, setSelectedEwallet] = useState<string>('')
  const [showCardForm, setShowCardForm] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(7200) // 2 hours in seconds
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  
  // Separate state for accordion expansion
  const [expandedAccordion, setExpandedAccordion] = useState<string>('')

  useEffect(() => {
    if (!membershipId) {
      setError('Membership ID is required')
      setLoading(false)
      return
    }

    const fetchMembershipAndPaymentStatus = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        // Fetch membership details
        const { data: membershipData, error: membershipError } = await supabase
          .from('membership_types')
          .select('*')
          .eq('id', membershipId)
          .single()

        if (membershipError) {
          console.error('Membership fetch error:', membershipError)
          throw membershipError
        }
        if (!membershipData) throw new Error('Membership type not found')

        setMembershipType(membershipData)

        // Check existing purchase status
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('email', session.user.email)
          .single()

        if (!userError && existingUser) {
          try {
            const { data: purchaseData } = await supabaseAdmin
              .from('membership_purchases')
              .select('*')
              .eq('user_id', existingUser.id)
              .eq('membership_type_id', membershipData.id)
              .eq('payment_status', 'pending')
              .single()

            if (purchaseData) {
              setPaymentStatus({ 
                status: 'pending',
                paymentMethod: purchaseData.payment_method,
                vaNumber: purchaseData.va_number,
                invoiceUrl: purchaseData.invoice_url
              })
            }
          } catch (purchaseError) {
            // Table might not exist yet, ignore this error for now
            console.log('Membership purchases table not available yet')
          }
        } else {
          // User not found in database (likely Google auth), create user record
          console.log('User not found in database, creating record for:', session.user.email)
          try {
            const { data: newUser, error: createError } = await supabaseAdmin
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || 'User',
                role: 'user'
              })
              .select('id, name, email')
              .single()

            if (createError) {
              console.error('Error creating user record:', createError)
            } else {
              console.log('Created user record:', newUser)
            }
          } catch (error) {
            console.error('Failed to create user record:', error)
          }
        }

      } catch (err) {
        console.error('Error in fetchMembershipAndPaymentStatus:', err)
        if (err && typeof err === 'object' && 'message' in err) {
          console.error('Error message:', err.message)
        }
        if (err && typeof err === 'object' && 'code' in err) {
          console.error('Error code:', err.code)
        }
        setError('Failed to load membership details')
      } finally {
        setLoading(false)
      }
    }

    fetchMembershipAndPaymentStatus()
  }, [membershipId, session?.user?.id])

  // Countdown timer
  useEffect(() => {
    if (paymentStatus.status !== 'pending' && paymentStatus.status !== 'processing') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus(prev => ({ ...prev, status: 'expired' }))
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentStatus.status])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handlePaymentMethod = async (method: string, subMethod?: string) => {
    console.log('handlePaymentMethod called:', method, subMethod)
    
    if (!session) {
      setError('Please login to make a purchase')
      return
    }

    if (!membershipType) {
      setError('Membership data not loaded')
      return
    }

    // For credit card, just show the form, don't process payment yet
    if (method === 'credit_card') {
      console.log('Credit card selected, showing form')
      setShowCardForm(true)
      setExpandedAccordion('')
      return
    }

    // For categories with sub-options, require subMethod
    if (method === 'virtual_account' && !subMethod) {
      console.log('Virtual Account requires bank selection')
      return
    }

    if (method === 'ewallet' && !subMethod) {
      console.log('E-Wallet requires wallet selection')
      return
    }

    // Now process payment - we have all required info
    console.log('Processing payment with method:', method, 'subMethod:', subMethod)
    console.log('About to create payment and redirect...')
    setSelectedMethod(method)
    setProcessingPayment(true)
    setError(null)

    try {
      // Find existing user by email using service client
      let { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single()

      // If user doesn't exist, create user record
      if (userError || !existingUser) {
        console.log('User not found in database during payment, creating record for:', session.user.email)
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || 'User',
            role: 'user'
          })
          .select('id, name, email')
          .single()

        if (createError) {
          throw new Error('Failed to create user record. Please try again.')
        }
        
        existingUser = newUser
        console.log('Created user record during payment:', newUser)
      }

      setPaymentStatus({ status: 'processing' })

      let paymentResponse

      if (method === 'credit_card') {
        // Create Xendit invoice for credit card
        console.log('Creating invoice for credit card payment...')
        paymentResponse = await xendit.createInvoice({
          externalId: `membership-${membershipType.id}-${existingUser.id}-${Date.now()}`,
          amount: membershipType.price,
          description: `Upgrade to ${membershipType.name} membership`,
          payerEmail: session.user.email || '',
          customer: {
            givenNames: existingUser.name || '',
            email: session.user.email || '',
          }
        })

        console.log('Invoice response:', paymentResponse)

        // Open payment URL immediately - redirect before setting state
        const invoiceUrl = (paymentResponse as any)?.invoice_url || (paymentResponse as any)?.invoiceUrl
        if (invoiceUrl) {
          console.log('Opening invoice URL:', invoiceUrl)
          console.log('About to redirect to:', invoiceUrl)
          
          // Try multiple redirect methods
          try {
            // Method 1: Direct redirect
            window.location.href = invoiceUrl
          } catch (e) {
            console.log('Direct redirect failed, trying window.open')
            try {
              // Method 2: Window open with same window
              window.open(invoiceUrl, '_self')
            } catch (e2) {
              console.log('Window open failed, trying assign')
              // Method 3: Location assign
              window.location.assign(invoiceUrl)
            }
          }
          
          // Fallback - force redirect after delay
          setTimeout(() => {
            window.location.href = invoiceUrl
          }, 500)
          
          return // Stop execution here
        } else {
          console.error('No invoice URL found in response:', paymentResponse)
        }

        setPaymentStatus({
          status: 'pending',
          invoiceUrl: (paymentResponse as any)?.invoice_url || (paymentResponse as any)?.invoiceUrl,
          paymentMethod: 'Credit Card',
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
        })

      } else if (method === 'virtual_account') {
        // Create Virtual Account with selected bank
        paymentResponse = await xendit.createVirtualAccount({
          externalId: `membership-${membershipType.id}-${existingUser.id}-${Date.now()}`,
          bankCode: subMethod as any,
          name: existingUser.name,
          description: `Upgrade to ${membershipType.name} membership`
        })

        setPaymentStatus({
          status: 'pending',
          vaNumber: (paymentResponse as any)?.virtualAccount?.accountNumber || '1234567890',
          paymentMethod: `${subMethod} Virtual Account`,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })

        // For Virtual Account, we don't redirect to external URL
        // User needs to see the VA number and make manual transfer

      } else if (method === 'ewallet') {
        // Create E-Wallet invoice using dedicated API
        const response = await fetch('/api/payment/create-ewallet-charge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            membershipType,
            userEmail: session.user.email,
            userName: existingUser.name,
            ewalletType: subMethod,
            phone: ''
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create e-wallet invoice');
        }

        console.log('E-wallet invoice response:', data);

        // Redirect immediately to Xendit
        if (data.invoiceUrl) {
          console.log('Opening e-wallet invoice URL:', data.invoiceUrl);
          console.log('About to redirect to:', data.invoiceUrl);
          
          // Try multiple redirect methods
          try {
            window.location.href = data.invoiceUrl
          } catch (e) {
            console.log('Direct redirect failed, trying window.open')
            try {
              window.open(data.invoiceUrl, '_self')
            } catch (e2) {
              console.log('Window open failed, trying assign')
              window.location.assign(data.invoiceUrl)
            }
          }
          
          setTimeout(() => {
            window.location.href = data.invoiceUrl
          }, 500)
          
          return // Stop execution here
        }

        setPaymentStatus({
          status: 'pending',
          invoiceUrl: data.invoiceUrl,
          paymentMethod: subMethod,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })
      } else if (method === 'qris') {
        // Create QRIS payment
        paymentResponse = await xendit.createQRISCharge({
          externalId: `membership-${membershipType.id}-${existingUser.id}-${Date.now()}`,
          amount: membershipType.price
        })

        // Redirect to QRIS payment page immediately
        const qrCodeUrl = (paymentResponse as any)?.qrCodeUrl || (paymentResponse as any)?.qr_code_url
        if (qrCodeUrl) {
          console.log('Opening QRIS URL:', qrCodeUrl)
          console.log('About to redirect to:', qrCodeUrl)
          
          // Try multiple redirect methods
          try {
            window.location.href = qrCodeUrl
          } catch (e) {
            console.log('Direct redirect failed, trying window.open')
            try {
              window.open(qrCodeUrl, '_self')
            } catch (e2) {
              console.log('Window open failed, trying assign')
              window.location.assign(qrCodeUrl)
            }
          }
          
          setTimeout(() => {
            window.location.href = qrCodeUrl
          }, 500)
          
          return // Stop execution here
        }

        setPaymentStatus({
          status: 'pending',
          invoiceUrl: (paymentResponse as any)?.qrCodeUrl || (paymentResponse as any)?.qr_code_url,
          paymentMethod: 'QRIS',
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })
      }

      // Create pending membership purchase record
      try {
        await supabaseAdmin
          .from('membership_purchases')
          .insert([{
            user_id: existingUser.id,
            membership_type_id: membershipType.id,
            amount: membershipType.price,
            payment_status: 'pending',
            payment_method: method === 'virtual_account' ? `${selectedBank} VA` : method === 'ewallet' ? selectedEwallet : method,
            external_id: (paymentResponse as any)?.id || `membership-${membershipType.id}-${existingUser.id}-${Date.now()}`,
            invoice_url: (paymentResponse as any)?.invoice_url || (paymentResponse as any)?.invoiceUrl || (paymentResponse as any)?.qrCodeUrl,
            va_number: (paymentResponse as any)?.virtualAccount?.accountNumber
          }])
      } catch (dbError) {
        console.error('Failed to create membership purchase record:', dbError)
        // Continue anyway - the payment was created, just the tracking failed
      }

    } catch (err) {
      console.error('Payment error:', err)
      setError(`Failed to process payment: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setPaymentStatus({ status: 'failed' })
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleCancelPayment = async () => {
    if (!session?.user || !membershipType) return

    try {
      // Find existing user by email using service client
      let { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single()

      if (userError || !existingUser) {
        console.log('User not found, but proceeding with cancellation')
      }

      // Update any pending membership purchase to failed
      if (existingUser) {
        try {
          await supabaseAdmin
            .from('membership_purchases')
            .update({ 
              payment_status: 'failed'
            })
            .eq('user_id', existingUser.id)
            .eq('membership_type_id', membershipType.id)
            .eq('payment_status', 'pending')
        } catch (dbError) {
          console.log('No pending purchase found or table not available')
        }
      }

      setPaymentStatus({ status: 'failed' })
      setShowCancelConfirm(false)
      
    } catch (err) {
      console.error('Error cancelling payment:', err)
      setError('Failed to cancel payment')
    }
  }

  const simulatePayment = async () => {
    if (!session?.user || !membershipType || paymentStatus.status !== 'pending') return

    try {
      // Find existing user by email using service client
      let { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single()

      // If user doesn't exist, create user record
      if (userError || !existingUser) {
        console.log('User not found in database during simulate payment, creating record for:', session.user.email)
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || 'User',
            role: 'user'
          })
          .select('id, name, email')
          .single()

        if (createError) {
          throw new Error('Failed to create user record. Please try again.')
        }
        
        existingUser = newUser
        console.log('Created user record during simulate payment:', newUser)
      }

      // Update membership purchase status to paid
      try {
        const { error: purchaseError } = await supabaseAdmin
          .from('membership_purchases')
          .update({ 
            payment_status: 'paid'
          })
          .eq('user_id', existingUser.id)
          .eq('membership_type_id', membershipType.id)
          .eq('payment_status', 'pending')

        if (purchaseError) throw purchaseError
      } catch (purchaseError) {
        console.log('Membership purchases table not available, skipping update')
      }

      // Deactivate old membership
      await supabaseAdmin
        .from('memberships')
        .update({ is_active: false })
        .eq('user_id', existingUser.id)
        .eq('is_active', true)

      // Create new membership record
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .insert({
          user_id: existingUser.id,
          membership_type_id: membershipType.id,
          end_date: new Date(Date.now() + membershipType.duration_days * 24 * 60 * 60 * 1000),
          is_active: true
        })

      if (membershipError) throw membershipError

      setPaymentStatus({ status: 'paid' })
      
      // Redirect to success page after successful payment
      setTimeout(() => {
        router.push('/payment/success?type=membership')
      }, 2000)

    } catch (err) {
      console.error('Error simulating payment:', err)
      setError('Failed to simulate payment')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading membership details...</div>
      </div>
    )
  }

  if (error || !membershipType) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Membership not found'}</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors"
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
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Membership Checkout</h1>
          <p className="text-gray-400 mt-2">Complete your upgrade to {membershipType.name}</p>
        </div>

        {/* Loading State */}
        {processingPayment && (
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-600">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <div>
                <p className="text-blue-300 font-semibold">Processing payment method...</p>
                <p className="text-blue-400 text-sm">Setting up your payment details</p>
              </div>
            </div>
          </div>
        )}

        {/* Timer */}
        {(paymentStatus.status === 'pending' && selectedMethod && !processingPayment) && (
          <div className="mb-6 p-4 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-600">
            <div className="flex items-center gap-3">
              <FiClock className="text-yellow-400 text-xl" />
              <div>
                <p className="text-yellow-300 font-semibold">Payment expires in:</p>
                <p className="text-yellow-400 text-2xl font-bold">{formatTime(timeLeft)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status UI */}
        {(paymentStatus.status === 'pending' && selectedMethod && !processingPayment) && (
          <div className="mb-6">
            <PaymentStatus
              status={uiPaymentStatus}
              onPaid={() => {}}
              onCancel={() => {}}
            />
          </div>
        )}

        {/* Payment Status */}
        {paymentStatus.status !== 'pending' && (
          <div className={`mb-6 p-4 rounded-lg border ${
            paymentStatus.status === 'paid' ? 'bg-green-900 bg-opacity-50 border-green-600' :
            paymentStatus.status === 'processing' ? 'bg-blue-900 bg-opacity-50 border-blue-600' :
            paymentStatus.status === 'failed' ? 'bg-red-900 bg-opacity-50 border-red-600' :
            'bg-gray-800 border-gray-600'
          }`}>
            <div className="flex items-center gap-3">
              {paymentStatus.status === 'paid' && <FiCheckCircle className="text-green-400 text-xl" />}
              {paymentStatus.status === 'processing' && <FiAlertCircle className="text-blue-400 text-xl animate-pulse" />}
              {paymentStatus.status === 'failed' && <FiX className="text-red-400 text-xl" />}
              {paymentStatus.status === 'expired' && <FiClock className="text-gray-400 text-xl" />}
              
              <div>
                <p className={`font-semibold ${
                  paymentStatus.status === 'paid' ? 'text-green-300' :
                  paymentStatus.status === 'processing' ? 'text-blue-300' :
                  paymentStatus.status === 'failed' ? 'text-red-300' :
                  'text-gray-300'
                }`}>
                  {paymentStatus.status === 'paid' ? 'Payment Successful!' :
                   paymentStatus.status === 'processing' ? 'Processing Payment...' :
                   paymentStatus.status === 'failed' ? 'Payment Failed' :
                   'Payment Expired'}
                </p>
                {paymentStatus.paymentMethod && (
                  <p className="text-sm text-gray-400">Method: {paymentStatus.paymentMethod}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Membership Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Membership Details</h2>
              
              <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 mb-6 border border-purple-500/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-600 rounded-full">
                    {membershipType.name === 'Akut' ? (
                      <FiAward className="text-2xl text-white" />
                    ) : (
                      <FiStar className="text-2xl text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{membershipType.name} Membership</h3>
                    <p className="text-purple-200">{membershipType.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">Duration:</span>
                    <span className="ml-2 font-semibold text-white">{membershipType.duration_days} days</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Movie Access:</span>
                    <span className="ml-2 font-semibold text-white">
                      {membershipType.movie_access_days ? `${membershipType.movie_access_days} days per movie` : 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Membership Benefits:</h4>
                <div className="space-y-2">
                  {membershipType.name === 'Akut' ? (
                    <>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-purple-500 mr-3" />
                        <span>Unlimited movie access for {membershipType.duration_days} days</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-purple-500 mr-3" />
                        <span>Watch any movie without individual purchases</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-purple-500 mr-3" />
                        <span>Full watch history and continue watching</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-purple-500 mr-3" />
                        <span>Premium member benefits and support</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-purple-500 mr-3" />
                        <span>No ads and priority streaming</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-blue-500 mr-3" />
                        <span>Purchase individual movies</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-blue-500 mr-3" />
                        <span>{membershipType.movie_access_days}-day movie access after purchase</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-blue-500 mr-3" />
                        <span>Watch history tracking</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FiCheckCircle className="text-blue-500 mr-3" />
                        <span>Personal recommendations</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Instructions */}
              {paymentStatus.status === 'pending' && paymentStatus.vaNumber && (
                <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Payment Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Transfer to Virtual Account: <span className="font-mono font-bold">{paymentStatus.vaNumber}</span></li>
                    <li>Amount: <span className="font-bold text-green-400">{formatIDR(membershipType.price)}</span></li>
                    <li>Complete payment before timer expires</li>
                    <li>Payment will be verified automatically</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-bold mb-6">Payment Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Membership:</span>
                  <span className="font-medium">{membershipType.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span>Membership Upgrade</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span>{membershipType.duration_days} days</span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  {paymentStatus.status !== 'paid' && (
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-400">{formatIDR(membershipType.price)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods - Accordion Style */}
              {paymentStatus.status === 'pending' && !processingPayment && !selectedMethod && (
                <div className="space-y-4">
                  <h3 className="font-semibold mb-3">Select Payment Method:</h3>
                  
                  <div className="space-y-3">
                    {/* Credit Card Accordion */}
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <label className="flex items-center p-4 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="paymentCategory"
                          value="credit_card"
                          checked={selectedMethod === 'credit_card'}
                          onChange={() => {
                            setSelectedMethod('credit_card')
                            setShowCardForm(true)
                            setExpandedAccordion('')
                          }}
                          disabled={processingPayment}
                          className="mr-3 w-4 h-4 text-blue-500"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <FiCreditCard className="text-xl" />
                          <div className="text-left">
                            <p className="font-medium">Credit Card / Debit Card</p>
                            <p className="text-sm text-gray-400">Visa, Mastercard, JCB</p>
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Virtual Account Accordion */}
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <label className="flex items-center p-4 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="paymentCategory"
                          value="virtual_account"
                          checked={expandedAccordion === 'virtual_account'}
                          onChange={() => {
                            setExpandedAccordion('virtual_account')
                            setSelectedMethod('')
                            setSelectedBank('')
                            setSelectedEwallet('')
                          }}
                          disabled={processingPayment}
                          className="mr-3 w-4 h-4 text-blue-500"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <FiSmartphone className="text-xl" />
                          <div className="text-left">
                            <p className="font-medium">Virtual Account</p>
                            <p className="text-sm text-gray-400">Transfer via ATM/Mobile Banking</p>
                          </div>
                        </div>
                      </label>
                      
                      {/* VA Banks Sub-options */}
                      {expandedAccordion === 'virtual_account' && (
                        <div className="border-t border-gray-600 bg-gray-800 p-4 space-y-2">
                          {['BCA', 'BNI', 'MANDIRI', 'CIMB', 'PERMATA', 'BSI', 'DANAMON'].map((bank) => (
                            <label key={bank} className="flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                              <input
                                type="radio"
                                name="vaBank"
                                value={bank}
                                checked={selectedBank === bank}
                                onChange={() => {
                                  setSelectedBank(bank)
                                  handlePaymentMethod('virtual_account', bank)
                                }}
                                disabled={processingPayment}
                                className="mr-3 w-4 h-4 text-blue-500"
                              />
                              <div className="flex-1">
                                <p className="font-medium">{bank} Virtual Account</p>
                                <p className="text-sm text-gray-400">Transfer via {bank}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E-Wallet Accordion */}
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <label className="flex items-center p-4 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="paymentCategory"
                          value="ewallet"
                          checked={expandedAccordion === 'ewallet'}
                          onChange={() => {
                            setExpandedAccordion('ewallet')
                            setSelectedMethod('')
                            setSelectedBank('')
                            setSelectedEwallet('')
                          }}
                          disabled={processingPayment}
                          className="mr-3 w-4 h-4 text-blue-500"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <FiSmartphone className="text-xl" />
                          <div className="text-left">
                            <p className="font-medium">E-Wallet</p>
                            <p className="text-sm text-gray-400">Pay with your e-wallet</p>
                          </div>
                        </div>
                      </label>
                      
                      {/* E-Wallet Sub-options */}
                      {expandedAccordion === 'ewallet' && (
                        <div className="border-t border-gray-600 bg-gray-800 p-4 space-y-2">
                          {['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'].map((wallet) => (
                            <label key={wallet} className="flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                              <input
                                type="radio"
                                name="ewalletProvider"
                                value={wallet}
                                checked={selectedEwallet === wallet}
                                onChange={() => {
                                  setSelectedEwallet(wallet)
                                  handlePaymentMethod('ewallet', wallet)
                                }}
                                disabled={processingPayment}
                                className="mr-3 w-4 h-4 text-blue-500"
                              />
                              <div className="flex-1">
                                <p className="font-medium">{wallet}</p>
                                <p className="text-sm text-gray-400">Pay with {wallet}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* QRIS Accordion */}
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <label className="flex items-center p-4 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="paymentCategory"
                          value="qris"
                          checked={selectedMethod === 'qris'}
                          onChange={() => {
                            setSelectedMethod('qris')
                            handlePaymentMethod('qris')
                          }}
                          disabled={processingPayment}
                          className="mr-3 w-4 h-4 text-blue-500"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <FiSmartphone className="text-xl" />
                          <div className="text-left">
                            <p className="font-medium">QRIS</p>
                            <p className="text-sm text-gray-400">Scan QR code with any payment app</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Card Form */}
              {showCardForm && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Enter Card Details:</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={16}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handlePaymentMethod('credit_card')}
                    disabled={processingPayment || cardNumber.length < 16}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-semibold transition-colors"
                  >
                    {processingPayment ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              )}

              {/* I've Already Paid Button */}
              {paymentStatus.status === 'pending' && selectedMethod && !processingPayment && (
                <div className="space-y-3">
                  <button
                    onClick={simulatePayment}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
                  >
                    I've Already Paid
                  </button>
                  
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold transition-colors"
                  >
                    Cancel Payment
                  </button>
                </div>
              )}

              {/* Cancel Payment Confirmation Modal */}
              {showCancelConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Cancel Payment?</h3>
                    <p className="text-gray-300 mb-6">
                      Are you sure you want to cancel this membership purchase? This action cannot be undone and you'll need to start over if you change your mind.
                    </p>
                    
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-semibold transition-colors"
                      >
                        No, Continue Payment
                      </button>
                      <button
                        onClick={handleCancelPayment}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold transition-colors"
                      >
                        Yes, Cancel Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
