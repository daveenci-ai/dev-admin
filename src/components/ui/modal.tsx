'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",
        className
      )}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        {children}
      </div>
    </div>
  )
}

interface PromptComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  originalPrompt: string
  optimizedPrompt: string
  avatarName: string
  numImages: number
  onProceed: (useOptimized: boolean) => void
}

export function PromptComparisonModal({
  isOpen,
  onClose,
  originalPrompt,
  optimizedPrompt,
  avatarName,
  numImages,
  onProceed
}: PromptComparisonModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            🎨 Choose Your Prompt Version
          </h2>
          <p className="text-gray-600">
            AI has optimized your prompt for better results. Choose which version to use for generating {numImages} image{numImages > 1 ? 's' : ''} with <strong>{avatarName}</strong>.
          </p>
        </div>

        {/* Prompt Comparison */}
        <div className="space-y-4 mb-6">
          {/* Original Prompt */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">📝 Your Original Prompt</span>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">
              "{originalPrompt}"
            </p>
          </div>

          {/* Optimized Prompt */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-700">🤖 AI Optimized Prompt</span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Recommended</span>
            </div>
            <p className="text-blue-800 text-sm leading-relaxed">
              "{optimizedPrompt}"
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onProceed(false)}
            className="flex-1"
          >
            Use Original
          </Button>
          <Button
            onClick={() => onProceed(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Use AI Optimized
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          💡 AI optimization includes trigger words, lighting terms, and professional photography settings for better results.
        </p>
      </div>
    </Modal>
  )
} 