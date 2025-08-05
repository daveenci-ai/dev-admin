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
        console.log('🚀 [WEBHOOK] Business card webhook received. Starting process...');
        
        const signature = req.headers.get('x-hub-signature-256');
        const eventType = req.headers.get('x-github-event');
        const secret = process.env.GITHUB_WEBHOOK_SECRET;

        console.log(`[WEBHOOK] Event Type: ${eventType}`);
        console.log(`[WEBHOOK] Signature received: ${signature ? 'Yes' : 'No'}`);
        console.log(`[WEBHOOK] Webhook secret configured: ${secret ? 'Yes' : 'No'}`);

        const bodyBuffer = await req.clone().arrayBuffer();

        if (!secret || !signature) {
            console.error('❌ [WEBHOOK] Validation failed: Missing webhook secret or signature.');
            return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 401 });
        }
        
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(Buffer.from(bodyBuffer)).digest('hex');

        console.log(`[WEBHOOK] Calculated Digest: ${digest}`);
        console.log(`[WEBHOOK] Received Signature: ${signature}`);

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
            console.error('❌ [WEBHOOK] Validation failed: Invalid signature.');
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }
        
        console.log('✅ [WEBHOOK] Signature validated successfully.');

        const payload = await req.json();
        
        if (eventType !== 'push' || payload.ref !== 'refs/heads/main') {
            console.log(`[WEBHOOK] Ignoring event: Not a push to main branch. (Ref: ${payload.ref})`);
            return NextResponse.json({ message: 'Ignoring event: Not a push to main' }, { status: 200 });
        }

        const addedFiles = payload.commits.flatMap((c: any) => c.added || []).filter((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
        console.log(`[WEBHOOK] Found ${addedFiles.length} new image file(s):`, addedFiles);

        if (addedFiles.length === 0) {
            console.log('[WEBHOOK] No new images to process in this push.');
            return NextResponse.json({ message: 'No new images to process' }, { status: 200 });
        }

        imagePath = addedFiles[0];
        console.log(`[WEBHOOK] Processing image: ${imagePath}`);

        const imageData = await fetchImageFromGitHub(imagePath);
        console.log(`[WEBHOOK] Fetched image data from GitHub (${imageData.data.length} bytes).`);

        const extracted = await extractBusinessCardData(imageData);

        if (!extracted.success) {
            console.error(`❌ [WEBHOOK] Data extraction failed: ${extracted.error}`);
            await sendTelegramError(`Failed to extract data: ${extracted.error}`, extractPersonFromImagePath(imagePath));
            return NextResponse.json({ error: 'Data extraction failed', details: extracted.error }, { status: 400 });
        }
        console.log('✅ [WEBHOOK] Data extraction successful.');

        const validation = validateExtractedData(extracted.data);
        if (!validation.valid) {
            console.error(`❌ [WEBHOOK] Data validation failed: ${validation.errors.join(', ')}`);
            await sendTelegramError(`Invalid data extracted: ${validation.errors.join(', ')}`, extractPersonFromImagePath(imagePath));
            return NextResponse.json({ error: 'Data validation failed', details: validation.errors }, { status: 400 });
        }
        console.log('✅ [WEBHOOK] Data validation successful.');
        
        const researchData = {
            success: !!extracted.research,
            telegramMessage: extracted.research?.opportunities?.join('\n\n') || 'Research could not be completed.',
        };

        console.log('[WEBHOOK] Starting database operations...');
        const dbResult = await handleDatabaseOperations(extracted.data, extracted.research, imagePath);
        console.log(`✅ [WEBHOOK] Database operations complete. New contact: ${dbResult.isNewContact}`);

        if (extracted.data) {
            console.log('[WEBHOOK] Sending Telegram notification...');
            await sendTelegramNotification(extracted.data, researchData, dbResult, imagePath);
            console.log('✅ [WEBHOOK] Telegram notification sent.');
        }

        console.log('🎉 [WEBHOOK] Process completed successfully!');
        return NextResponse.json({ success: true, isNewContact: dbResult.isNewContact, contactId: dbResult.contactId });

    } catch (error: any) {
        console.error('❌ [WEBHOOK] An unexpected error occurred in the pipeline:', error);
        await sendTelegramError(`Pipeline Error: ${error.message}`, extractPersonFromImagePath(imagePath));
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
} 