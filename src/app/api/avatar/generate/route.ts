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

// Initialize Gemini AI with tiered model approach
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

async function optimizePromptWithGemini(
  originalPrompt: string, 
  triggerWord: string, 
  avatarDescription: string | null,
  aspectRatio: string
): Promise<string> {
  // Determine photorealism based on aspect ratio
  const isPortraitAspect = ['9:16', '3:4', '9:21'].includes(aspectRatio)
  const photorealismInstruction = isPortraitAspect ? 
    "Include close-up or medium shot composition for professional portrait quality." : 
    "Focus on composition and scene setting appropriate for the aspect ratio."

  const avatarInfo = avatarDescription ? `\n- Avatar details: ${avatarDescription}` : ''

  const optimizationPrompt = `
You are an expert AI image prompt engineer specializing in FLUX-dev-lora model optimization.

INPUTS:
- Original prompt: "${originalPrompt}"
- Trigger word (MUST include): "${triggerWord}"${avatarInfo}
- Aspect ratio: ${aspectRatio}

REQUIREMENTS:
1. ALWAYS include the trigger word "${triggerWord}" naturally in the prompt
2. Incorporate avatar description details if provided to enhance authenticity  
3. Enhance the prompt for photorealism and professional quality
4. ${photorealismInstruction}
5. Add professional photography terms (lighting, composition, quality)
6. Keep it detailed but under 300 characters for optimal processing
7. Focus on visual details, lighting, and professional composition
8. Make it suitable for high-quality avatar generation

EXAMPLE STRUCTURE:
"${triggerWord} [avatar_description_elements] ${originalPrompt}, professional photography, high quality, detailed lighting, sharp focus, [composition_terms]"

Return ONLY the optimized prompt text, nothing else.
`

  // Try Gemini 2.0 Flash (Experimental) first - highest quality
  try {
    console.log(`🤖 Trying Gemini 2.0 Flash (Experimental)...`)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
    
    const result = await model.generateContent(optimizationPrompt)
    const response = await result.response
    const optimizedPrompt = response.text().trim()

    console.log(`✅ Gemini 2.0 Flash optimized prompt: "${optimizedPrompt}"`)
    return optimizedPrompt

  } catch (error: any) {
    console.warn(`⚠️ Gemini 2.0 Flash failed: ${error.message || error}`)
    
    // Fallback to Gemini 1.5 Flash - more stable
    try {
      console.log(`🔄 Falling back to Gemini 1.5 Flash...`)
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      
      const result = await fallbackModel.generateContent(optimizationPrompt)
      const response = await result.response
      const optimizedPrompt = response.text().trim()

      console.log(`✅ Gemini 1.5 Flash optimized prompt: "${optimizedPrompt}"`)
      return optimizedPrompt

    } catch (fallbackError: any) {
      console.error(`❌ Both Gemini models failed. 2.0: ${error.message}, 1.5: ${fallbackError.message}`)
      
      // Final fallback: enhanced manual prompt
      const avatarInfo = avatarDescription ? `, ${avatarDescription}` : ''
      const manualPrompt = `${triggerWord}${avatarInfo} ${originalPrompt}, professional photography, high quality, detailed lighting, sharp focus, cinematic composition`
      console.log(`🔧 Using enhanced manual fallback: "${manualPrompt}"`)
      return manualPrompt
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

    // Step 1: Always optimize prompt with Gemini AI (tiered approach)
    console.log(`🤖 Optimizing prompt with Gemini AI (2.0 Flash → 1.5 Flash fallback)...`)
    const optimizedPrompt = await optimizePromptWithGemini(
      validatedData.prompt,
      avatar.triggerWord,
      avatar.description,
      validatedData.aspectRatio
    )

    // If this is preview mode, just return the optimized prompt
    if (validatedData.previewOnly) {
      return NextResponse.json({
        optimizedPrompt: optimizedPrompt,
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
      console.log(`🖼️  Starting generation ${i + 1}/${validatedData.numImages}`)
      
      // Prepare Replicate input with correct parameter names
      const input = {
        prompt: optimizedPrompt,
        lora_weights: avatar.replicateModelUrl,
        lora_scale: validatedData.loraScale,
        guidance_scale: validatedData.guidanceScale,
        num_inference_steps: validatedData.numInferenceSteps,
        aspect_ratio: validatedData.aspectRatio,
        output_format: validatedData.outputFormat,
        enable_safety_checker: validatedData.safetyChecker,
        ...(validatedData.seed && { seed: validatedData.seed + i }) // Increment seed for variety
      }

      console.log(`📋 Replicate input for image ${i + 1}:`, JSON.stringify(input, null, 2))

      // Call Replicate API
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: process.env.REPLICATE_MODEL_VERSION || 'black-forest-labs/flux-dev-lora',
          input: input
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Replicate API error for image ${i + 1}:`, response.status, errorText)
        continue // Skip this image and continue with others
      }

      const prediction = await response.json()
      
      // Create generation record in database for tracking
      const generationRecord = await prisma.avatarGeneration.create({
        data: {
          prompt: optimizedPrompt,
          loraRepository: avatar.fullName,
          loraScale: validatedData.loraScale,
          guidanceScale: validatedData.guidanceScale,
          numInferenceSteps: validatedData.numInferenceSteps,
          aspectRatio: validatedData.aspectRatio,
          outputFormat: validatedData.outputFormat,
          safetyChecker: validatedData.safetyChecker,
          seed: validatedData.seed ? validatedData.seed + i : null,
          status: 'processing',
          replicateId: prediction.id,
          imageUrl: null // Will be updated when complete
        }
      })

      imageGenerations.push({
        id: generationRecord.id,
        replicateId: prediction.id,
        status: 'processing'
      })

      console.log(`✅ Generation ${i + 1} started with ID: ${generationRecord.id}`)
    }

    // Return results
    return NextResponse.json({
      message: `${imageGenerations.length} images started generating`,
      generations: imageGenerations,
      optimizedPrompt: optimizedPrompt,
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