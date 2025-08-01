'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { X, Loader2, Check, Trash2 } from 'lucide-react'
import { Button } from './button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={cn(
        "relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-xl",
        className
      )}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>
  )
}

// Original prompt comparison modal (keep for backwards compatibility)
interface PromptComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  originalPrompt: string
  optimizedPrompt?: string
  avatarName: string
  numImages: number
  onProceed: (useOptimized: boolean) => void
  isLoading?: boolean
}

export function PromptComparisonModal({ 
  isOpen, 
  onClose, 
  originalPrompt, 
  optimizedPrompt, 
  avatarName, 
  numImages, 
  onProceed,
  isLoading = false
}: PromptComparisonModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            🎨 Choose Your Prompt Version
          </h2>
          <p className="text-gray-600">
            AI {isLoading ? 'is optimizing' : 'has optimized'} your prompt for better results. 
            Choose which version to use for generating {numImages} image{numImages > 1 ? 's' : ''} with <strong>{avatarName}</strong>.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Original Prompt */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">📝 Your Original Prompt</span>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">"{originalPrompt}"</p>
          </div>

          {/* Optimized Prompt or Loading State */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-700">🤖 AI Optimized Prompt</span>
              {!isLoading && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  Recommended
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="space-y-1">
                  <p className="text-blue-800 text-sm font-medium">Optimizing your prompt...</p>
                  <p className="text-blue-600 text-xs">
                    AI is analyzing trigger words, lighting, and composition for better results
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-blue-800 text-sm leading-relaxed">"{optimizedPrompt}"</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => onProceed(false)} 
            className="flex-1"
            disabled={isLoading}
          >
            Use Original
          </Button>
          <Button 
            onClick={() => onProceed(true)} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              'Use AI Optimized'
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          💡 AI optimization includes trigger words, lighting terms, and professional photography settings for better results.
        </p>
      </div>
    </Modal>
  )
}

// New enhanced generation workflow modal
type WorkflowStage = 'optimizing' | 'prompt-selection' | 'generating' | 'approval'

interface GenerationImage {
  id: string
  imageUrl: string
  approved?: boolean
}

interface GenerationWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  originalPrompt: string
  optimizedPrompts?: { option1: string, option2: string, option3: string }
  avatarName: string
  numImages: number
  aspectRatio?: string
  stage: WorkflowStage
  images?: GenerationImage[]
  onPromptChoice: (promptType: 'original' | 'option1' | 'option2' | 'option3') => void
  onImageApprovals: (approvals: Array<{id: string, approved: boolean}>) => void
  isGenerating?: boolean
}

export function GenerationWorkflowModal({
  isOpen,
  onClose,
  originalPrompt,
  optimizedPrompts,
  avatarName,
  numImages,
  aspectRatio = '1:1',
  stage,
  images = [],
  onPromptChoice,
  onImageApprovals,
  isGenerating = false
}: GenerationWorkflowModalProps) {
  const [imageApprovals, setImageApprovals] = React.useState<Record<string, boolean>>({})

  // Get composition labels based on actual prompt content
  const getCompositionFromPrompt = (prompt: string) => {
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('close-up') || lowerPrompt.includes('headshot') || lowerPrompt.includes('close up')) {
      return 'Close-Up Shot'
    } else if (lowerPrompt.includes('full-body') || lowerPrompt.includes('full body')) {
      return 'Full-Body Shot'
    } else if (lowerPrompt.includes('medium shot') || lowerPrompt.includes('medium-shot')) {
      return 'Medium Shot'
    } else if (lowerPrompt.includes('wide shot') || lowerPrompt.includes('wide-shot') || lowerPrompt.includes('wide angle')) {
      return 'Wide Shot'
    } else if (lowerPrompt.includes('environmental') || lowerPrompt.includes('vertical environmental')) {
      return 'Environmental'
    } else if (lowerPrompt.includes('action') || lowerPrompt.includes('dynamic')) {
      return 'Action Shot'
    } else if (lowerPrompt.includes('overhead') || lowerPrompt.includes('bird\'s eye')) {
      return 'Overhead'
    } else if (lowerPrompt.includes('pattern') || lowerPrompt.includes('abstract')) {
      return 'Abstract'
    } else if (lowerPrompt.includes('central') || lowerPrompt.includes('centered')) {
      return 'Central Focus'
    } else {
      return 'Composed Shot'
    }
  }

  const compositionLabels = optimizedPrompts ? [
    getCompositionFromPrompt(optimizedPrompts.option1),
    getCompositionFromPrompt(optimizedPrompts.option2),
    getCompositionFromPrompt(optimizedPrompts.option3)
  ] : ['Option 1', 'Option 2', 'Option 3']

  const handleImageToggle = (imageId: string) => {
    setImageApprovals(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }))
  }

  const handleFinalApproval = () => {
    const approvals = images.map(image => ({
      id: image.id,
      approved: Boolean(imageApprovals[image.id])
    }))
    onImageApprovals(approvals)
  }

  const getStageTitle = () => {
    switch (stage) {
      case 'optimizing': return '🤖 Optimizing Your Prompt'
      case 'prompt-selection': return '🎨 Choose Your Prompt Version'
      case 'generating': return '🎨 Generating Your Images'
      case 'approval': return '✨ Review Your Generated Images'
      default: return 'Processing...'
    }
  }

  const getStageDescription = () => {
    switch (stage) {
      case 'optimizing': return 'AI is analyzing your prompt for better results...'
      case 'prompt-selection': return `Choose which version to use for generating ${numImages} image${numImages > 1 ? 's' : ''} with ${avatarName}.`
      case 'generating': return `Generating ${numImages} image${numImages > 1 ? 's' : ''} with ${avatarName}. This may take a few minutes...`
      case 'approval': return 'Select which images to keep in your gallery. Unselected images will be deleted.'
      default: return ''
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{getStageTitle()}</h2>
          <p className="text-gray-600">{getStageDescription()}</p>
        </div>

        {/* Stage 1: Optimizing */}
        {stage === 'optimizing' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Analyzing prompt with Gemini AI...</p>
              <p className="text-gray-500 text-sm mt-2">Adding trigger words, lighting, and professional settings</p>
            </div>
          </div>
        )}

        {/* Stage 2: Prompt Selection */}
        {stage === 'prompt-selection' && (
          <div className="space-y-4 mb-6">
            <div className="text-sm text-gray-600 mb-4 text-center">
              💡 Click on a prompt to select it and continue with generation
            </div>
            
            {/* Original Prompt Card */}
            <div 
              className="border border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md"
              onClick={() => onPromptChoice('original')}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">📝 Your Original Prompt</span>
                <span className="text-xs text-gray-500">(click to select)</span>
              </div>
              <p className="text-gray-800 text-sm leading-relaxed">"{originalPrompt}"</p>
            </div>

            {/* Optimized Prompt Card 1 */}
            <div 
              className="border border-blue-200 rounded-lg p-4 bg-blue-50 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-100 hover:shadow-md"
              onClick={() => onPromptChoice('option1')}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-blue-700">🤖 AI Optimized Prompt #1</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{compositionLabels[0]}</span>
                <span className="text-xs text-blue-600">(click to select)</span>
              </div>
              <p className="text-blue-800 text-sm leading-relaxed">"{optimizedPrompts?.option1}"</p>
            </div>

            {/* Optimized Prompt Card 2 */}
            <div 
              className="border border-blue-200 rounded-lg p-4 bg-blue-50 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-100 hover:shadow-md"
              onClick={() => onPromptChoice('option2')}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-blue-700">🤖 AI Optimized Prompt #2</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{compositionLabels[1]}</span>
                <span className="text-xs text-blue-600">(click to select)</span>
              </div>
              <p className="text-blue-800 text-sm leading-relaxed">"{optimizedPrompts?.option2}"</p>
            </div>

            {/* Optimized Prompt Card 3 */}
            <div 
              className="border border-blue-200 rounded-lg p-4 bg-blue-50 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-100 hover:shadow-md"
              onClick={() => onPromptChoice('option3')}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-blue-700">🤖 AI Optimized Prompt #3</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{compositionLabels[2]}</span>
                <span className="text-xs text-blue-600">(click to select)</span>
              </div>
              <p className="text-blue-800 text-sm leading-relaxed">"{optimizedPrompts?.option3}"</p>
            </div>
          </div>
        )}

        {/* Stage 3: Generating */}
        {stage === 'generating' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Generating your images...</p>
              <p className="text-gray-500 text-sm mt-2">Using Replicate AI with your selected prompt</p>
              <div className="mt-4 text-xs text-gray-400">This usually takes 2-5 minutes</div>
            </div>
          </div>
        )}

        {/* Stage 4: Image Approval */}
        {stage === 'approval' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div 
                    className={cn(
                      "relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all",
                      imageApprovals[image.id] 
                        ? "border-green-500 ring-2 ring-green-200" 
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleImageToggle(image.id)}
                  >
                    <div className="relative w-full">
                      <img 
                        src={image.imageUrl} 
                        alt="Generated image"
                        className="w-full h-auto object-contain aspect-square" // Fixed aspect ratio for grid
                        style={{ aspectRatio: 'auto' }} // Preserve original aspect ratio
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                      
                      {/* Selection indicator */}
                      <div className={cn(
                        "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        imageApprovals[image.id]
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-300"
                      )}>
                        {imageApprovals[image.id] && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Click to {imageApprovals[image.id] ? 'deselect' : 'select'}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {Object.values(imageApprovals).filter(Boolean).length} of {images.length} images selected
              </div>
              <Button 
                onClick={handleFinalApproval}
                className="bg-green-600 hover:bg-green-700"
                disabled={Object.values(imageApprovals).filter(Boolean).length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve Selected Images
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6 text-center">
          {stage === 'approval' ? 
            '💡 Approved images will appear in your gallery. Unselected images will be permanently deleted.' :
            '💡 AI optimization includes trigger words, lighting terms, and professional photography settings for better results.'
          }
        </p>
      </div>
    </Modal>
  )
} 