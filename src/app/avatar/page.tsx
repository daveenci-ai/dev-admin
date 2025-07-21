'use client'

import React, { useState, useEffect } from 'react'
import { AvatarGenerationForm } from '@/components/avatar/AvatarGenerationForm'
import { AvatarGallery } from '@/components/avatar/AvatarGallery'

export default function AvatarPage() {
  const [avatars, setAvatars] = useState([])
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Generation started:', result)
        // Trigger refresh
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.error('Generation failed:', await response.text())
      }
    } catch (error) {
      console.error('Error starting generation:', error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/avatar/status/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        console.log('Generation deleted:', id)
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.error('Delete failed:', await response.text())
      }
    } catch (error) {
      console.error('Error deleting generation:', error)
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
            isGenerating={loading}
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
