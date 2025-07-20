import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const generateImageSchema = z.object({
  prompt: z.string().min(3).max(1000),
  avatarId: z.string(),
  loraScale: z.number().min(0).max(1).default(0.8),
  guidanceScale: z.number().min(1).max(20).default(7.5),
  numInferenceSteps: z.number().min(1).max(50).default(20),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21']).default('1:1'),
  outputFormat: z.enum(['webp', 'jpg', 'png']).default('webp'),
  seed: z.number().optional(),
  safetyChecker: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = generateImageSchema.parse(body)

    // Get the selected avatar
    const avatar = await prisma.avatar.findUnique({
      where: { id: BigInt(validatedData.avatarId) }
    })

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    console.log(`🎨 Generating image with avatar: "${avatar.fullName}"`)
    console.log(`📦 Using Replicate model: ${avatar.replicateModelUrl}`)
    console.log(`🎯 Trigger word: ${avatar.triggerWord}`)

    // Enhance prompt with trigger word if not already included
    let enhancedPrompt = validatedData.prompt
    if (!validatedData.prompt.toLowerCase().includes(avatar.triggerWord.toLowerCase())) {
      enhancedPrompt = `${avatar.triggerWord} ${validatedData.prompt}`
    }

    // Call Replicate API
    const input = {
      prompt: enhancedPrompt,
      lora_weights: avatar.replicateModelUrl,
      lora_scale: validatedData.loraScale,
      guidance_scale: validatedData.guidanceScale,
      num_inference_steps: validatedData.numInferenceSteps,
      aspect_ratio: validatedData.aspectRatio,
      output_format: validatedData.outputFormat,
      enable_safety_checker: validatedData.safetyChecker,
      ...(validatedData.seed && { seed: validatedData.seed })
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: process.env.REPLICATE_MODEL_VERSION,
        input: input
      })
    })

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`)
    }

    const prediction = await response.json()

    // For now, we'll just return the prediction ID and let the client poll for status
    // When it completes, we'll create the avatars_generated record
    return NextResponse.json({
      predictionId: prediction.id,
      status: 'processing',
      message: 'Image generation started'
    })

  } catch (error: any) {
    console.error('Avatar generation error:', error)
    
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