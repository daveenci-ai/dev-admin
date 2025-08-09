'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Mail, 
  FileText, 
  ImageIcon, 
  MessageSquare, 
  Brain,
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'CRM', href: '/crm', icon: Users },
  { name: 'Zoho', href: '/email', icon: Mail },
  { name: 'Blog', href: '/blog', icon: FileText },
  { name: 'Avatar', href: '/avatar', icon: ImageIcon },
  { name: 'Chatbot', href: '/chatbot', icon: MessageSquare },
  { name: 'Assistant', href: '/assistant', icon: Brain },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleLogout = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const callbackUrl = origin ? `${origin}/auth/login` : '/auth/login'
    signOut({ callbackUrl })
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="hidden sm:ml-12 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center">
            {session?.user && (
              <div className="flex items-center space-x-6">
                <span className="text-sm font-medium text-gray-700">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 