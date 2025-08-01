'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that should have clean layout without navigation
  const cleanPages = ['/auth/login']
  const isCleanPage = cleanPages.includes(pathname)

  if (isCleanPage) {
    // Clean layout for login page - no navigation, full screen
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  // Normal layout with navigation for authenticated pages
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="py-6">
        {children}
      </main>
    </div>
  )
} 