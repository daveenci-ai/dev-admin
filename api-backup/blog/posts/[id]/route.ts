import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const blogPostUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  tags: z.string().optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  isFeatured: z.boolean().optional(),
  readTimeMinutes: z.number().optional(),
  llmPrompt: z.string().optional()
})

// Helper function to calculate read time
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id)
    
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      )
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Blog Post GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id)
    
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = blogPostUpdateSchema.parse(body)

    // Check if post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id: postId }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // If slug is being updated, check for duplicates
    if (validatedData.slug && validatedData.slug !== existingPost.slug) {
      const slugExists = await prisma.blogPost.findFirst({
        where: {
          slug: validatedData.slug,
          id: { not: postId }
        }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Calculate read time if content is being updated
    let readTimeMinutes = validatedData.readTimeMinutes
    if (validatedData.content) {
      readTimeMinutes = calculateReadTime(validatedData.content)
    }

    // Update publishedAt if status is being changed to published
    let publishedAt = existingPost.publishedAt
    if (validatedData.status === 'published' && existingPost.status !== 'published') {
      publishedAt = new Date()
    }

    const updatedPost = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        ...validatedData,
        readTimeMinutes,
        publishedAt,
        featuredImageUrl: validatedData.featuredImageUrl || existingPost.featuredImageUrl,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedPost)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Blog Post PUT Error:', error)
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id)
    
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      )
    }

    // Check if post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id: postId }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    await prisma.blogPost.delete({
      where: { id: postId }
    })

    return NextResponse.json({ message: 'Blog post deleted successfully' })
  } catch (error) {
    console.error('Blog Post DELETE Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    )
  }
} 