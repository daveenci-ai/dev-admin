import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const generateAvatarSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  loraRepository: z.string().min(1, 'LoRA repository is required'),
  loraScale: z.number().min(0).max(1).default(0.8),
  guidanceScale: z.number().min(1).max(20).default(7.5),
  inferenceSteps: z.number().min(1).max(50).default(20),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21']).default('1:1'),
  outputFormat: z.enum(['webp', 'jpg', 'png']).default('webp'),
  seed: z.number().optional(),
  enableSafetyChecker: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = generateAvatarSchema.parse(body)

    const replicateToken = process.env.REPLICATE_API_TOKEN
    if (!replicateToken) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      )
    }

    // Create avatar generation record
    const avatarGeneration = await prisma.avatarGeneration.create({
      data: {
        prompt: validatedData.prompt,
        loraRepository: validatedData.loraRepository,
        loraScale: validatedData.loraScale,
        guidanceScale: validatedData.guidanceScale,
        inferenceSteps: validatedData.inferenceSteps,
        aspectRatio: validatedData.aspectRatio,
        outputFormat: validatedData.outputFormat,
        seed: validatedData.seed,
        enableSafetyChecker: validatedData.enableSafetyChecker,
        status: 'pending'
      }
    })

    // Prepare Replicate API request
    const replicateInput = {
      prompt: validatedData.prompt,
      lora: validatedData.loraRepository,
      lora_scale: validatedData.loraScale,
      guidance_scale: validatedData.guidanceScale,
      num_inference_steps: validatedData.inferenceSteps,
      aspect_ratio: validatedData.aspectRatio,
      output_format: validatedData.outputFormat,
      enable_safety_checker: validatedData.enableSafetyChecker,
      ...(validatedData.seed && { seed: validatedData.seed })
    }

    console.log('Sending request to Replicate:', replicateInput)

    // Make request to Replicate API
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'dev', // FLUX-dev-lora version
        input: replicateInput
      })
    })

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text()
      console.error('Replicate API error:', errorText)
      
      // Update record with error
      await prisma.avatarGeneration.update({
        where: { id: avatarGeneration.id },
        data: { 
          status: 'failed',
          errorMessage: `Replicate API error: ${replicateResponse.status} - ${errorText}`
        }
      })

      return NextResponse.json(
        { error: 'Failed to start image generation' },
        { status: 500 }
      )
    }

    const prediction = await replicateResponse.json()
    console.log('Replicate prediction created:', prediction)

    // Update record with prediction ID
    const updatedGeneration = await prisma.avatarGeneration.update({
      where: { id: avatarGeneration.id },
      data: {
        replicatePredictionId: prediction.id,
        status: 'processing'
      }
    })

    return NextResponse.json({
      id: updatedGeneration.id,
      predictionId: prediction.id,
      status: 'processing',
      message: 'Avatar generation started successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Avatar generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate avatar' },
      { status: 500 }
    )
  }
} 