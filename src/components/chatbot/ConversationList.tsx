'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageSquare, 
  Bot, 
  User, 
  Clock, 
  Star,
  Search,
  Filter,
  Eye,
  Download
} from 'lucide-react'

interface ChatbotConversation {
  id: number
  sessionId: string
  userId: string | null
  userMessage: string
  botResponse: string
  intent: string | null
  confidence: number | null
  responseTime: number | null
  feedbackRating: number | null
  createdAt: string
  updatedAt: string
}

interface ConversationListProps {
  refreshTrigger: number
}

export function ConversationList({ refreshTrigger }: ConversationListProps) {
  const [conversations, setConversations] = useState<ChatbotConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [intentFilter, setIntentFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchConversations()
  }, [searchTerm, intentFilter, confidenceFilter, pagination.page, refreshTrigger])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        intent: intentFilter,
        ...(confidenceFilter !== 'all' && { minConfidence: confidenceFilter })
      })

      const response = await fetch(`/api/chatbot/conversations?${params}`)
      const data = await response.json()
      
      setConversations(data.conversations || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }))
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null
    
    const percentage = Math.round(confidence * 100)
    if (percentage >= 80) {
      return <Badge className="bg-green-100 text-green-800">High ({percentage}%)</Badge>
    } else if (percentage >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium ({percentage}%)</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Low ({percentage}%)</Badge>
    }
  }

  const getFeedbackStars = (rating: number | null) => {
    if (!rating) return null
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating 
                ? 'text-yellow-500 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return 'N/A'
    
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={intentFilter} onValueChange={setIntentFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Intents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Intents</SelectItem>
              <SelectItem value="greeting">Greeting</SelectItem>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="request">Request</SelectItem>
              <SelectItem value="complaint">Complaint</SelectItem>
              <SelectItem value="goodbye">Goodbye</SelectItem>
            </SelectContent>
          </Select>

          <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Confidence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Confidence</SelectItem>
              <SelectItem value="0.8">High (80%+)</SelectItem>
              <SelectItem value="0.6">Medium (60%+)</SelectItem>
              <SelectItem value="0">Low (All)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
            <p className="text-gray-500">
              {searchTerm || intentFilter !== 'all' || confidenceFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No chatbot conversations have been logged yet'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      Session: {conversation.sessionId}
                      {conversation.intent && (
                        <Badge variant="outline" className="ml-2">
                          {conversation.intent}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{format(new Date(conversation.createdAt), 'MMM dd, HH:mm')}</span>
                      {conversation.responseTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatResponseTime(conversation.responseTime)}
                        </div>
                      )}
                      {conversation.confidence && (
                        <div className="flex items-center gap-1">
                          {getConfidenceBadge(conversation.confidence)}
                        </div>
                      )}
                      {conversation.feedbackRating && (
                        <div className="flex items-center gap-1">
                          {getFeedbackStars(conversation.feedbackRating)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* User Message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{conversation.userMessage}</p>
                    </div>
                  </div>

                  {/* Bot Response */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 bg-green-50 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{conversation.botResponse}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} conversations
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 