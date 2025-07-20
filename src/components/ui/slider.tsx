import { cn } from '@/lib/utils'

interface SliderProps {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function Slider({ 
  value = [0], 
  onValueChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  className, 
  disabled 
}: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100

  const handleChange = (e: any) => {
    const newValue = parseFloat(e.target.value)
    onValueChange?.([newValue])
  }

  return (
    <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  )
} 