import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CRMPageComponent from './CRMPageComponent'

export default async function CRMPage() {
  // FORCE SERVER-SIDE AUTHENTICATION CHECK
  const session = await getServerSession(authOptions)
  
  console.log('[CRM_PAGE] Server-side auth check:', !!session?.user)
  
  if (!session?.user) {
    console.log('[CRM_PAGE] BLOCKING: No authenticated user, redirecting to login')
    redirect('/auth/login')
  }

  console.log('[CRM_PAGE] Server-side authentication passed for:', session.user.email)
  
  return <CRMPageComponent />
} 