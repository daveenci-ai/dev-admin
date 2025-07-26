'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Simple redirect for authenticated users only
    if (status === 'authenticated' && session?.user) {
      console.log('[HOME_PAGE] Authenticated user, redirecting to CRM')
      router.push('/crm')
    }
  }, [status, session, router])

  // Don't show anything for unauthenticated users - let EmergencyAuth handle it
  if (status === 'unauthenticated' || !session?.user) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          Redirecting to dashboard...
        </p>
      </div>
    </div>
  )
} 