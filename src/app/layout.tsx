import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { EmergencyAuth } from '@/components/providers/EmergencyAuth'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'

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
          <EmergencyAuth>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </EmergencyAuth>
        </AuthProvider>
      </body>
    </html>
  )
} 