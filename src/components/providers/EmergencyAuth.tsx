'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * CLEAN AUTHENTICATION COMPONENT
 * Shows a single, clean access denied message without redirects or flickering
 */
export function EmergencyAuth({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  
  // Ensure we're on the client side before using hooks
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render anything during SSR to prevent hydration mismatches
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Show minimal loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Verifying access...</p>
        </div>
      </div>
    )
  }

  // If public route, allow access
  if (isPublicRoute) {
    return <>{children}</>
  }

  // If not authenticated, show clean access denied (NO REDIRECTS, NO FLICKERING)
  if (status === 'unauthenticated' || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md w-full text-center p-8">
          <div className="text-red-600 text-8xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-red-800 mb-4">Access Denied</h1>
          <p className="text-red-600 mb-6 text-lg">
            This admin dashboard requires authentication from validated users only.
          </p>
          <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm font-medium">
              🔒 Only authorized personnel from the users database can access this system.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-lg"
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