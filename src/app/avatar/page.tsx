'use client'

import { useState, useEffect } from 'react'
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading avatars...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Avatar Generator</h1>
          <p className="text-gray-600">AI-powered avatar generation with GitHub integration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Form */}
          <div>
            <AvatarGenerationForm 
              onGenerate={handleGenerate}
              isGenerating={loading}
            />
          </div>

          {/* Gallery */}
          <div>
            <AvatarGallery 
              refreshTrigger={refreshTrigger}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
