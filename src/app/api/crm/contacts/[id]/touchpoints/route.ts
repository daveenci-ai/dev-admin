import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Add new touchpoint to contact
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contactId = parseInt(params.id)
    const { note } = await request.json()

    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 })
    }

    // Verify contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Create touchpoint with addedBy field
    const touchpoint = await prisma.touchpoint.create({
      data: {
        note: note.trim(),
        contactId,
        source: 'MANUAL',
        addedBy: session.user.email
      }
    })

    return NextResponse.json(touchpoint, { status: 201 })
  } catch (error) {
    console.error('Error creating touchpoint:', error)
    return NextResponse.json({ error: 'Failed to create touchpoint' }, { status: 500 })
  }
} 