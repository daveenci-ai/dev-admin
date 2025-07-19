import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Mail, FileText, ImageIcon, MessageSquare, Brain } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    {
      title: 'Total Contacts',
      value: '0',
      description: 'Contacts in CRM',
      icon: Users,
      href: '/crm'
    },
    {
      title: 'Email Templates',
      value: '0',
      description: 'Available templates',
      icon: Mail,
      href: '/email'
    },
    {
      title: 'Blog Posts',
      value: '0',
      description: 'Published articles',
      icon: FileText,
      href: '/blog'
    },
    {
      title: 'Generated Avatars',
      value: '0',
      description: 'AI generated images',
      icon: ImageIcon,
      href: '/avatars'
    },
    {
      title: 'Chat Sessions',
      value: '0',
      description: 'Conversation logs',
      icon: MessageSquare,
      href: '/chatbot'
    },
    {
      title: 'Assistant Queries',
      value: '0',
      description: 'Smart queries processed',
      icon: Brain,
      href: '/assistant'
    }
  ]

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome to the DaVeenci Admin Dashboard. Manage your CRM, content, and AI tools from here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>• Add your first contact in the <strong>CRM</strong> section</p>
                <p>• Create email templates in the <strong>Email</strong> section</p>
                <p>• Write your first blog post in the <strong>Blog</strong> section</p>
                <p>• Generate AI avatars in the <strong>Avatars</strong> section</p>
                <p>• Review chat conversations in the <strong>Chatbot</strong> section</p>
                <p>• Ask the smart <strong>Assistant</strong> questions about your data</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
} 