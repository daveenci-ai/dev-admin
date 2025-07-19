'use client'

import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Send, Users, FileText } from 'lucide-react'

export default function EmailPage() {
  const plannedFeatures = [
    {
      icon: Mail,
      title: 'Email Templates',
      description: 'Create and manage reusable email templates'
    },
    {
      icon: Send,
      title: 'Bulk Email Sending',
      description: 'Send emails to multiple contacts at once'
    },
    {
      icon: Users,
      title: 'Contact Integration',
      description: 'Send emails directly from CRM contacts'
    },
    {
      icon: FileText,
      title: 'Email History',
      description: 'Track all sent emails and engagement metrics'
    }
  ]

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Management</h1>
          <p className="text-gray-600 mt-2">
            Email templates, campaigns, and contact communication
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="text-center py-12">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Email Management Coming Soon</CardTitle>
            <CardDescription className="text-lg">
              We're working on building a comprehensive email management system
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Planned Features */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Planned Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plannedFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Temporary Note */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Development Note</h3>
                <p className="text-blue-800 text-sm mt-1">
                  The Email Management system will include template creation, bulk sending, 
                  integration with SendGrid or similar services, and comprehensive email analytics. 
                  For now, you can manage contacts in the CRM section.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 