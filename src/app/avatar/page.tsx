'use client'

import React, { useState, useEffect } from 'react'
import { AvatarGenerationForm } from '@/components/avatar/AvatarGenerationForm'
import { AvatarGallery } from '@/components/avatar/AvatarGallery'
import { PromptComparisonModal } from '@/components/ui/modal'

export default function AvatarPage() {
  const [avatars, setAvatars] = useState([])
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeGenerations, setActiveGenerations] = useState<any[]>([])
  
  // Modal state for prompt comparison
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [pendingGeneration, setPendingGeneration] = useState<any>(null)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/avatar/gallery')
      const data = await response.json()
      setAvatars(data.avatars || [])
      setGenerations(data.generations || [])
    } catch (error) {
      console.error('Error fetching avatar data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGenerationComplete = () => {
    fetchData() // Refresh data after generation
  }

  // Step 1: Get optimized prompt and show modal
  const handleGenerate = async (data: any) => {
    try {
      console.log('🚀 Getting optimized prompt for:', data)
      
      // First call to get the optimized prompt only (preview mode)
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          previewOnly: true // Only get optimized prompt, don't generate images yet
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Got optimization result:', result)
        
        // Store the generation data and show modal
        setPendingGeneration({
          ...data,
          optimizedPrompt: result.optimizedPrompt,
          originalPrompt: result.originalPrompt,
          avatar: result.avatar
        })
        setShowPromptModal(true)
        
      } else {
        const errorData = await response.text()
        console.error('❌ Optimization failed:', errorData)
        alert('Failed to optimize prompt. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error getting optimization:', error)
      alert('Network error. Please try again.')
    }
  }

  // Step 2: Proceed with actual generation based on user choice
  const handlePromptChoice = async (useOptimized: boolean) => {
    setShowPromptModal(false)
    
    if (!pendingGeneration) return
    
    try {
      // Use either original or optimized prompt
      const finalPrompt = useOptimized ? pendingGeneration.optimizedPrompt : pendingGeneration.originalPrompt
      
      console.log(`🎨 Proceeding with ${useOptimized ? 'optimized' : 'original'} prompt:`, finalPrompt)
      
      // Create the final generation request with the chosen prompt
      const generationData = {
        ...pendingGeneration,
        prompt: finalPrompt,
        previewOnly: false // This time we want actual generation
      }
      
      // Remove the avatar object from the request (it's just for display)
      delete generationData.optimizedPrompt
      delete generationData.originalPrompt
      delete generationData.avatar
      
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Final generation started:', result)
        
        // Track active generations for progress monitoring
        setActiveGenerations(result.generations || [])
        
        // Show success message
        const generationCount = result.generations?.length || 0
        console.log(`🎉 Started generating ${generationCount} images!`)
        
        // Trigger refresh to show new generations
        setRefreshTrigger(prev => prev + 1)
        
      } else {
        const errorData = await response.text()
        console.error('❌ Final generation failed:', errorData)
        alert('Generation failed. Please check the console for details.')
      }
    } catch (error) {
      console.error('❌ Error in final generation:', error)
      alert('Network error. Please try again.')
    } finally {
      setPendingGeneration(null)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/avatar/status/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        console.log('✅ Generation deleted:', id)
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.error('❌ Delete failed:', await response.text())
      }
    } catch (error) {
      console.error('❌ Error deleting generation:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading avatars...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Control Panel - Fixed Width Left Side */}
      <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white">
        <div className="h-full overflow-y-auto p-6">
          <AvatarGenerationForm 
            onGenerate={handleGenerate}
            isGenerating={activeGenerations.length > 0}
          />
        </div>
      </div>

      {/* Gallery - Flexible Right Side */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <AvatarGallery 
            refreshTrigger={refreshTrigger}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Prompt Comparison Modal */}
      {pendingGeneration && (
        <PromptComparisonModal
          isOpen={showPromptModal}
          onClose={() => {
            setShowPromptModal(false)
            setPendingGeneration(null)
          }}
          originalPrompt={pendingGeneration.originalPrompt}
          optimizedPrompt={pendingGeneration.optimizedPrompt}
          avatarName={pendingGeneration.avatar?.name || 'Unknown'}
          numImages={pendingGeneration.numImages || 1}
          onProceed={handlePromptChoice}
        />
      )}
    </div>
  )
}
