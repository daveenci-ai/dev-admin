'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { AvatarGenerationForm, GenerationData } from '@/components/avatar/AvatarGenerationForm'
import { AvatarGallery } from '@/components/avatar/AvatarGallery'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Image as ImageIcon, 
  Zap, 
  Clock, 
  XCircle, 
  TrendingUp,
  Sparkles,
  Gallery,
  Settings
} from 'lucide-react'

interface AvatarStats {
  totalGenerations: number
  completedGenerations: number
  processingGenerations: number
  failedGenerations: number
  recentGenerations: number
  successRate: number
}

export default function AvatarPage() {
  const [stats, setStats] = useState<AvatarStats>({
    totalGenerations: 0,
    completedGenerations: 0,
    processingGenerations: 0,
    failedGenerations: 0,
    recentGenerations: 0,
    successRate: 0
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState('generate')

  useEffect(() => {
    fetchStats()
  }, [refreshTrigger])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/avatar/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch avatar stats:', error)
    }
  }

  const handleGenerate = async (formData: GenerationData) => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Generation started:', result)
        
        // Refresh stats and gallery
        setRefreshTrigger(prev => prev + 1)
        
        // Switch to gallery tab to see the new generation
        setActiveTab('gallery')
        
        // Poll for completion (optional - you could also implement real-time updates)
        if (result.id) {
          pollForCompletion(result.id)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to start avatar generation')
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to start avatar generation')
    } finally {
      setIsGenerating(false)
    }
  }

  const pollForCompletion = async (generationId: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/avatar/status/${generationId}`)
        const status = await response.json()
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval)
          setRefreshTrigger(prev => prev + 1)
        }
      } catch (error) {
        console.error('Polling error:', error)
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this avatar generation?')) {
      return
    }

    try {
      const response = await fetch(`/api/avatar/gallery?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRefreshTrigger(prev => prev + 1)
      } else {
        alert('Failed to delete avatar generation')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete avatar generation')
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Avatar Generator</h1>
          <p className="text-gray-600 mt-2">
            Create stunning AI avatars using FLUX-dev-lora with custom LoRA weights
          </p>
        </div>

        {/* Avatar Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Generations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGenerations}</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3" />
                <span>All time</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedGenerations}</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Sparkles className="h-3 w-3" />
                <span>{stats.successRate}% success rate</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processingGenerations}</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>In progress</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Recent (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentGenerations}</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Zap className="h-3 w-3" />
                <span>Last 24 hours</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Generate Avatar
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Gallery className="h-4 w-4" />
              Gallery ({stats.totalGenerations})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Create New Avatar
                </CardTitle>
                <CardDescription>
                  Configure your avatar generation parameters and start creating
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarGenerationForm 
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">💡 Pro Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800 space-y-2">
                <ul className="space-y-1 text-sm">
                  <li>• Use specific, descriptive prompts for better results</li>
                  <li>• LoRA scale of 0.7-0.9 typically works best</li>
                  <li>• Higher inference steps = better quality but slower generation</li>
                  <li>• Enable safety checker to filter inappropriate content</li>
                  <li>• Try different aspect ratios for varied compositions</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <AvatarGallery 
              refreshTrigger={refreshTrigger}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  )
} 