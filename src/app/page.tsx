'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'authenticated' && session?.user) {
      // User is authenticated, redirect to CRM
      router.push('/crm')
    } else {
      // User is not authenticated, redirect to login
      router.push('/auth/login')
    }
  }, [status, session, router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {status === 'loading' ? 'Loading...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
} 