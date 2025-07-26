import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { SecurityGuard } from '@/components/providers/SecurityGuard'
import { Navigation } from '@/components/layout/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DaVeenci Admin Dashboard',
  description: 'Comprehensive admin dashboard for DaVeenci AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SecurityGuard>
            <div className="min-h-screen bg-gray-50">
              <Navigation />
              <main className="py-6">
                {children}
              </main>
            </div>
          </SecurityGuard>
        </AuthProvider>
      </body>
    </html>
  )
} 