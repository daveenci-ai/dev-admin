'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { ConversationList } from '@/components/chatbot/ConversationList'
import { AnalyticsDashboard } from '@/components/chatbot/AnalyticsDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  MessageSquare, 
  BarChart3, 
  Download, 
  RefreshCw,
  Bot,
  TrendingUp
} from 'lucide-react'

export default function ChatbotPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState('analytics')

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const exportConversations = async () => {
    try {
      // This would implement CSV export functionality
      const response = await fetch('/api/chatbot/conversations?export=csv')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'chatbot-conversations.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export conversations')
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chatbot Logs</h1>
            <p className="text-gray-600 mt-2">
              Monitor chatbot performance and analyze conversations
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              onClick={exportConversations}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard refreshTrigger={refreshTrigger} />
            
            {/* Quick Insights */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">💬 Conversation Quality</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Monitor confidence scores above 80%</li>
                      <li>• Track user satisfaction ratings</li>
                      <li>• Identify common conversation patterns</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">⚡ Performance Metrics</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Target response time under 2 seconds</li>
                      <li>• Maintain high intent recognition</li>
                      <li>• Optimize for user engagement</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">🎯 Optimization Tips</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Review low confidence conversations</li>
                      <li>• Update training data regularly</li>
                      <li>• Monitor trending topics and intents</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-6">
            <ConversationList refreshTrigger={refreshTrigger} />
            
            {/* Integration Info */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Bot className="h-5 w-5" />
                  Integration Information
                </CardTitle>
                <CardDescription className="text-green-700">
                  How to integrate conversation logging with your chatbot
                </CardDescription>
              </CardHeader>
              <CardContent className="text-green-800 space-y-3">
                <div>
                  <h4 className="font-medium mb-2">📡 API Endpoint</h4>
                  <code className="bg-green-100 px-2 py-1 rounded text-sm">
                    POST /api/chatbot/conversations
                  </code>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">📋 Required Fields</h4>
                  <div className="text-sm space-y-1">
                    <div><code className="bg-green-100 px-1 rounded">sessionId</code> - Unique session identifier</div>
                    <div><code className="bg-green-100 px-1 rounded">userMessage</code> - User's input message</div>
                    <div><code className="bg-green-100 px-1 rounded">botResponse</code> - Chatbot's response</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">🔧 Optional Fields</h4>
                  <div className="text-sm space-y-1">
                    <div><code className="bg-green-100 px-1 rounded">intent</code> - Detected intent (e.g., "greeting", "question")</div>
                    <div><code className="bg-green-100 px-1 rounded">confidence</code> - AI confidence score (0-1)</div>
                    <div><code className="bg-green-100 px-1 rounded">responseTime</code> - Response time in milliseconds</div>
                    <div><code className="bg-green-100 px-1 rounded">feedbackRating</code> - User rating (1-5 stars)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  )
} 