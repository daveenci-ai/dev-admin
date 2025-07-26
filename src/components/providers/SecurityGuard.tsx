'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function SecurityGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    console.log(`[SECURITY_GUARD] Checking access to: ${pathname}`)
    console.log(`[SECURITY_GUARD] Session status: ${status}`)
    console.log(`[SECURITY_GUARD] User:`, session?.user)

    if (status === 'loading') {
      console.log(`[SECURITY_GUARD] Still loading session...`)
      return // Still loading
    }

    setIsChecking(false)

    // If it's a public route, allow access
    if (isPublicRoute) {
      console.log(`[SECURITY_GUARD] Public route allowed: ${pathname}`)
      return
    }

    // For protected routes, require authentication
    if (status === 'unauthenticated' || !session?.user) {
      console.log(`[SECURITY_GUARD] BLOCKING access to ${pathname} - redirecting to login`)
      router.push('/auth/login')
      return
    }

    console.log(`[SECURITY_GUARD] Access GRANTED to ${pathname}`)
  }, [status, session, pathname, router, isPublicRoute])

  // Show loading while checking authentication
  if (isChecking && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // If user is trying to access protected route without auth, show nothing (redirect in progress)
  if (!isPublicRoute && (status === 'unauthenticated' || !session?.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-red-600 font-medium">Access denied - redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Allow access
  return <>{children}</>
} 