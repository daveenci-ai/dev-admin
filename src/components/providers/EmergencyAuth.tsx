'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * EMERGENCY AUTHENTICATION COMPONENT
 * This component provides immediate security protection at the page level
 * when middleware fails to work in production.
 */
export function EmergencyAuth({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Force redirect if not authenticated
    if (status === 'unauthenticated') {
      console.log('[EMERGENCY_AUTH] Blocking unauthenticated access - redirecting to login')
      window.location.href = '/auth/login'
      return
    }

    if (status === 'authenticated' && !session?.user) {
      console.log('[EMERGENCY_AUTH] No user in session - redirecting to login')
      window.location.href = '/auth/login'
      return
    }

    console.log('[EMERGENCY_AUTH] User authenticated:', session?.user?.email)
  }, [status, session, router])

  // Show loading while checking
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Block if not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600 mb-4">This admin dashboard requires authentication.</p>
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

  // Allow access if authenticated
  return <>{children}</>
} 