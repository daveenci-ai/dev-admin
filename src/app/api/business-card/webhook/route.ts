import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '@/lib/db';
import { extractBusinessCardData, validateExtractedData } from '@/lib/ai';
import { sendTelegramNotification, sendTelegramError } from '@/lib/telegram';
import logger from '@/lib/logger';

// Type definitions for business card extraction results
interface ExtractionSuccess {
    success: true;
    data: any;
    research: any;
}

interface ExtractionError {
    success: false;
    error: string;
}

type ExtractionResult = ExtractionSuccess | ExtractionError;

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
            select: {
                createdAt: true,
                source: true,
                addedBy: true,
            },
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
    // Skip business card processing in development environment
    if (process.env.NODE_ENV === 'development') {
        logger.info('[WEBHOOK] Business card processing disabled in development environment');
        return NextResponse.json({ 
            message: 'Business card processing is disabled in development environment',
            environment: process.env.NODE_ENV 
        }, { status: 200 });
    }

    let imagePath = '';
    try {
        logger.info('[WEBHOOK] Business card webhook received. Starting process...');
        
        const signature = req.headers.get('x-hub-signature-256');
        const eventType = req.headers.get('x-github-event');
        const secret = process.env.GITHUB_WEBHOOK_SECRET;

        logger.debug('[WEBHOOK] Event Type:', eventType);
        logger.debug('[WEBHOOK] Signature received:', !!signature);
        logger.debug('[WEBHOOK] Webhook secret configured:', !!secret);

        // Get the raw body as text to prevent Next.js from auto-parsing
        const bodyText = await req.text();

        if (!secret || !signature) {
            logger.error('[WEBHOOK] Validation failed: Missing webhook secret or signature.');
            return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 401 });
        }
        
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(bodyText).digest('hex');

        logger.debug('[WEBHOOK] Calculated Digest:', digest);
        logger.debug('[WEBHOOK] Received Signature:', signature);

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
            logger.error('[WEBHOOK] Validation failed: Invalid signature.');
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }
        
        logger.info('[WEBHOOK] Signature validated successfully.');

        // Handle both JSON and URL-encoded form payloads
        let payload;
        try {
            if (bodyText.startsWith('payload=')) {
                logger.debug('[WEBHOOK] Detected URL-encoded form payload. Parsing...');
                const urlParams = new URLSearchParams(bodyText);
                const payloadJson = urlParams.get('payload');
                if (!payloadJson) {
                    throw new Error('Payload parameter is empty in form data.');
                }
                payload = JSON.parse(payloadJson);
            } else {
                logger.debug('[WEBHOOK] Detected JSON payload. Parsing...');
                payload = JSON.parse(bodyText);
            }
        } catch (error: any) {
            logger.error('[WEBHOOK] Failed to parse payload:', error.message);
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }
        
        if (eventType !== 'push' || payload.ref !== 'refs/heads/main') {
            logger.info('[WEBHOOK] Ignoring event: Not a push to main branch. Ref:', payload.ref);
            return NextResponse.json({ message: 'Ignoring event: Not a push to main' }, { status: 200 });
        }

        const addedFiles = payload.commits.flatMap((c: any) => c.added || []).filter((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
        logger.info('[WEBHOOK] Found image files:', addedFiles.length);

        if (addedFiles.length === 0) {
            logger.info('[WEBHOOK] No new images to process in this push.');
            return NextResponse.json({ message: 'No new images to process' }, { status: 200 });
        }

        imagePath = addedFiles[0];
        logger.info('[WEBHOOK] Processing image:', imagePath);

        const imageData = await fetchImageFromGitHub(imagePath);
        logger.debug('[WEBHOOK] Fetched image data from GitHub bytes:', imageData.data.length);

        const extracted = await extractBusinessCardData(imageData);

        if (!extracted.success) {
            const errorMessage = 'error' in extracted ? extracted.error : 'Unknown extraction error';
            logger.error('[WEBHOOK] Data extraction failed:', errorMessage);
            await sendTelegramError(`Failed to extract data: ${errorMessage}`, extractPersonFromImagePath(imagePath));
            return NextResponse.json({ error: 'Data extraction failed', details: errorMessage }, { status: 400 });
        }
        logger.info('[WEBHOOK] Data extraction successful.');

        // At this point, we know extracted.success is true, so we can safely cast
        const successResult = extracted as ExtractionSuccess;
        const extractedData = successResult.data;
        const extractedResearch = successResult.research;

        const validation = validateExtractedData(extractedData);
        if (!validation.valid) {
            logger.error('[WEBHOOK] Data validation failed:', validation.errors.join(', '));
            await sendTelegramError(`Invalid data extracted: ${validation.errors.join(', ')}`, extractPersonFromImagePath(imagePath));
            return NextResponse.json({ error: 'Data validation failed', details: validation.errors }, { status: 400 });
        }
        logger.info('[WEBHOOK] Data validation successful.');
        
        const researchData = {
            success: !!extractedResearch,
            telegramMessage: extractedResearch?.opportunities?.join('\n\n') || 'Research could not be completed.',
        };

        logger.info('[WEBHOOK] Starting database operations...');
        const dbResult = await handleDatabaseOperations(extractedData, extractedResearch, imagePath);
        logger.info('[WEBHOOK] Database operations complete. New contact:', dbResult.isNewContact);

        if (extractedData) {
            logger.info('[WEBHOOK] Sending Telegram notification...');
            await sendTelegramNotification(extractedData, researchData, dbResult, imagePath);
            logger.info('[WEBHOOK] Telegram notification sent.');
        }

        logger.info('[WEBHOOK] Process completed successfully!');
        return NextResponse.json({ success: true, isNewContact: dbResult.isNewContact, contactId: dbResult.contactId });

    } catch (error: any) {
        logger.error('[WEBHOOK] An unexpected error occurred in the pipeline:', error);
        await sendTelegramError(`Pipeline Error: ${error.message}`, extractPersonFromImagePath(imagePath));
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
} 