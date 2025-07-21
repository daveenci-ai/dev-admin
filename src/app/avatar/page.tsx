'use client'

import React, { useState, useEffect } from 'react'
import { AvatarGenerationForm } from '@/components/avatar/AvatarGenerationForm'
import { AvatarGallery } from '@/components/avatar/AvatarGallery'

export default function AvatarPage() {
  const [avatars, setAvatars] = useState([])
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeGenerations, setActiveGenerations] = useState<any[]>([])

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

  const handleGenerate = async (data: any) => {
    try {
      console.log('🚀 Starting avatar generation with data:', data)
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Generation response:', result)
        
        // Track active generations for progress monitoring
        setActiveGenerations(result.generations || [])
        
        // Show success message with optimized prompt
        alert(`🎨 Generating ${result.generations?.length || 1} images!\n\n` +
              `Original: "${result.originalPrompt}"\n\n` +
              `Optimized: "${result.optimizedPrompt}"`)
        
        // Trigger refresh to show new generations
        setRefreshTrigger(prev => prev + 1)
      } else {
        const errorData = await response.text()
        console.error('❌ Generation failed:', errorData)
        alert('Generation failed. Please check the console for details.')
      }
    } catch (error) {
      console.error('❌ Error starting generation:', error)
      alert('Network error. Please try again.')
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
    </div>
  )
}
