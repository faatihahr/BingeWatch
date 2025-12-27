'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { formatIDR } from '@/lib/currency'
import { xendit } from '@/lib/xendit'
import { FiCreditCard, FiSmartphone, FiClock, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi'
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

interface Movie {
  id: string
  title: string
  description: string
  thumbnail: string
  price: number
  genre: string[]
  duration: number
}

interface PaymentStatus {
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'expired'
  invoiceUrl?: string
  vaNumber?: string
  paymentMethod?: string
  expiresAt?: Date
}

export default function PaymentCheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const movieId = searchParams.get('movieId')

  const [movie, setMovie] = useState<Movie | null>(null)
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
    if (!movieId) {
      setError('Movie ID is required')
      setLoading(false)
      return
    }

    const fetchMovieAndPaymentStatus = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        // Fetch movie details
        const { data: movieData, error: movieError } = await supabase
          .from('movies')
          .select('*')
          .eq('id', movieId)
          .single()

        if (movieError) throw movieError
        if (!movieData) throw new Error('Movie not found')

        setMovie(movieData)

        // Check existing purchase status
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('email', session.user.email)
          .single()

        if (!userError && existingUser) {
          const { data: purchaseData } = await supabaseAdmin
            .from('purchases')
            .select('*')
            .eq('user_id', existingUser.id)
            .eq('movie_id', movieData.id)
            .single()

          if (purchaseData) {
            if (purchaseData.payment_status === 'paid') {
              setPaymentStatus({ status: 'paid' })
              // Redirect to movie page after 2 seconds
              setTimeout(() => {
                router.push(`/movies/${movieData.id}?purchased=true`)
              }, 2000)
            } else if (purchaseData.payment_status === 'pending') {
              setPaymentStatus({ 
                status: 'pending',
                paymentMethod: purchaseData.payment_method,
                vaNumber: purchaseData.va_number,
                invoiceUrl: purchaseData.invoice_url
              })
            }
          }
        } else {
          // User not found in database (likely Google auth), create user record
          console.log('User not found in database, creating record for:', session.user.email)
          try {
            const { data: newUser, error: createError } = await supabaseAdmin
              .from('users')
              .insert({
                id: session.user.id, // Use the converted UUID from JWT
                email: session.user.email,
                name: session.user.name || 'User',
                role: 'user'
              })
              .select('id, name, email')
              .single()

            if (createError) {
              console.error('Error creating user record:', createError)
              // Continue anyway, user might still be able to make purchases
            } else {
              console.log('Created user record:', newUser)
            }
          } catch (error) {
            console.error('Failed to create user record:', error)
          }
        }

      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load details')
      } finally {
        setLoading(false)
      }
    }

    fetchMovieAndPaymentStatus()
  }, [movieId, session?.user?.id])

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
    console.log('handlePaymentMethod called with:', method, subMethod)
    
    if (!session) {
      setError('Please login to make a purchase')
      return
    }

    if (!movie) {
      setError('Movie data not loaded')
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
      console.log('Current selectedEwallet:', selectedEwallet)
      return
    }

    // Now process payment - we have all required info
    console.log('Processing payment with method:', method, 'subMethod:', subMethod)
    console.log('Current selectedEwallet:', selectedEwallet)
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

      // If user doesn't exist, create user record (for Google auth users)
      if (userError || !existingUser) {
        console.log('User not found in database during payment, creating record for:', session.user.email)
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: session.user.id, // Use the converted UUID from JWT
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

      // Check if already purchased using service role client (only check for successful purchases)
      try {
        const { data: existingPurchase } = await supabaseAdmin
          .from('purchases')
          .select('*')
          .eq('user_id', existingUser.id)
          .eq('movie_id', movie.id)
          .eq('payment_status', 'paid')
          .single()

        if (existingPurchase) {
          throw new Error('You have already purchased this movie')
        }
      } catch (checkError: any) {
        // If it's a "no rows" error, that's fine - continue
        if (checkError.code !== 'PGRST116') {
          console.error('Error checking existing purchase:', checkError)
        }
      }

      setPaymentStatus({ status: 'processing' })

      let paymentResponse
      let invoiceUrlToSave = '' // Variable to store invoice URL for database

      if (method === 'credit_card') {
        // Create Xendit invoice for credit card
        paymentResponse = await xendit.createInvoice({
          externalId: `movie-${movie.id}-${existingUser.id}-${Date.now()}`,
          amount: movie.price,
          description: `Purchase movie: ${movie.title}`,
          payerEmail: session.user.email || '',
          customer: {
            givenNames: existingUser.name || '',
            email: session.user.email || '',
          }
        })

        // Redirect immediately to Xendit before setting state
        const invoiceUrl = (paymentResponse as any)?.invoice_url || (paymentResponse as any)?.invoiceUrl
        invoiceUrlToSave = invoiceUrl // Save for database
        
        if (invoiceUrl) {
          console.log('Opening movie payment invoice URL:', invoiceUrl)
          console.log('About to redirect to:', invoiceUrl)
          
          // Force redirect with multiple methods
          console.log('Attempting redirect method 1: window.location.href')
          window.location.href = invoiceUrl
          
          // Fallback redirects
          setTimeout(() => {
            console.log('Attempting redirect method 2: window.location.assign')
            window.location.assign(invoiceUrl)
          }, 100)
          
          setTimeout(() => {
            console.log('Attempting redirect method 3: window.open')
            window.open(invoiceUrl, '_self')
          }, 200)
          
          setTimeout(() => {
            console.log('Attempting redirect method 4: window.location.replace')
            window.location.replace(invoiceUrl)
          }, 300)
          
          return // Stop execution here
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
          externalId: `movie-${movie.id}-${existingUser.id}-${Date.now()}`,
          bankCode: subMethod as any,
          name: existingUser.name,
          description: `Purchase movie: ${movie.title}`
        })

        setPaymentStatus({
          status: 'pending',
          vaNumber: (paymentResponse as any)?.virtualAccount?.accountNumber || '1234567890',
          paymentMethod: `${subMethod} Virtual Account`,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })

    } else if (method === 'ewallet') {
        // Create E-Wallet invoice
        const response = await fetch('/api/payment/create-ewallet-charge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            movie: {
              id: movie.id,
              title: movie.title,
              price: movie.price,
            },
            userEmail: session.user.email,
            userName: existingUser.name,
            ewalletType: subMethod || selectedEwallet,
            phone: undefined
          }),
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create e-wallet invoice')
        }

        console.log('Movie e-wallet invoice response:', data)

        // Redirect immediately to Xendit
        if (data.invoiceUrl) {
          invoiceUrlToSave = data.invoiceUrl // Save for database
          
          console.log('Opening movie e-wallet invoice URL:', data.invoiceUrl)
          console.log('About to redirect to:', data.invoiceUrl)
          
          // Force redirect with multiple methods
          console.log('Attempting redirect method 1: window.location.href')
          try {
            window.location.href = data.invoiceUrl
            console.log('Method 1 executed successfully')
          } catch (e) {
            console.error('Method 1 failed:', e)
          }
          
          // Fallback redirects
          setTimeout(() => {
            console.log('Attempting redirect method 2: window.location.assign')
            try {
              window.location.assign(data.invoiceUrl)
              console.log('Method 2 executed successfully')
            } catch (e) {
              console.error('Method 2 failed:', e)
            }
          }, 100)
          
          setTimeout(() => {
            console.log('Attempting redirect method 3: window.open')
            try {
              window.open(data.invoiceUrl, '_self')
              console.log('Method 3 executed successfully')
            } catch (e) {
              console.error('Method 3 failed:', e)
            }
          }, 200)
          
          setTimeout(() => {
            console.log('Attempting redirect method 4: window.location.replace')
            try {
              window.location.replace(data.invoiceUrl)
              console.log('Method 4 executed successfully')
            } catch (e) {
              console.error('Method 4 failed:', e)
            }
          }, 300)
          
          return // Stop execution here
        }

        setPaymentStatus({
          status: 'pending',
          invoiceUrl: data.invoiceUrl,
          paymentMethod: subMethod || selectedEwallet,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })
      } else if (method === 'qris') {
        // Create QRIS payment
        paymentResponse = await xendit.createQRISCharge({
          externalId: `movie-${movie.id}-${existingUser.id}-${Date.now()}`,
          amount: movie.price
        })

        // Redirect to QRIS payment page immediately
        const qrCodeUrl = (paymentResponse as any)?.qrCodeUrl || (paymentResponse as any)?.qr_code_url
        invoiceUrlToSave = qrCodeUrl // Save for database
        
        if (qrCodeUrl) {
          console.log('Opening movie QRIS URL:', qrCodeUrl)
          console.log('About to redirect to:', qrCodeUrl)
          
          // Force redirect with multiple methods
          console.log('Attempting redirect method 1: window.location.href')
          window.location.href = qrCodeUrl
          
          // Fallback redirects
          setTimeout(() => {
            console.log('Attempting redirect method 2: window.location.assign')
            window.location.assign(qrCodeUrl)
          }, 100)
          
          setTimeout(() => {
            console.log('Attempting redirect method 3: window.open')
            window.open(qrCodeUrl, '_self')
          }, 200)
          
          setTimeout(() => {
            console.log('Attempting redirect method 4: window.location.replace')
            window.location.replace(qrCodeUrl)
          }, 300)
          
          return // Stop execution here
        }

        setPaymentStatus({
          status: 'pending',
          invoiceUrl: (paymentResponse as any)?.qrCodeUrl || (paymentResponse as any)?.qr_code_url,
          paymentMethod: 'QRIS',
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })
      }

      // Create or update pending purchase record BEFORE redirect
      console.log('About to save to database. invoiceUrlToSave:', invoiceUrlToSave);
      console.log('User ID:', existingUser.id, 'Movie ID:', movie.id);
      
      try {
        const purchaseData = {
          user_id: existingUser.id,
          movie_id: movie.id,
          amount: movie.price,
          payment_status: 'pending',
          payment_method: method === 'virtual_account' ? `${selectedBank} VA` : method === 'ewallet' ? (subMethod || selectedEwallet) : method,
          external_id: (paymentResponse as any)?.id || `movie-${movie.id}-${existingUser.id}-${Date.now()}`,
          invoice_url: invoiceUrlToSave,
          va_number: (paymentResponse as any)?.virtualAccount?.accountNumber
        };
        
        console.log('Purchase data to save:', purchaseData);
        
        const { data: savedPurchase, error: saveError } = await supabaseAdmin
          .from('purchases')
          .upsert([purchaseData], {
            onConflict: 'user_id,movie_id',
            ignoreDuplicates: false
          })
          
        console.log('Save result:', { savedPurchase, saveError });
        
        if (saveError) {
          console.error('Failed to upsert purchase record:', saveError)
          throw saveError;
        }
        
        console.log('✅ Purchase saved successfully to database with ID:', (savedPurchase as any)?.[0]?.id);
      } catch (dbError: any) {
        console.error('❌ Failed to upsert purchase record:', dbError)
        setError(`Database error: ${dbError.message || 'Unknown error'}`)
        setPaymentStatus({ status: 'failed' })
        setProcessingPayment(false)
        return // Stop execution here
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
    if (!session?.user || !movie) return

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

      // Update any pending purchase to failed
      if (existingUser) {
        try {
          await supabaseAdmin
            .from('purchases')
            .update({ 
              payment_status: 'failed'
            })
            .eq('user_id', existingUser.id)
            .eq('movie_id', movie.id)
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

  // Manual payment verification function
  const verifyManualPayment = async () => {
    if (!session?.user?.id || !movie?.id) return

    try {
      // Find the most recent pending purchase for this user and movie
      const { data: pendingPurchase } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('movie_id', movie.id)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (pendingPurchase && pendingPurchase.invoice_url) {
        // Extract invoice ID from URL
        const invoiceUrl = pendingPurchase.invoice_url
        const invoiceId = invoiceUrl.split('/').pop()
        
        if (invoiceId) {
          console.log('Manually verifying payment for invoice:', invoiceId)
          
          const response = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoiceId,
              externalId: pendingPurchase.external_id,
            }),
          })

          const data = await response.json()
          
          if (data.success) {
            console.log('Manual verification successful')
            // Refresh payment status
            window.location.reload()
          } else {
            console.error('Manual verification failed:', data.error)
            setError('Payment verification failed: ' + data.error)
          }
        }
      }
    } catch (error) {
      console.error('Manual verification error:', error)
      setError('Failed to verify payment')
    }
  }

  const simulatePayment = async () => {
    if (!session?.user?.id || !movie?.id) {
      console.error('Missing session or movie data')
      return
    }

    try {
      // Find existing user by email using service client
      let { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single()

      // If user doesn't exist, create user record (for Google auth users)
      if (userError || !existingUser) {
        console.log('User not found in database during simulate payment, creating record for:', session.user.email)
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: session.user.id, // Use the converted UUID from JWT
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

      // Update purchase status to paid
      const { error } = await supabaseAdmin
        .from('purchases')
        .update({ 
          payment_status: 'paid'
        })
        .eq('user_id', existingUser.id)
        .eq('movie_id', movie.id)
        .eq('payment_status', 'pending')

      if (error) throw error

      setPaymentStatus({ status: 'paid' })
      
      // Redirect to movie page after successful payment
      setTimeout(() => {
        router.push(`/movies/${movie.id}?purchased=true`)
      }, 2000)

    } catch (err) {
      console.error('Error simulating payment:', err)
      setError('Failed to simulate payment')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading payment details...</div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Movie not found'}</div>
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
          <h1 className="text-3xl font-bold">Payment Checkout</h1>
          <p className="text-gray-400 mt-2">Complete your purchase for {movie.title}</p>
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
        {(paymentStatus.status === 'pending' && selectedMethod) && (
          <div className="mb-6">
            <PaymentStatus
              status={uiPaymentStatus}
              onPaid={() => {}}
              onCancel={() => {}}
            />
            
            {/* Manual Verify Payment Button */}
            <div className="mt-4 text-center">
              <button
                onClick={verifyManualPayment}
                disabled={processingPayment}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
              >
                {processingPayment ? 'Verifying...' : 'Verify Payment'}
              </button>
              <p className="text-sm text-gray-400 mt-2">
                If you have completed payment in Xendit but the status hasn't updated, click this button to verify
              </p>
            </div>
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
          {/* Movie Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Movie Details</h2>
              
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full sm:w-32 h-48 sm:h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">{movie.title}</h3>
                  <p className="text-gray-300 mb-4">{movie.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="ml-2 font-semibold">{movie.duration} min</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Genres:</span>
                      <span className="ml-2 break-words">{movie.genre.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              {paymentStatus.status === 'pending' && paymentStatus.vaNumber && (
                <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Payment Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Transfer to Virtual Account: <span className="font-mono font-bold">{paymentStatus.vaNumber}</span></li>
                    <li>Amount: <span className="font-bold text-green-400">{formatIDR(movie.price)}</span></li>
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
                  <span className="text-gray-400">Movie:</span>
                  <span className="font-medium">{movie.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span>Digital Purchase</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Access:</span>
                  <span>7 days</span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  {paymentStatus.status !== 'paid' && (
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-400">{formatIDR(movie.price)}</span>
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
                        maxLength={3}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePaymentMethod('credit_card')}
                      disabled={processingPayment || cardNumber.length < 16}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pay Now
                    </button>
                    <button
                      onClick={() => {
                        setShowCardForm(false)
                        setCardNumber('')
                      }}
                      className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-md font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Processing State */}
              {processingPayment && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-blue-400">Processing payment...</p>
                </div>
              )}

              {/* I've Already Paid Button */}
              {paymentStatus.status === 'pending' && selectedMethod && !processingPayment && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  <button
                    onClick={simulatePayment}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
                  >
                    I've Already Paid (Testing)
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    For development testing only
                  </p>
                  
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
                      Are you sure you want to cancel this movie purchase? This action cannot be undone and you'll need to start over if you change your mind.
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

              {/* Action Buttons */}
              {paymentStatus.status === 'paid' && (
                <button
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
                >
                  Watch Movie Now
                </button>
              )}

              {paymentStatus.status === 'failed' && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
                >
                  Try Again
                </button>
              )}

              {paymentStatus.status === 'expired' && (
                <button
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-md font-medium transition-colors"
                >
                  Back to Movie
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
