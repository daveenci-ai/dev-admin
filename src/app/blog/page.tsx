"use client"

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'

interface BlogCategory {
  id: number
  name: string
  slug: string
  description?: string
}

interface BlogSchedule {
  id?: number
  name: string
  categoryId: number
  topics: string[]
  frequency: 'daily' | 'weekly' | 'monthly'
  weeklyDays?: number[]
  monthlyDay?: number
  timeLocal: string
  timezone: string
  isActive: boolean
  isPaused: boolean
  category?: BlogCategory
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
]

export default function BlogPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [schedules, setSchedules] = useState<BlogSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedBlogIndex, setSelectedBlogIndex] = useState<number>(0)

  // Initialize 5 empty schedules
  const [blogConfigs, setBlogConfigs] = useState<BlogSchedule[]>([
    {
      name: 'Blog 1',
      categoryId: 0,
      topics: ['', '', '', '', ''],
      frequency: 'weekly',
      weeklyDays: [1], // Monday
      timeLocal: '10:00',
      timezone: 'America/Chicago',
      isActive: true,
      isPaused: false
    },
    {
      name: 'Blog 2',
      categoryId: 0,
      topics: ['', '', '', '', ''],
      frequency: 'weekly',
      weeklyDays: [2], // Tuesday
      timeLocal: '14:00',
      timezone: 'America/Chicago',
      isActive: true,
      isPaused: false
    },
    {
      name: 'Blog 3',
      categoryId: 0,
      topics: ['', '', '', '', ''],
      frequency: 'weekly',
      weeklyDays: [3], // Wednesday
      timeLocal: '09:00',
      timezone: 'America/Chicago',
      isActive: true,
      isPaused: false
    },
    {
      name: 'Blog 4',
      categoryId: 0,
      topics: ['', '', '', '', ''],
      frequency: 'weekly',
      weeklyDays: [4], // Thursday
      timeLocal: '16:00',
      timezone: 'America/Chicago',
      isActive: true,
      isPaused: false
    },
    {
      name: 'Blog 5',
      categoryId: 0,
      topics: ['', '', '', '', ''],
      frequency: 'monthly',
      monthlyDay: 1,
      timeLocal: '11:00',
      timezone: 'America/Chicago',
      isActive: true,
      isPaused: false
    }
  ])

  // Load categories and existing schedules
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load categories
      const categoriesRes = await fetch('/api/blog/categories')
      if (categoriesRes.ok) {
        const { categories } = await categoriesRes.json()
        setCategories(categories || [])
      }

      // Load existing schedules
      const schedulesRes = await fetch('/api/blog/schedules')
      if (schedulesRes.ok) {
        const { schedules } = await schedulesRes.json()
        setSchedules(schedules || [])
        
        // If we have existing schedules, populate the first 5 configs
        if (schedules && schedules.length > 0) {
          const existingConfigs = schedules.slice(0, 5).map((schedule: any) => ({
            id: schedule.id,
            name: schedule.name,
            categoryId: schedule.categoryId,
            topics: schedule.topics || ['', '', '', '', ''],
            frequency: schedule.frequency,
            weeklyDays: schedule.weeklyDays || [],
            monthlyDay: schedule.monthlyDay,
            timeLocal: schedule.timeLocal,
            timezone: schedule.timezone,
            isActive: schedule.isActive,
            isPaused: schedule.isPaused,
            category: schedule.category
          }))
          
          // Fill remaining slots with defaults
          while (existingConfigs.length < 5) {
            existingConfigs.push({
              name: `Blog ${existingConfigs.length + 1}`,
              categoryId: 0,
              topics: ['', '', '', '', ''],
              frequency: 'weekly',
              weeklyDays: [existingConfigs.length + 1],
              timeLocal: '10:00',
              timezone: 'America/Chicago',
              isActive: true,
              isPaused: false
            })
          }
          
          setBlogConfigs(existingConfigs)
        }
      }
    } catch (err: any) {
      setError('Failed to load data')
    }
  }

  const updateConfig = (index: number, updates: Partial<BlogSchedule>) => {
    setBlogConfigs(prev => {
      const newConfigs = [...prev]
      newConfigs[index] = { ...newConfigs[index], ...updates }
      return newConfigs
    })
  }

  const updateTopic = (configIndex: number, topicIndex: number, value: string) => {
    setBlogConfigs(prev => {
      const newConfigs = [...prev]
      const topics = [...newConfigs[configIndex].topics]
      topics[topicIndex] = value
      newConfigs[configIndex] = { ...newConfigs[configIndex], topics }
      return newConfigs
    })
  }

  const toggleWeeklyDay = (configIndex: number, day: number) => {
    setBlogConfigs(prev => {
      const newConfigs = [...prev]
      const weeklyDays = newConfigs[configIndex].weeklyDays || []
      const newWeeklyDays = weeklyDays.includes(day)
        ? weeklyDays.filter(d => d !== day)
        : [...weeklyDays, day].sort()
      newConfigs[configIndex] = { ...newConfigs[configIndex], weeklyDays: newWeeklyDays }
      return newConfigs
    })
  }

  const saveSchedule = async (index: number) => {
    const config = blogConfigs[index]
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const method = config.id ? 'PUT' : 'POST'
      const url = config.id ? `/api/blog/schedules/${config.id}` : '/api/blog/schedules'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          categoryId: config.categoryId,
          topics: config.topics.filter(t => t.trim()),
          frequency: config.frequency,
          weeklyDays: config.weeklyDays,
          monthlyDay: config.monthlyDay,
          timeLocal: config.timeLocal,
          timezone: config.timezone,
          isActive: config.isActive,
          isPaused: config.isPaused
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save schedule')
      }

      const { schedule } = await response.json()
      
      // Update the config with the returned schedule data
      updateConfig(index, { id: schedule.id, category: schedule.category })
      
      setSuccess(`Blog ${index + 1} saved successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule')
    } finally {
      setLoading(false)
    }
  }

  const publishNow = async (index: number, topicIndex: number = 0) => {
    const config = blogConfigs[index]
    
    if (!config.id) {
      setError('Please save the schedule first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/blog/schedules/${config.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIndex })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to publish')
      }

      const result = await response.json()
      setSuccess(`Published "${result.topic}" successfully!`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to publish')
    } finally {
      setLoading(false)
    }
  }

  const pauseSchedule = async (index: number) => {
    const config = blogConfigs[index]
    
    if (!config.id) {
      setError('Please save the schedule first')
      return
    }

    try {
      const response = await fetch(`/api/blog/schedules/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: !config.isPaused })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update schedule')
      }

      updateConfig(index, { isPaused: !config.isPaused })
      setSuccess(`Blog ${index + 1} ${config.isPaused ? 'resumed' : 'paused'}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule')
    }
  }

  const renderMonthlyCalendar = (config: BlogSchedule, index: number) => {
    const selectedDay = config.monthlyDay || 1
    const days = Array.from({ length: 28 }, (_, i) => i + 1)
    
    return (
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Day of Month
        </label>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => updateConfig(index, { monthlyDay: day })}
              className={`w-8 h-8 text-sm rounded border ${
                selectedDay === day
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const selectedConfig = blogConfigs[selectedBlogIndex]
  
  // Check if selected blog should be active
  const hasValidCategory = selectedConfig.categoryId > 0
  const hasValidTopic = selectedConfig.topics.some(topic => topic.trim().length > 0)
  const shouldBeActive = hasValidCategory && hasValidTopic

  const getScheduleDisplay = (config: BlogSchedule) => {
    if (config.frequency === 'daily') {
      return `Daily at ${config.timeLocal}`
    } else if (config.frequency === 'weekly') {
      const days = (config.weeklyDays || []).map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')
      return `Weekly (${days || 'Mon'}) at ${config.timeLocal}`
    } else if (config.frequency === 'monthly') {
      return `Monthly (${config.monthlyDay || 1}) at ${config.timeLocal}`
    }
    return 'Not scheduled'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">AEO Blog Management</h1>
      </div>
      
      <div className="flex-1 p-6">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Blog Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {blogConfigs.map((config, index) => {
            const hasValidCategory = config.categoryId > 0
            const hasValidTopic = config.topics.some(topic => topic.trim().length > 0)
            const shouldBeActive = hasValidCategory && hasValidTopic
            const effectiveIsPaused = !shouldBeActive || config.isPaused
            const isSelected = selectedBlogIndex === index

            return (
              <div
                key={index}
                onClick={() => setSelectedBlogIndex(index)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Blog {index + 1}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    effectiveIsPaused 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : config.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {effectiveIsPaused ? 'Paused' : config.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {config.category && (
                  <p className="text-sm text-gray-600 mb-1">{config.category.name}</p>
                )}
                
                <p className="text-xs text-gray-500">
                  {getScheduleDisplay(config)}
                </p>
                
                {!shouldBeActive && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Setup required</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Selected Blog Control Panel */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Blog {selectedBlogIndex + 1} Configuration
              </h2>
              <span className={`px-3 py-1 text-sm rounded-full ${
                !shouldBeActive || selectedConfig.isPaused
                  ? 'bg-yellow-100 text-yellow-800' 
                  : selectedConfig.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {!shouldBeActive || selectedConfig.isPaused ? 'Paused' : selectedConfig.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {!shouldBeActive && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Requires category selection and at least one topic to be active
              </p>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column 1: Category & Topics */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={selectedConfig.categoryId}
                    onChange={(e) => updateConfig(selectedBlogIndex, { categoryId: parseInt(e.target.value) })}
                    className={`w-full border rounded-md px-3 py-2 ${
                      !hasValidCategory ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value={0}>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topics * (URLs accepted)
                  </label>
                  <div className="space-y-3">
                    {selectedConfig.topics.map((topic, topicIndex) => (
                      <input
                        key={topicIndex}
                        type="text"
                        value={topic}
                        onChange={(e) => updateTopic(selectedBlogIndex, topicIndex, e.target.value)}
                        placeholder={`Topic or URL ${topicIndex + 1}`}
                        className={`w-full border rounded-md px-3 py-2 ${
                          topicIndex === 0 && !topic.trim() && !hasValidTopic 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {!hasValidTopic && (
                    <p className="text-xs text-red-600 mt-1">At least one topic required</p>
                  )}
                </div>
              </div>

              {/* Column 2: Scheduling */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={selectedConfig.frequency}
                    onChange={(e) => updateConfig(selectedBlogIndex, { 
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                      weeklyDays: e.target.value === 'weekly' ? [1] : [],
                      monthlyDay: e.target.value === 'monthly' ? 1 : undefined
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Frequency-specific controls */}
                {selectedConfig.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWeeklyDay(selectedBlogIndex, day.value)}
                          className={`px-3 py-1 text-sm rounded border ${
                            (selectedConfig.weeklyDays || []).includes(day.value)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedConfig.frequency === 'monthly' && renderMonthlyCalendar(selectedConfig, selectedBlogIndex)}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={selectedConfig.timeLocal}
                      onChange={(e) => updateConfig(selectedBlogIndex, { timeLocal: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={selectedConfig.timezone}
                      onChange={(e) => updateConfig(selectedBlogIndex, { timezone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz.split('/')[1]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Column 3: Actions */}
              <div className="flex flex-col justify-center space-y-4">
                <button
                  onClick={() => saveSchedule(selectedBlogIndex)}
                  disabled={loading || !shouldBeActive}
                  className="w-full px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>

                <button
                  onClick={() => publishNow(selectedBlogIndex)}
                  disabled={loading || !selectedConfig.id || !shouldBeActive}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Publishing...' : 'Publish Now'}
                </button>

                <button
                  onClick={() => pauseSchedule(selectedBlogIndex)}
                  disabled={loading || !selectedConfig.id}
                  className={`w-full px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedConfig.isPaused
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {selectedConfig.isPaused ? 'Resume Schedule' : 'Pause Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}