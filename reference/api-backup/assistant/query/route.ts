import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const querySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  context: z.string().optional()
})

// Helper to convert natural language to SQL using Gemini
async function convertToSQL(naturalQuery: string, context?: string): Promise<{ sql: string; explanation: string }> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const databaseSchema = `
    Database Schema:
    
    1. contacts (CRM)
       - id, name, email, phone, company, status, source, notes, created_at, updated_at
    
    2. blog_posts (Blog)
       - id, title, slug, content, excerpt, status, is_featured, view_count, created_at, published_at
    
    3. avatar_generations (Avatar)
       - id, prompt, lora_repository, status, image_url, confidence, created_at
    
    4. chatbot_conversations (Chatbot)
       - id, session_id, user_message, bot_response, intent, confidence, response_time, feedback_rating, created_at
  `

  const prompt = `
    You are a SQL expert assistant. Convert natural language questions to PostgreSQL queries.
    
    ${databaseSchema}
    
    User Question: "${naturalQuery}"
    ${context ? `Context: ${context}` : ''}
    
    Rules:
    1. Return ONLY valid PostgreSQL SQL
    2. Use appropriate JOINs when needed
    3. Include LIMIT clauses for large datasets (max 100 rows)
    4. Use proper column names from schema
    5. For counts/aggregations, be specific
    6. Handle dates appropriately (created_at, updated_at, etc.)
    
    Response format:
    SQL: [your sql query]
    EXPLANATION: [brief explanation of what the query does]
  `

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedText = data.candidates[0]?.content?.parts[0]?.text || ''
    
    // Parse the response to extract SQL and explanation
    const sqlMatch = generatedText.match(/SQL:\s*(.+?)(?:\n|EXPLANATION|$)/s)
    const explanationMatch = generatedText.match(/EXPLANATION:\s*(.+?)$/s)
    
    const sql = sqlMatch ? sqlMatch[1].trim() : ''
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'Query generated'
    
    if (!sql) {
      throw new Error('Failed to generate SQL query')
    }

    return { sql, explanation }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to process natural language query')
  }
}

// Helper to execute safe read-only queries
async function executeSafeQuery(sql: string) {
  // Security check - only allow SELECT statements
  const trimmedSQL = sql.trim().toLowerCase()
  if (!trimmedSQL.startsWith('select')) {
    throw new Error('Only SELECT queries are allowed for security reasons')
  }

  // Prevent dangerous operations
  const dangerousPatterns = [
    /drop\s+/i,
    /delete\s+/i,
    /update\s+/i,
    /insert\s+/i,
    /alter\s+/i,
    /create\s+/i,
    /truncate\s+/i,
    /--/,
    /;.*select/i,
    /union.*select/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      throw new Error('Query contains potentially dangerous operations')
    }
  }

  try {
    // Execute raw query with Prisma
    const result = await prisma.$queryRawUnsafe(sql)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw new Error('Failed to execute database query')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, context } = querySchema.parse(body)

    console.log('Processing natural language query:', query)

    // Convert natural language to SQL using Gemini
    const { sql, explanation } = await convertToSQL(query, context)
    
    console.log('Generated SQL:', sql)

    // Execute the query safely
    const results = await executeSafeQuery(sql)

    // Log the query for analytics
    await prisma.assistantQuery.create({
      data: {
        naturalQuery: query,
        generatedSQL: sql,
        explanation,
        resultCount: Array.isArray(results) ? results.length : 1,
        status: 'success',
        context: context || null
      }
    }).catch(err => console.error('Failed to log query:', err))

    return NextResponse.json({
      query,
      sql,
      explanation,
      results,
      resultCount: Array.isArray(results) ? results.length : 1,
      executedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Assistant query error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process query'
    
    // Log failed query
    try {
      const body = await request.json()
      await prisma.assistantQuery.create({
        data: {
          naturalQuery: body.query || 'Unknown',
          generatedSQL: null,
          explanation: null,
          resultCount: 0,
          status: 'failed',
          errorMessage,
          context: body.context || null
        }
      }).catch(err => console.error('Failed to log failed query:', err))
    } catch {}

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    const [queries, total] = await Promise.all([
      prisma.assistantQuery.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          naturalQuery: true,
          generatedSQL: true,
          explanation: true,
          resultCount: true,
          status: true,
          errorMessage: true,
          createdAt: true
        }
      }),
      prisma.assistantQuery.count()
    ])

    return NextResponse.json({
      queries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Assistant queries GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch query history' },
      { status: 500 }
    )
  }
} 