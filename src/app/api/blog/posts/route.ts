import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const blogPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  tags: z.string().optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  isFeatured: z.boolean().optional().default(false),
  readTimeMinutes: z.number().optional(),
  llmPrompt: z.string().optional()
})

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Helper function to calculate read time
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const featured = searchParams.get('featured')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (featured === 'true') {
      where.isFeatured = true
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          status: true,
          isFeatured: true,
          viewCount: true,
          readTimeMinutes: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          featuredImageUrl: true,
          tags: true
        }
      }),
      prisma.blogPost.count({ where })
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Blog Posts GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = blogPostSchema.parse(body)

    // Generate slug if not provided
    let slug = validatedData.slug || generateSlug(validatedData.title)
    
    // Ensure slug is unique
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug }
    })

    if (existingPost) {
      slug = `${slug}-${Date.now()}`
    }

    // Calculate read time
    const readTimeMinutes = calculateReadTime(validatedData.content)

    // Set publishedAt if status is published
    const publishedAt = validatedData.status === 'published' ? new Date() : null

    const post = await prisma.blogPost.create({
      data: {
        ...validatedData,
        slug,
        readTimeMinutes,
        publishedAt,
        featuredImageUrl: validatedData.featuredImageUrl || null
      }
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Blog Posts POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    )
  }
} 