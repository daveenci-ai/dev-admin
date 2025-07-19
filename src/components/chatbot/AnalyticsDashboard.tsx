'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  Users, 
  Star,
  Target,
  Zap,
  Brain,
  ThumbsUp
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalConversations: number
    recentConversations: number
    uniqueSessions: number
    avgResponseTime: number
    avgConfidence: number
    satisfactionRate: number
    totalFeedback: number
  }
  trends: {
    conversationsByDay: Array<{ date: string; conversations: number }>
    responseTimeDistribution: Array<{ speed_category: string; count: number }>
    feedbackDistribution: Record<number, number>
  }
  insights: {
    topIntents: Array<{ intent: string; count: number; percentage: number }>
    avgConfidenceLevel: string
    responseTimeLevel: string
  }
  period: {
    days: number
    startDate: string
    endDate: string
  }
}

interface AnalyticsDashboardProps {
  refreshTrigger: number
}

export function AnalyticsDashboard({ refreshTrigger }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timePeriod, refreshTrigger])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/chatbot/analytics?days=${timePeriod}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'excellent':
      case 'high':
        return 'text-green-600 bg-green-100'
      case 'good':
      case 'medium':
        return 'text-blue-600 bg-blue-100'
      case 'fair':
        return 'text-yellow-600 bg-yellow-100'
      case 'poor':
      case 'low':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Failed to load analytics data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Overview</h2>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalConversations.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3" />
              <span>{analytics.overview.recentConversations} in period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Unique Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.uniqueSessions.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              <span>Active users</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.avgResponseTime}ms</div>
            <div className="flex items-center space-x-1 text-xs">
              <Clock className="h-3 w-3" />
              <Badge className={getPerformanceColor(analytics.insights.responseTimeLevel)}>
                {analytics.insights.responseTimeLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Satisfaction Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.satisfactionRate}%</div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <ThumbsUp className="h-3 w-3" />
              <span>{analytics.overview.totalFeedback} reviews</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence & Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Performance
            </CardTitle>
            <CardDescription>
              Confidence levels and response quality metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Confidence</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{analytics.overview.avgConfidence}%</span>
                <Badge className={getPerformanceColor(analytics.insights.avgConfidenceLevel)}>
                  {analytics.insights.avgConfidenceLevel}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response Time Quality</span>
              <Badge className={getPerformanceColor(analytics.insights.responseTimeLevel)}>
                {analytics.insights.responseTimeLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Top Intents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Intents
            </CardTitle>
            <CardDescription>
              Most common conversation topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.insights.topIntents.slice(0, 5).map((intent, index) => (
                <div key={intent.intent} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                    <span className="capitalize">{intent.intent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{intent.count}</span>
                    <Badge variant="outline">
                      {intent.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Response Time Distribution
          </CardTitle>
          <CardDescription>
            How quickly the chatbot responds to user queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.trends.responseTimeDistribution.map((category) => (
              <div key={category.speed_category} className="text-center">
                <div className="text-lg font-bold">{category.count}</div>
                <div className="text-sm text-gray-500">{category.speed_category}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Distribution */}
      {Object.keys(analytics.trends.feedbackDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              User Feedback Distribution
            </CardTitle>
            <CardDescription>
              How users rate their chatbot interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = analytics.trends.feedbackDistribution[rating] || 0
                const percentage = analytics.overview.totalFeedback > 0 
                  ? (count / analytics.overview.totalFeedback) * 100 
                  : 0
                
                return (
                  <div key={rating} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {Array.from({ length: rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 