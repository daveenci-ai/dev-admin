'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import { EmergencyAuth } from '@/components/providers/EmergencyAuth'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EmergencyAuth>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </EmergencyAuth>
    </AuthProvider>
  )
} 