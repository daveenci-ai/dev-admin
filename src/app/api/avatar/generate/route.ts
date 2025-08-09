import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import logger from '@/lib/logger'
import { ok, badRequest, notFound, serverError } from '@/lib/http'
import { getOpenAIClient, OpenAIModels } from '@/lib/openai'

const generateImageSchema = z.object({
  prompt: z.string().min(10).max(1000),
  avatarId: z.string(),
  loraScale: z.number().min(0).max(1).default(1.0),
  guidanceScale: z.number().min(1).max(20).default(2.0),
  numInferenceSteps: z.number().min(1).max(50).default(36),
  numImages: z.number().min(1).max(4).default(4),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21']).default('9:16'),
  outputFormat: z.enum(['webp', 'jpg', 'png']).default('jpg'),
  seed: z.number().optional(),
  safetyChecker: z.boolean().default(true),
  previewOnly: z.boolean().default(false).optional() // For getting optimized prompt only
})

async function optimizePromptWithOpenAI(
  originalPrompt: string, 
  triggerWord: string, 
  avatarDescription?: string, 
  aspectRatio: string = '1:1'
): Promise<{ option1: string, option2: string, option3: string }> {
  
  // Define composition guidelines based on aspect ratio
  const getCompositionGuidelines = (ratio: string) => {
    switch (ratio) {
      case '9:16': // Portrait
        return {
          focus: "Portrait (Vertical Orientation)",
          characteristics: "Tall and narrow, ideal for emphasizing height, subjects, and vertical elements",
          compositions: [
            "Full-Body Shot / Medium-Full Shot: Capture person from head to toe, emphasizing posture and presence",
            "Medium Portrait (Waist-Up): Show upper body and torso, professional and engaging composition", 
            "Environmental Portrait: Subject with enough vertical background for context without distraction"
          ]
        }
      case '16:9': // Landscape  
        return {
          focus: "Landscape (Horizontal Orientation)",
          characteristics: "Wide and horizontal, perfect for expansive scenes and conveying breadth",
          compositions: [
            "Wide Shot / Establishing Shot: Show full environment and setting for sense of place and scale",
            "Medium Shot (Multiple Elements): Accommodate side-by-side interactions and relationships",
            "Action Shot (Horizontal Movement): Emphasize movement across frame with leading room"
          ]
        }
      case '1:1': // Square
        return {
          focus: "Square (Equal Sides)",  
          characteristics: "Balanced and symmetrical, forcing central composition without horizontal/vertical bias",
          compositions: [
            "Central Composition / Medium Portrait: Draw attention to center with professional medium distance",
            "Abstract / Pattern Focus: Highlight textures, patterns, and balanced elements without horizon distractions", 
            "Overhead Shot (Top-Down): Create pleasingly geometric and balanced composition from above"
          ]
        }
      default:
        return getCompositionGuidelines('1:1')
    }
  }

  const guidelines = getCompositionGuidelines(aspectRatio)
  const avatarInfo = avatarDescription ? `\n- Avatar details: ${avatarDescription}` : ''

  const optimizationPrompt = `
You are an expert AI image prompt engineer specializing in FLUX-dev-lora model optimization.

INPUTS:
- Original prompt: "${originalPrompt}"
- Trigger word (MUST include): "${triggerWord}"${avatarInfo}
- Aspect ratio: ${aspectRatio} (${guidelines.focus})
- Composition focus: ${guidelines.characteristics}

TASK: Create 3 different photorealistic prompt variations, each focusing on a different composition approach:

COMPOSITION OPTIONS FOR ${guidelines.focus}:
1. ${guidelines.compositions[0]}
2. ${guidelines.compositions[1]} 
3. ${guidelines.compositions[2]}

REQUIREMENTS FOR ALL 3 PROMPTS:
- ALWAYS start with "Photorealistic image of"
- ALWAYS include the trigger word "${triggerWord}" naturally
- Each prompt should emphasize a different composition approach from the list above
- Incorporate avatar description details if provided
- Add professional photography terms (lighting, composition, quality)
- Keep each under 300 characters
- Focus on visual details, lighting, and professional composition
- Make suitable for high-quality avatar generation

IMPORTANT COMPOSITION RESTRICTIONS:
- NEVER use close-up shots, detailed close-ups, or tight facial shots
- AVOID extreme close-ups or intimate face-only compositions
- USE medium shots, medium portraits, full-body shots, or wide shots only
- FOCUS on professional medium-distance photography

RESPONSE FORMAT:
OPTION1: [First composition approach prompt]
OPTION2: [Second composition approach prompt]  
OPTION3: [Third composition approach prompt]

Return ONLY the three prompts in the exact format above, nothing else.
`

  try {
    logger.debug('Requesting 3 prompt options from OpenAI (chatgpt-5-nano) ...')
    const client = getOpenAIClient('AVATAR')
    const completion = await client.chat.completions.create({
      model: OpenAIModels.AVATAR_TEXT,
      messages: [{ role: 'user', content: optimizationPrompt }],
      temperature: 0.4,
    })
    const text = completion.choices?.[0]?.message?.content?.trim() || ''
    const lines = text.split('\n').filter((l) => l.trim())
    const option1 = lines.find((l) => l.startsWith('OPTION1:'))?.replace('OPTION1:', '').trim() || ''
    const option2 = lines.find((l) => l.startsWith('OPTION2:'))?.replace('OPTION2:', '').trim() || ''
    const option3 = lines.find((l) => l.startsWith('OPTION3:'))?.replace('OPTION3:', '').trim() || ''
    return { option1, option2, option3 }
  } catch (error: any) {
    logger.error('OpenAI prompt optimization failed:', error?.message || error)
    const add = avatarDescription ? `, ${avatarDescription}` : ''
    const basePrompt = `Photorealistic image of ${triggerWord}${add} ${originalPrompt}`
    return {
      option1: `${basePrompt}, medium portrait shot, professional photography, sharp focus, detailed lighting`,
      option2: `${basePrompt}, medium shot, cinematic composition, high quality, dramatic lighting`,
      option3: `${basePrompt}, wide angle view, environmental context, professional photography, balanced composition`,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = generateImageSchema.parse(body)

    // Get the selected avatar with description
    const avatar = await prisma.avatar.findUnique({
      where: { id: BigInt(validatedData.avatarId) }
    })

    if (!avatar) {
      return notFound('Avatar not found')
    }

    logger.info(validatedData.previewOnly ? 'Getting prompt optimization' : `Generating ${validatedData.numImages} images`, 'with avatar:', avatar.fullName)
    logger.debug('Trigger word:', avatar.triggerWord)
    logger.debug('Avatar description:', avatar.description || 'None')
    logger.debug('Original prompt:', validatedData.prompt)
    logger.debug('Replicate model URL:', avatar.replicateModelUrl)

    // Extract version ID from full Replicate URL
    // URL format: https://replicate.com/daveenci/astridwmn/versions/109fcb3d676fac1f2a4b45d126abf39f0b57bc42b1f04870f63679f61b0b6134
    const extractVersionId = (url: string): string => {
      const match = url.match(/\/versions\/([a-f0-9]+)/)
      if (match && match[1]) {
        return match[1]
      }
      // If it's already just a version ID, return as is
      if (/^[a-f0-9]{64}$/.test(url)) {
        return url
      }
      throw new Error(`Invalid Replicate model URL format: ${url}`)
    }

    const loraVersionId = extractVersionId(avatar.replicateModelUrl)
    logger.debug('Extracted LoRA version ID:', loraVersionId)

    // Step 1: Optimize prompt with OpenAI (chatgpt-5-nano)
    logger.info('Optimizing prompt with OpenAI (chatgpt-5-nano)...')
    const optimizedPrompts = await optimizePromptWithOpenAI(
      validatedData.prompt,
      avatar.triggerWord,
      avatar.description || undefined, // Convert null to undefined for TypeScript
      validatedData.aspectRatio
    )

    // If this is preview mode, just return the optimized prompts
    if (validatedData.previewOnly) {
      return ok({
        optimizedPrompts: optimizedPrompts,
        originalPrompt: validatedData.prompt,
        avatar: {
          id: avatar.id.toString(),
          name: avatar.fullName,
          triggerWord: avatar.triggerWord,
          description: avatar.description
        }
      })
    }

    // Step 2: Generate multiple images via Replicate
    const imageGenerations = []
    
    for (let i = 0; i < validatedData.numImages; i++) {
      logger.info(`Starting generation ${i + 1} of ${validatedData.numImages}`)

      // Prepare Replicate input with correct parameter names
      const input = {
        prompt: validatedData.prompt, // Use the user-selected prompt (original or optimized)
        lora_weights: loraVersionId, // Use extracted version ID, not full URL
        lora_scale: validatedData.loraScale,
        guidance_scale: validatedData.guidanceScale,
        num_inference_steps: validatedData.numInferenceSteps,
        aspect_ratio: validatedData.aspectRatio,
        output_format: validatedData.outputFormat,
        enable_safety_checker: validatedData.safetyChecker,
        ...(validatedData.seed && { seed: validatedData.seed + i }) // Increment seed for variety
      }

      logger.debug('Replicate input for image', i + 1, input)

      try {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: loraVersionId, // Use the version ID extracted from database
            input: input
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error('Replicate API error for image', i + 1, errorText)
          // Log error but still continue to try creating the database record
        } else {
          const prediction = await response.json()
          logger.info('Replicate prediction created:', i + 1, prediction.id)

          // Create record in existing avatars_generated table with placeholder
          const avatarGeneration = await prisma.avatarGenerated.create({
            data: {
              avatarId: BigInt(validatedData.avatarId),
              prompt: validatedData.prompt, // Use the user-selected prompt for record
              githubImageUrl: `PENDING_REVIEW:${prediction.id}`, // Temporary, will be updated with actual URL
            }
          })

          imageGenerations.push({
            id: avatarGeneration.id.toString(),
            replicateId: prediction.id,
            status: 'processing',
            prompt: validatedData.prompt, // Use the user-selected prompt for record
            avatarId: validatedData.avatarId,
            githubImageUrl: avatarGeneration.githubImageUrl,
            predictionId: prediction.id // Add this for polling
          })
        }

      } catch (error: any) {
        logger.error('Avatar generation error for image', i + 1, error)
        // Log error but continue with other generations
      }
    }

    // Return results
    return ok({
      message: `${imageGenerations.length} images started generating`,
      generations: imageGenerations,
      optimizedPrompt: optimizedPrompts, // Return the optimized prompts
      originalPrompt: validatedData.prompt,
      avatar: {
        id: avatar.id.toString(),
        name: avatar.fullName,
        triggerWord: avatar.triggerWord,
        description: avatar.description
      }
    })

  } catch (error: any) {
    logger.error('Avatar generation error:', error)
    
    if (error instanceof z.ZodError) {
      return badRequest('Invalid input data', error.issues)
    }
    
    return serverError('Internal server error', error.message)
  }
} 