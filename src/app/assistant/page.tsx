'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { QueryInterface } from '@/components/assistant/QueryInterface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  Database, 
  Zap, 
  Shield,
  History,
  Lightbulb,
  Code
} from 'lucide-react'

export default function AssistantPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleQueryExecuted = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Assistant</h1>
          <p className="text-gray-600 mt-2">
            Query your database using natural language powered by Gemini AI
          </p>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="query" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="query" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Query Assistant
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              How It Works
            </TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="space-y-6">
            <QueryInterface onQueryExecuted={handleQueryExecuted} />
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            {/* How It Works */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI-Powered Queries
                  </CardTitle>
                  <CardDescription>
                    Advanced natural language processing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Natural Language Input</h4>
                      <p className="text-sm text-gray-600">Type your question in plain English</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium">AI Translation</h4>
                      <p className="text-sm text-gray-600">Gemini AI converts to SQL query</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Safe Execution</h4>
                      <p className="text-sm text-gray-600">Query runs with security checks</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Results Display</h4>
                      <p className="text-sm text-gray-600">Data presented in clear format</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Features
                  </CardTitle>
                  <CardDescription>
                    Built-in protection and limitations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Read-only queries only</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">SQL injection prevention</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Result limits (max 100 rows)</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Query validation and sanitization</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Audit logging for all queries</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Example Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Example Queries
                </CardTitle>
                <CardDescription>
                  Try these example questions to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 text-blue-600">📊 CRM Analytics</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• "Show me the top 10 contacts by company"</li>
                      <li>• "How many leads were created this week?"</li>
                      <li>• "List contacts with status 'qualified'"</li>
                      <li>• "Which companies have the most contacts?"</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">📝 Blog Insights</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• "What are the most viewed blog posts?"</li>
                      <li>• "Show published posts from last month"</li>
                      <li>• "List featured articles"</li>
                      <li>• "How many drafts are pending?"</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-purple-600">🎨 Avatar Analytics</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• "Show successful avatar generations today"</li>
                      <li>• "What are the most popular LoRA repositories?"</li>
                      <li>• "List failed generations with errors"</li>
                      <li>• "Average generation time by status"</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-orange-600">🤖 Chatbot Data</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• "Show conversations with high confidence"</li>
                      <li>• "What are the top user intents?"</li>
                      <li>• "List recent chatbot interactions"</li>
                      <li>• "Average response time by intent"</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips and Best Practices */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Lightbulb className="h-5 w-5" />
                  Tips for Better Results
                </CardTitle>
              </CardHeader>
              <CardContent className="text-purple-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">✨ Query Tips</h4>
                    <ul className="space-y-1 text-purple-700">
                      <li>• Be specific about what data you want</li>
                      <li>• Use table names (contacts, blog posts, etc.)</li>
                      <li>• Specify time ranges when relevant</li>
                      <li>• Ask for counts, averages, or specific columns</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">⚡ Performance</h4>
                    <ul className="space-y-1 text-purple-700">
                      <li>• Queries are limited to 100 results</li>
                      <li>• Complex joins may take longer</li>
                      <li>• Use date filters for better performance</li>
                      <li>• Results are cached for 5 minutes</li>
                    </ul>
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