import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ImageData {
  data: Buffer;
  contentType: string;
}

export async function extractBusinessCardData(imageData: ImageData) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are an expert OCR and research assistant trained to extract data from business cards and deliver concise, actionable insights to support AI, automation, and digital‐marketing outreach for Daveenci.ai.

Instructions:

1. Output Format  
   - Return exactly one valid JSON object, with no extra explanation or text.

2. Contact Data Extraction  
   - Extract all contact fields (emails, phones, social links, website, address).  
   - If a field is missing, set it to null.  
   - Infer the website URL from the email’s domain when absent.

3. Research Phase  
   - Use full_name, company_name, website_url, and any public social links to quickly surface:  
     • Company overview (industry, size/scale, location)  
     • Core offerings or unique selling points  
     • Recent news or notable initiatives (if available)

4. Opportunity Generation (Highly Customized)  
   - You know Daveenci.ai provides AI‑driven automation, CRM integration, and digital‑marketing solutions.  
   - For each new contact, produce **three** bullet‑point “opportunities” that:  
     a) Reference the contact’s specific industry and business model.  
     b) Tie directly to Daveenci.ai’s strengths (e.g., AI‑powered lead scoring, automated campaign orchestration, CRM system build‑outs, data‑driven content personalization).  
     c) Indicate a clear value or outcome (e.g., “boost lead conversion by X%,” “reduce manual data entry,” “deepen customer engagement”).  
   - Use a leading emoji for each bullet (e.g., “🤖”, “📈”, “🔗”).

5. JSON Structure:

json
{
  "contact_data": {
    "full_name": "Randy Miller",
    "primary_email": "Randy.Miller@vistagechair.com",
    "secondary_email": null,
    "primary_phone": "+1 (512) 203-7701",
    "secondary_phone": null,
    "company_name": "Vistage",
    "industry": "Executive Coaching & Peer Advisory",
    "full_address": "8302 La Plata Loop, Austin, TX 78737, USA",
    "website_url": "vistage.com",
    "linkedin_url": "linkedin.com/company/vistage",
    "twitter_url": null,
    "facebook_url": null,
    "instagram_url": null,
    "youtube_url": null,
    "tiktok_url": null,
    "pinterest_url": null
  },
  "research_insights": {
    "about_person": "👤 Randy Miller is a Vistage Chair in Austin, TX, guiding senior executives through peer advisory groups and strategic coaching.",
    "opportunities": [
      "🤖 Deploy AI‑driven cohort segmentation to match executives with peers sharing similar challenges, boosting group cohesion and attendee satisfaction by 20%.",
      "📈 Automate targeted digital campaigns highlighting Vistage’s success stories to attract new executive members, increasing qualified leads by 30%.",
      "🔗 Integrate a custom CRM workflow to streamline member onboarding, track session outcomes, and reduce manual admin work by 50%."
    ]
  }
}`;

    const imagePart = {
      inlineData: {
        data: imageData.data.toString('base64'),
        mimeType: imageData.contentType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'No JSON found in Gemini response' };
    }

    const extracted = JSON.parse(jsonMatch[0]);
    if (!extracted.contact_data) {
        return { success: false, error: 'Missing contact_data in response' };
    }

    const contactData = extracted.contact_data;
    const cleanedData = {
        name: contactData.full_name || "Unknown Person",
        company: contactData.company_name || "Unknown Company",
        industry: contactData.industry || "Unknown Industry",
        primary_email: (contactData.primary_email || "").toLowerCase().trim(),
        secondary_email: contactData.secondary_email ? contactData.secondary_email.toLowerCase().trim() : null,
        primary_phone: contactData.primary_phone || null,
        secondary_phone: contactData.secondary_phone || null,
        website: contactData.website_url || null,
        address: contactData.full_address || null,
        linkedin_url: contactData.linkedin_url || null,
        twitter_url: contactData.twitter_url || null,
        facebook_url: contactData.facebook_url || null,
        instagram_url: contactData.instagram_url || null,
        youtube_url: contactData.youtube_url || null,
        tiktok_url: contactData.tiktok_url || null,
        pinterest_url: contactData.pinterest_url || null,
    };

    // Basic validation
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!cleanedData.primary_email || !emailRegex.test(cleanedData.primary_email)) {
        cleanedData.primary_email = "invalid@email.com"; // Mark as invalid
    }
     if (cleanedData.website && !cleanedData.website.startsWith('http')) {
      cleanedData.website = 'https://' + cleanedData.website;
    }


    const researchInsights = extracted.research_insights || {};

    return {
      success: true,
      data: cleanedData,
      research: researchInsights,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function validateExtractedData(data: any) {
  const errors = [];
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  if (!data.name || data.name === "Unknown Person") errors.push('Name is required.');
  if (!data.primary_email || !emailRegex.test(data.primary_email)) errors.push('A valid primary email is required.');
  
  if (data.website) {
    data.website = data.website.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
} 