'use client'

import { useState, useEffect } from 'react'
import { AvatarGenerationForm } from '@/components/avatar/AvatarGenerationForm'
import { AvatarGallery } from '@/components/avatar/AvatarGallery'
import { GenerationWorkflowModal } from '@/components/ui/modal'

type WorkflowStage = 'optimizing' | 'prompt-selection' | 'generating' | 'approval'

interface GenerationImage {
  id: string
  imageUrl: string
  approved?: boolean
}

export default function AvatarPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('optimizing')
  const [generationData, setGenerationData] = useState<any>(null)
  const [generatedImages, setGeneratedImages] = useState<GenerationImage[]>([])

  // Start the generation workflow
  const handleGenerate = async (data: any) => {
    console.log('🚀 Starting avatar generation workflow...')
    
    // Reset state and show modal
    setGenerationData(data)
    setWorkflowStage('optimizing')
    setShowWorkflowModal(true)
    setGeneratedImages([])

    try {
      // Step 1: Get optimized prompt
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, previewOnly: true }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Got optimized prompt:', result.optimizedPrompt)
        
        // Update generation data and move to prompt selection
        setGenerationData({
          ...data,
          optimizedPrompts: result.optimizedPrompts,
          originalPrompt: result.originalPrompt,
          avatar: result.avatar
        })
        setWorkflowStage('prompt-selection')
      } else {
        console.error('❌ Failed to optimize prompt')
        alert('Failed to optimize prompt. Please try again.')
        setShowWorkflowModal(false)
      }
    } catch (error: any) {
      console.error('❌ Error optimizing prompt:', error)
      alert(`Error optimizing prompt: ${error.message}`)
      setShowWorkflowModal(false)
    }
  }

  // Handle prompt choice and start image generation
  const handlePromptChoice = async (promptType: 'original' | 'option1' | 'option2' | 'option3') => {
    console.log('🎯 User chose prompt type:', promptType)
    
    setWorkflowStage('generating')

    try {
      let finalPrompt: string
      
      if (promptType === 'original') {
        finalPrompt = generationData.originalPrompt
      } else {
        finalPrompt = generationData.optimizedPrompts[promptType]
      }
      
      console.log('🎨 Using prompt:', finalPrompt)
      
      const requestData = { ...generationData, prompt: finalPrompt, previewOnly: false }
      
      // Clean up temporary fields
      delete requestData.optimizedPrompts
      delete requestData.originalPrompt
      delete requestData.avatar

      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Generation started:', result.generations?.length, 'images')
        
        // Start polling for image completion
        if (result.generations && result.generations.length > 0) {
          startPollingForImages(result.generations)
        }
      } else {
        console.error('❌ Failed to start generation')
        alert('Failed to start image generation. Please try again.')
        setShowWorkflowModal(false)
      }
    } catch (error: any) {
      console.error('❌ Error starting generation:', error)
      alert(`Error starting generation: ${error.message}`)
      setShowWorkflowModal(false)
    }
  }

  // Poll for image completion
  const startPollingForImages = async (generations: any[]) => {
    console.log('🔄 Starting to poll for image completion...')
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/avatar/poll-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generations }),
        })

        if (response.ok) {
          const result = await response.json()
          const completedImages = result.generations.filter((gen: any) => gen.status === 'completed')
          const stillProcessing = result.generations.filter((gen: any) => gen.status === 'processing')

          console.log(`📊 Status: ${completedImages.length} completed, ${stillProcessing.length} processing`)

          if (completedImages.length > 0) {
            // Instead of going to approval stage, automatically approve all images
            console.log('✅ Auto-approving all completed images...')
            
            const approvals = completedImages.map((gen: any) => ({
              id: gen.id,
              approved: true // Automatically approve all images
            }))
            
            await handleImageApprovals(approvals)
            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error('❌ Error polling status:', error)
        clearInterval(pollInterval)
      }
    }, 10000) // Poll every 10 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      console.log('⏰ Polling timeout - stopping')
    }, 600000)
  }

  // Handle final image approvals
  const handleImageApprovals = async (approvals: Array<{id: string, approved: boolean}>) => {
    console.log('✅ Processing image approvals:', approvals)

    try {
      const response = await fetch('/api/avatar/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvals }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Approvals processed:', result)
        
        const approvedCount = approvals.filter(a => a.approved).length
        const totalCount = approvals.length
        
        // Show success message
        if (approvedCount === totalCount) {
          alert(`🎉 All ${approvedCount} image${approvedCount !== 1 ? 's' : ''} generated successfully and added to gallery!`)
        } else {
          alert(`${approvedCount} of ${totalCount} image${totalCount !== 1 ? 's' : ''} approved and added to gallery!`)
        }
        
        // Close modal and refresh gallery
        setShowWorkflowModal(false)
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.error('❌ Failed to process approvals')
        alert('Failed to process image approvals. Please try again.')
      }
    } catch (error: any) {
      console.error('❌ Error processing approvals:', error)
      alert(`Error processing approvals: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/avatar/gallery`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        console.log('✅ Image deleted successfully')
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.error('❌ Failed to delete image')
      }
    } catch (error: any) {
      console.error('❌ Error deleting image:', error)
    }
  }

  if (typeof window === 'undefined') {
    return <div>Loading...</div>
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Control Panel - Fixed Width Left Side */}
      <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white">
        <div className="h-full overflow-y-auto p-6">
          <AvatarGenerationForm 
            onGenerate={handleGenerate} 
            isGenerating={showWorkflowModal && workflowStage !== 'prompt-selection'} 
          />
        </div>
      </div>

      {/* Gallery - Flexible Right Side */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <AvatarGallery refreshTrigger={refreshTrigger} onDelete={handleDelete} />
        </div>
      </div>

      {/* Enhanced Generation Workflow Modal */}
      {generationData && (
        <GenerationWorkflowModal
          isOpen={showWorkflowModal}
          onClose={() => setShowWorkflowModal(false)}
          originalPrompt={generationData.originalPrompt || generationData.prompt}
          optimizedPrompts={generationData.optimizedPrompts}
          avatarName={generationData.avatar?.name || 'Unknown'}
          numImages={generationData.numImages || 1}
          stage={workflowStage}
          images={generatedImages}
          onPromptChoice={handlePromptChoice}
          onImageApprovals={handleImageApprovals}
        />
      )}
    </div>
  )
}
