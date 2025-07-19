'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Loader2, Wand2, Settings, Palette, Image as ImageIcon } from 'lucide-react'

interface AvatarGenerationFormProps {
  onGenerate: (data: GenerationData) => void
  isGenerating: boolean
}

export interface GenerationData {
  prompt: string
  loraRepository: string
  loraScale: number
  guidanceScale: number
  inferenceSteps: number
  aspectRatio: string
  outputFormat: string
  seed?: number
  enableSafetyChecker: boolean
}

export function AvatarGenerationForm({ onGenerate, isGenerating }: AvatarGenerationFormProps) {
  const [formData, setFormData] = useState<GenerationData>({
    prompt: '',
    loraRepository: '',
    loraScale: 0.8,
    guidanceScale: 7.5,
    inferenceSteps: 20,
    aspectRatio: '1:1',
    outputFormat: 'webp',
    seed: undefined,
    enableSafetyChecker: true
  })

  const [useRandomSeed, setUseRandomSeed] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalData = {
      ...formData,
      seed: useRandomSeed ? undefined : formData.seed
    }
    
    onGenerate(finalData)
  }

  const aspectRatios = [
    { value: '1:1', label: 'Square (1:1)' },
    { value: '16:9', label: 'Landscape (16:9)' },
    { value: '9:16', label: 'Portrait (9:16)' },
    { value: '4:3', label: 'Classic (4:3)' },
    { value: '3:4', label: 'Portrait (3:4)' },
    { value: '21:9', label: 'Ultra Wide (21:9)' },
    { value: '9:21', label: 'Ultra Tall (9:21)' }
  ]

  const outputFormats = [
    { value: 'webp', label: 'WebP (Recommended)' },
    { value: 'jpg', label: 'JPEG' },
    { value: 'png', label: 'PNG' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Basic Settings
          </CardTitle>
          <CardDescription>
            Configure your avatar generation with prompt and LoRA repository
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Describe the avatar you want to generate..."
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about style, mood, and visual elements
            </p>
          </div>

          <div>
            <Label htmlFor="loraRepository">LoRA Repository *</Label>
            <Input
              id="loraRepository"
              value={formData.loraRepository}
              onChange={(e) => setFormData(prev => ({ ...prev, loraRepository: e.target.value }))}
              placeholder="username/repository-name"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              HuggingFace repository containing your LoRA weights
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Parameters
          </CardTitle>
          <CardDescription>
            Fine-tune the generation process for optimal results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>LoRA Scale: {formData.loraScale}</Label>
            <Slider
              value={[formData.loraScale]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, loraScale: value }))}
              min={0}
              max={1}
              step={0.1}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Strength of your custom LoRA weights (0.0 - 1.0)
            </p>
          </div>

          <div>
            <Label>Guidance Scale: {formData.guidanceScale}</Label>
            <Slider
              value={[formData.guidanceScale]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, guidanceScale: value }))}
              min={1}
              max={20}
              step={0.5}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              How closely to follow the prompt (7.5 recommended)
            </p>
          </div>

          <div>
            <Label>Inference Steps: {formData.inferenceSteps}</Label>
            <Slider
              value={[formData.inferenceSteps]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, inferenceSteps: value }))}
              min={1}
              max={50}
              step={1}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Quality vs speed tradeoff (20 recommended)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Output Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Output Settings
          </CardTitle>
          <CardDescription>
            Configure the output image format and dimensions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aspectRatio">Aspect Ratio</Label>
              <Select
                value={formData.aspectRatio}
                onValueChange={(value) => setFormData(prev => ({ ...prev, aspectRatio: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatios.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="outputFormat">Output Format</Label>
              <Select
                value={formData.outputFormat}
                onValueChange={(value) => setFormData(prev => ({ ...prev, outputFormat: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outputFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="randomSeed"
                checked={useRandomSeed}
                onCheckedChange={setUseRandomSeed}
              />
              <Label htmlFor="randomSeed">Use Random Seed</Label>
            </div>

            {!useRandomSeed && (
              <div>
                <Label htmlFor="seed">Seed</Label>
                <Input
                  id="seed"
                  type="number"
                  value={formData.seed || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    seed: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Enter a specific seed..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use the same seed to reproduce results
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="safetyChecker"
                checked={formData.enableSafetyChecker}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableSafetyChecker: checked }))}
              />
              <Label htmlFor="safetyChecker">Enable Safety Checker</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button 
        type="submit" 
        disabled={isGenerating || !formData.prompt || !formData.loraRepository}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Avatar...
          </>
        ) : (
          <>
            <Palette className="mr-2 h-4 w-4" />
            Generate Avatar
          </>
        )}
      </Button>
    </form>
  )
} 