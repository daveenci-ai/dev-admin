import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get basic conversation stats
    const [
      totalConversations,
      recentConversations,
      avgResponseTime,
      avgConfidence,
      feedbackStats,
      uniqueSessions,
      topIntents,
      conversationsByDay,
      responseTimeDistribution
    ] = await Promise.all([
      // Total conversations
      prisma.chatbotConversation.count(),
      
      // Recent conversations (within specified days)
      prisma.chatbotConversation.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Average response time
      prisma.chatbotConversation.aggregate({
        _avg: { responseTime: true },
        where: {
          responseTime: { not: null },
          createdAt: { gte: startDate }
        }
      }),
      
      // Average confidence
      prisma.chatbotConversation.aggregate({
        _avg: { confidence: true },
        where: {
          confidence: { not: null },
          createdAt: { gte: startDate }
        }
      }),
      
      // Feedback stats
      prisma.chatbotConversation.groupBy({
        by: ['feedbackRating'],
        _count: { feedbackRating: true },
        where: {
          feedbackRating: { not: null },
          createdAt: { gte: startDate }
        }
      }),
      
      // Unique sessions
      prisma.chatbotConversation.findMany({
        distinct: ['sessionId'],
        where: {
          createdAt: { gte: startDate }
        },
        select: { sessionId: true }
      }),
      
      // Top intents
      prisma.chatbotConversation.groupBy({
        by: ['intent'],
        _count: { intent: true },
        where: {
          intent: { not: null },
          createdAt: { gte: startDate }
        },
        orderBy: {
          _count: { intent: 'desc' }
        },
        take: 10
      }),
      
      // Conversations by day
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as conversations
        FROM chatbot_conversations 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // Response time distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN response_time < 1000 THEN 'Fast (<1s)'
            WHEN response_time < 3000 THEN 'Medium (1-3s)'
            WHEN response_time < 5000 THEN 'Slow (3-5s)'
            ELSE 'Very Slow (>5s)'
          END as speed_category,
          COUNT(*) as count
        FROM chatbot_conversations 
        WHERE response_time IS NOT NULL 
        AND created_at >= ${startDate}
        GROUP BY speed_category
      `
    ])

    // Process feedback stats
    const feedbackDistribution = feedbackStats.reduce((acc, stat) => {
      acc[stat.feedbackRating] = stat._count.feedbackRating
      return acc
    }, {} as Record<number, number>)

    // Calculate satisfaction rate (4-5 stars)
    const totalFeedback = feedbackStats.reduce((sum, stat) => sum + stat._count.feedbackRating, 0)
    const positiveFeedback = feedbackStats
      .filter(stat => stat.feedbackRating >= 4)
      .reduce((sum, stat) => sum + stat._count.feedbackRating, 0)
    
    const satisfactionRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0

    // Process top intents
    const intentStats = topIntents.map(intent => ({
      intent: intent.intent || 'Unknown',
      count: intent._count.intent,
      percentage: totalConversations > 0 ? (intent._count.intent / recentConversations) * 100 : 0
    }))

    return NextResponse.json({
      overview: {
        totalConversations,
        recentConversations,
        uniqueSessions: uniqueSessions.length,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        avgConfidence: Math.round((avgConfidence._avg.confidence || 0) * 100),
        satisfactionRate: Math.round(satisfactionRate * 100) / 100,
        totalFeedback
      },
      trends: {
        conversationsByDay,
        responseTimeDistribution,
        feedbackDistribution
      },
      insights: {
        topIntents: intentStats,
        avgConfidenceLevel: avgConfidence._avg.confidence ? 
          avgConfidence._avg.confidence > 0.8 ? 'High' :
          avgConfidence._avg.confidence > 0.6 ? 'Medium' : 'Low' : 'Unknown',
        responseTimeLevel: avgResponseTime._avg.responseTime ?
          avgResponseTime._avg.responseTime < 1000 ? 'Excellent' :
          avgResponseTime._avg.responseTime < 3000 ? 'Good' :
          avgResponseTime._avg.responseTime < 5000 ? 'Fair' : 'Poor' : 'Unknown'
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Chatbot Analytics Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
} 