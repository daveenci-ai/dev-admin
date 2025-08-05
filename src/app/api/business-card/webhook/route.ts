import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '@/lib/db';
import { extractBusinessCardData, validateExtractedData } from '@/lib/gemini';
import { sendTelegramNotification, sendTelegramError } from '@/lib/telegram';

async function handleDatabaseOperations(contactData: any, research: any, imagePath: string) {
    const addedBy = extractPersonFromImagePath(imagePath);
    const user = await prisma.user.findFirst({ where: { name: 'Admin' } });
    if (!user) throw new Error('Admin user not found in database.');

    const existingContact = await prisma.contact.findFirst({
        where: { primaryEmail: { equals: contactData.primary_email, mode: 'insensitive' } },
    });

    let opportunitiesNote = `Contact added via business card scan on ${new Date().toLocaleDateString()}`;
    if (research.research?.opportunities) {
        opportunitiesNote = Array.isArray(research.research.opportunities)
            ? research.research.opportunities.join('\n\n')
            : research.research.opportunities;
    }

    if (!existingContact) {
        const newContact = await prisma.contact.create({
            data: {
                name: contactData.name,
                company: contactData.company,
                industry: contactData.industry,
                primaryEmail: contactData.primary_email,
                secondaryEmail: contactData.secondary_email,
                primaryPhone: contactData.primary_phone,
                secondaryPhone: contactData.secondary_phone,
                website: contactData.website,
                address: contactData.address,
                source: 'Business Card',
                status: 'PROSPECT',
                userId: user.id,
                notes: opportunitiesNote,
                linkedinUrl: contactData.linkedin_url,
                facebookUrl: contactData.facebook_url,
                instagramUrl: contactData.instagram_url,
                youtubeUrl: contactData.youtube_url,
                tiktokUrl: contactData.tiktok_url,
            },
        });

        await prisma.touchpoint.create({
            data: {
                contactId: newContact.id,
                note: `New contact added - business card exchanged by ${addedBy || 'Unknown'}`,
                source: 'IN_PERSON',
                addedBy: addedBy,
            },
        });
        return { success: true, isNewContact: true, contactId: newContact.id };
    } else {
        await prisma.touchpoint.create({
            data: {
                contactId: existingContact.id,
                note: `Met in person - business card exchanged by ${addedBy || 'Unknown'}`,
                source: 'IN_PERSON',
                addedBy: addedBy,
            },
        });
        const touchpoints = await prisma.touchpoint.findMany({
            where: { contactId: existingContact.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        return { success: true, isNewContact: false, contactId: existingContact.id, touchpointHistory: touchpoints, contactNotes: existingContact.notes };
    }
}

function extractPersonFromImagePath(imagePath: string): string | null {
  try {
    const filename = imagePath.split('/').pop()?.split('.')[0];
    const match = filename?.match(/_([A-Za-z]+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function fetchImageFromGitHub(imagePath: string) {
    const repo = process.env.GITHUB_REPO_BUSINESS_CARDS || 'daveenci-ai/daveenci-ai-crm-business-card-images';
    const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${imagePath}`;
    const response = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 30000 });
    return {
        data: response.data,
        contentType: response.headers['content-type'],
    };
}


export async function POST(req: NextRequest) {
    let imagePath = '';
    try {
        const signature = req.headers.get('x-hub-signature-256');
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        const bodyBuffer = await req.clone().arrayBuffer();

        if (!secret || !signature) {
            return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 401 });
        }
        
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(Buffer.from(bodyBuffer)).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }

        const payload = await req.json();
        
        if (req.headers.get('x-github-event') !== 'push' || payload.ref !== 'refs/heads/main') {
            return NextResponse.json({ message: 'Ignoring event: Not a push to main' }, { status: 200 });
        }

        const addedFiles = payload.commits.flatMap((c: any) => c.added || []).filter((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
        if (addedFiles.length === 0) {
            return NextResponse.json({ message: 'No new images to process' }, { status: 200 });
        }

        imagePath = addedFiles[0];
        const imageData = await fetchImageFromGitHub(imagePath);
        const extracted = await extractBusinessCardData(imageData);

        if (!extracted.success) {
            await sendTelegramError(`Failed to extract data: ${extracted.error}`, extractPersonFromImagePath(imagePath));
            return NextResponse.json({ error: 'Data extraction failed', details: extracted.error }, { status: 400 });
        }

        const validation = validateExtractedData(extracted.data);
        if (!validation.valid) {
            await sendTelegramError(`Invalid data extracted: ${validation.errors.join(', ')}`, extractPersonFromImagePath(imagePath));
            return NextResponse.json({ error: 'Data validation failed', details: validation.errors }, { status: 400 });
        }
        
        const researchData = {
            success: !!extracted.research,
            telegramMessage: extracted.research?.opportunities?.join('\n\n') || 'Research could not be completed.',
        };

        const dbResult = await handleDatabaseOperations(extracted.data, extracted.research, imagePath);
        
        if (extracted.data) {
            await sendTelegramNotification(extracted.data, researchData, dbResult, imagePath);
        }

        return NextResponse.json({ success: true, isNewContact: dbResult.isNewContact, contactId: dbResult.contactId });

    } catch (error: any) {
        console.error('❌ Business Card Pipeline Error:', error);
        await sendTelegramError(`Pipeline Error: ${error.message}`, extractPersonFromImagePath(imagePath));
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
} 