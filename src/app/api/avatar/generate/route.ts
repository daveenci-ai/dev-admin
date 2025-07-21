import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

async function optimizePromptWithGemini(
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
            "Close-Up (Face/Upper Body): Intimate shots highlighting facial expressions and upper body details", 
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
            "Central Composition / Isolated Subject: Draw attention to center, prominently place main subject",
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

RESPONSE FORMAT:
OPTION1: [First composition approach prompt]
OPTION2: [Second composition approach prompt]  
OPTION3: [Third composition approach prompt]

Return ONLY the three prompts in the exact format above, nothing else.
`

  // Try Gemini 2.5 Pro first
  try {
    console.log(`🤖 Trying Gemini 2.5 Pro for 3 prompt options...`)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
    
    const result = await model.generateContent(optimizationPrompt)
    const response = await result.response
    const text = response.text().trim()

    // Parse the 3 options from response
    const lines = text.split('\n').filter(line => line.trim())
    const option1 = lines.find(line => line.startsWith('OPTION1:'))?.replace('OPTION1:', '').trim() || ''
    const option2 = lines.find(line => line.startsWith('OPTION2:'))?.replace('OPTION2:', '').trim() || ''
    const option3 = lines.find(line => line.startsWith('OPTION3:'))?.replace('OPTION3:', '').trim() || ''

    console.log(`✅ Gemini 2.5 Pro generated 3 prompt options`)
    return { option1, option2, option3 }

  } catch (error: any) {
    console.warn(`⚠️ Gemini 2.5 Pro failed: ${error.message || error}`)
    
    // Fallback to Gemini 2.5 Flash
    try {
      console.log(`🔄 Falling back to Gemini 2.5 Flash...`)
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
      
      const result = await fallbackModel.generateContent(optimizationPrompt)
      const response = await result.response
      const text = response.text().trim()

      // Parse the 3 options from response
      const lines = text.split('\n').filter(line => line.trim())
      const option1 = lines.find(line => line.startsWith('OPTION1:'))?.replace('OPTION1:', '').trim() || ''
      const option2 = lines.find(line => line.startsWith('OPTION2:'))?.replace('OPTION2:', '').trim() || ''
      const option3 = lines.find(line => line.startsWith('OPTION3:'))?.replace('OPTION3:', '').trim() || ''

      console.log(`✅ Gemini 2.5 Flash generated 3 prompt options`)
      return { option1, option2, option3 }

    } catch (fallbackError: any) {
      console.error(`❌ Both Gemini models failed. Pro: ${error.message}, Flash: ${fallbackError.message}`)
      
      // Final fallback: create 3 manual variations
      const avatarInfo = avatarDescription ? `, ${avatarDescription}` : ''
      const basePrompt = `Photorealistic image of ${triggerWord}${avatarInfo} ${originalPrompt}`
      
      return {
        option1: `${basePrompt}, close-up portrait, professional photography, sharp focus, detailed lighting`,
        option2: `${basePrompt}, medium shot, cinematic composition, high quality, dramatic lighting`, 
        option3: `${basePrompt}, wide angle view, environmental context, professional photography, balanced composition`
      }
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
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    console.log(`🎨 ${validatedData.previewOnly ? 'Getting prompt optimization' : `Generating ${validatedData.numImages} images`} with avatar: "${avatar.fullName}"`)
    console.log(`🎯 Trigger word: ${avatar.triggerWord}`)
    console.log(`📝 Avatar description: ${avatar.description || 'None'}`)
    console.log(`📝 Original prompt: "${validatedData.prompt}"`)
    console.log(`🔗 Replicate model URL: ${avatar.replicateModelUrl}`)

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
    console.log(`📦 Extracted LoRA version ID: ${loraVersionId}`)

    // Step 1: Always optimize prompt with Gemini AI (tiered approach)
    console.log(`🤖 Optimizing prompt with Gemini AI (2.5 Pro → 2.5 Flash fallback)...`)
    const optimizedPrompts = await optimizePromptWithGemini(
      validatedData.prompt,
      avatar.triggerWord,
      avatar.description || undefined, // Convert null to undefined for TypeScript
      validatedData.aspectRatio
    )

    // If this is preview mode, just return the optimized prompts
    if (validatedData.previewOnly) {
      return NextResponse.json({
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
      console.log(`🎨 Starting generation ${i + 1} of ${validatedData.numImages}`)

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

      console.log(`📋 Replicate input for image ${i + 1}:`, JSON.stringify(input, null, 2))

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
          console.error(`❌ Replicate API error for image ${i + 1}:`, errorText)
          // Log error but still continue to try creating the database record
        } else {
          const prediction = await response.json()
          console.log(`✅ Replicate prediction ${i + 1} created:`, prediction.id)

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
        console.error(`❌ Avatar generation error for image ${i + 1}:`, error)
        // Log error but continue with other generations
      }
    }

    // Return results
    return NextResponse.json({
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
    console.error('❌ Avatar generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 