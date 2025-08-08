import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET individual contact by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = parseInt(params.id)
    
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        touchpoints: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
  }
}

// PUT update contact by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = parseInt(params.id)
    const data = await request.json()

    // Remove fields that shouldn't be updated directly
    const { id, createdAt, updatedAt, touchpoints, ...updateData } = data

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        touchpoints: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return NextResponse.json(updatedContact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
} 

// DELETE contact by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = parseInt(params.id)
    await prisma.touchpoint.deleteMany({ where: { contactId } })
    await prisma.avatar.updateMany({ where: { contactId }, data: { contactId: null } })
    await prisma.contact.delete({ where: { id: contactId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}