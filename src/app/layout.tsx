import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const ClientWrapper = dynamic(() => import('@/components/providers/ClientWrapper').then(mod => mod.ClientWrapper), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-sm">Loading Application...</p>
      </div>
    </div>
  ),
})

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
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  )
} 