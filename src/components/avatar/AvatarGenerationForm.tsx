'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Loader2, Settings, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react'

interface AvatarGenerationFormProps {
  onGenerate: (data: GenerationData) => void
  isGenerating: boolean
}

export interface GenerationData {
  prompt: string
  avatarId: string
  loraScale: number
  guidanceScale: number
  numInferenceSteps: number
  numImages: number
  aspectRatio: string
  outputFormat: string
  seed?: number
  safetyChecker: boolean
}

interface Avatar {
  id: string
  fullName: string
  triggerWord: string
  description?: string
  replicateModelUrl: string
}

export function AvatarGenerationForm({ onGenerate, isGenerating }: AvatarGenerationFormProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [loadingAvatars, setLoadingAvatars] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formData, setFormData] = useState<GenerationData>({
    prompt: '',
    avatarId: '',
    loraScale: 1.0,
    guidanceScale: 2.0,
    numInferenceSteps: 36,
    numImages: 4,
    aspectRatio: '9:16',
    outputFormat: 'jpg',
    seed: undefined,
    safetyChecker: true
  })

  const [useRandomSeed, setUseRandomSeed] = useState(true)

  // Fetch available avatars
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch('/api/avatar')
        const data = await response.json()
        setAvatars(data.avatars || [])
      } catch (error) {
        console.error('Error fetching avatars:', error)
      } finally {
        setLoadingAvatars(false)
      }
    }

    fetchAvatars()
  }, [])

  const handleSubmit = (e: any) => {
    e.preventDefault()
    
    if (!formData.avatarId) {
      alert('Please select an avatar first')
      return
    }
    
    const finalData = {
      ...formData,
      seed: useRandomSeed ? undefined : formData.seed
    }
    
    onGenerate(finalData)
  }

  const selectedAvatar = avatars.find((avatar: any) => avatar.id === formData.avatarId)

  const aspectRatios = [
    { value: '1:1', label: 'Square (1:1)' },
    { value: '16:9', label: 'Landscape (16:9)' },
    { value: '9:16', label: 'Portrait (9:16)' },
    { value: '4:3', label: 'Standard (4:3)' },
    { value: '3:4', label: 'Portrait (3:4)' },
    { value: '21:9', label: 'Ultrawide (21:9)' },
    { value: '9:21', label: 'Ultra Portrait (9:21)' }
  ]

  const outputFormats = [
    { value: 'webp', label: 'WebP' },
    { value: 'jpg', label: 'JPEG' },
    { value: 'png', label: 'PNG' }
  ]

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Avatar */}
        <div className="space-y-2">
          <Label htmlFor="avatar">Select Avatar</Label>
          {loadingAvatars ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading avatars...
            </div>
          ) : (
            <select
              value={formData.avatarId}
              onChange={(e) => setFormData(prev => ({ ...prev, avatarId: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <option value="">Choose an avatar to generate with</option>
              {avatars.map((avatar: any) => (
                <option key={avatar.id} value={avatar.id}>
                  {avatar.fullName} (Trigger: {avatar.triggerWord})
                </option>
              ))}
            </select>
          )}
          {selectedAvatar && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Selected:</strong> {selectedAvatar.fullName} | 
              <strong> Trigger:</strong> {selectedAvatar.triggerWord}
              {selectedAvatar.description && (
                <>
                  <br />
                  <strong>Description:</strong> {selectedAvatar.description}
                </>
              )}
            </div>
          )}
        </div>

        {/* Enter Your Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Enter Your Prompt</Label>
          <Textarea
            placeholder={selectedAvatar ? 
              `Describe your image. The trigger word "${selectedAvatar.triggerWord}" will be automatically added if not included.` :
              "Select an avatar first, then describe your image..."
            }
            value={formData.prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
            className="min-h-[100px]"
            disabled={!formData.avatarId}
            required
          />
        </div>

        {/* Number of Images */}
        <div className="space-y-2">
          <Label>Number of Images: {formData.numImages}</Label>
          <Slider
            value={[formData.numImages]}
            onValueChange={(value) => setFormData(prev => ({ ...prev, numImages: value[0] }))}
            min={1}
            max={4}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Number of images to generate (1-4)
          </p>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <select
            value={formData.aspectRatio}
            onChange={(e) => setFormData(prev => ({ ...prev, aspectRatio: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {aspectRatios.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </select>
        </div>

        {/* Collapsible Advanced Settings */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Settings className="h-4 w-4" />
            Advanced Settings
          </button>

          {showAdvanced && (
            <Card className="mt-3">
              <CardContent className="pt-6 space-y-4">
                {/* LoRA Scale */}
                <div className="space-y-2">
                  <Label>LoRA Scale: {formData.loraScale}</Label>
                  <Slider
                    value={[formData.loraScale]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, loraScale: value[0] }))}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Controls the strength of the LoRA model (0.0 = base model, 1.0 = full LoRA effect)
                  </p>
                </div>

                {/* Guidance Scale */}
                <div className="space-y-2">
                  <Label>Guidance Scale: {formData.guidanceScale}</Label>
                  <Slider
                    value={[formData.guidanceScale]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, guidanceScale: value[0] }))}
                    min={1}
                    max={20}
                    step={0.5}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    How closely to follow the prompt (1-20, higher = more adherence to prompt)
                  </p>
                </div>

                {/* Inference Steps */}
                <div className="space-y-2">
                  <Label>Inference Steps: {formData.numInferenceSteps}</Label>
                  <Slider
                    value={[formData.numInferenceSteps]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, numInferenceSteps: value[0] }))}
                    min={1}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Number of denoising steps (1-50, higher = better quality but slower)
                  </p>
                </div>

                {/* Output Format */}
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <select
                    value={formData.outputFormat}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputFormat: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {outputFormats.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seed Controls */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={useRandomSeed}
                      onCheckedChange={setUseRandomSeed}
                    />
                    <Label>Use Random Seed</Label>
                  </div>
                  
                  {!useRandomSeed && (
                    <div className="space-y-2">
                      <Label>Seed</Label>
                      <Input
                        type="number"
                        value={formData.seed || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          seed: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="Enter a number for reproducible results"
                      />
                    </div>
                  )}
                </div>

                {/* Safety Checker */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.safetyChecker}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, safetyChecker: checked }))}
                    />
                    <Label>Enable Safety Checker</Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Automatically filters potentially inappropriate content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Generate Button */}
        <Button 
          type="submit" 
          disabled={isGenerating || !formData.avatarId || formData.prompt.trim().length < 10}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Generate Avatar
            </>
          )}
        </Button>
      </form>
    </div>
  )
} 