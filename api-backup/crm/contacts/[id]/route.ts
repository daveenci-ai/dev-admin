import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const contactUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  primaryEmail: z.string().email().optional(),
  secondaryEmail: z.string().email().optional().or(z.literal('')),
  primaryPhone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['PROSPECT', 'LEAD', 'OPPORTUNITY', 'CLIENT', 'CHURNED', 'DECLINED', 'UNQUALIFIED']).optional(),
  sentiment: z.enum(['GOOD', 'NEUTRAL', 'BAD']).optional(),
  leadScore: z.number().min(0).max(1).optional(),
  opportunityScore: z.number().min(0).max(1).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = parseInt(params.id)
    
    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        touchpoints: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('CRM Contact GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = parseInt(params.id)
    
    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = contactUpdateSchema.parse(body)

    // Check if contact exists
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // If email is being updated, check for duplicates
    if (validatedData.primaryEmail && validatedData.primaryEmail !== existingContact.primaryEmail) {
      const emailExists = await prisma.contact.findFirst({
        where: {
          primaryEmail: validatedData.primaryEmail,
          id: { not: contactId }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Contact with this email already exists' },
          { status: 400 }
        )
      }
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...validatedData,
        secondaryEmail: validatedData.secondaryEmail || null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedContact)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('CRM Contact PUT Error:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = parseInt(params.id)
    
    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      )
    }

    // Check if contact exists
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    await prisma.contact.delete({
      where: { id: contactId }
    })

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('CRM Contact DELETE Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
} 