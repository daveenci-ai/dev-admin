'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // EMERGENCY SECURITY CHECK
    if (status === 'unauthenticated') {
      console.log('[HOME_PAGE] EMERGENCY: Redirecting unauthenticated user to login')
      window.location.href = '/auth/login'
      return
    }

    if (status === 'loading') return // Still loading

    if (status === 'authenticated' && session?.user) {
      // User is authenticated, redirect to CRM
      console.log('[HOME_PAGE] Authenticated user, redirecting to CRM')
      router.push('/crm')
    } else {
      // User is not authenticated, redirect to login
      console.log('[HOME_PAGE] No session, redirecting to login')
      window.location.href = '/auth/login'
    }
  }, [status, session, router])

  // EMERGENCY: Block if not authenticated
  if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600 mb-4">Admin dashboard requires authentication.</p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {status === 'loading' ? 'Verifying authentication...' : 'Redirecting to dashboard...'}
        </p>
      </div>
    </div>
  )
} 