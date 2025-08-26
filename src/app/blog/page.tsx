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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
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

        {/* Blog Configurations - One per row */}
        <div className="space-y-6">
          {blogConfigs.map((config, index) => {
            // Check if blog should be active (has category and at least one topic)
            const hasValidCategory = config.categoryId > 0
            const hasValidTopic = config.topics.some(topic => topic.trim().length > 0)
            const shouldBeActive = hasValidCategory && hasValidTopic
            
            // Auto-pause if requirements not met
            const effectiveIsPaused = !shouldBeActive || config.isPaused
            
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Blog {index + 1}
                    </h3>
                    <span className={`px-3 py-1 text-sm rounded-full ${
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
                    <p className="text-sm text-gray-500 mt-2">
                      {config.category.name}
                    </p>
                  )}
                  {!shouldBeActive && (
                    <p className="text-sm text-red-600 mt-2">
                      ⚠️ Requires category selection and at least one topic to be active
                    </p>
                  )}
                </div>

                {/* Content - Horizontal Layout */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Column 1: Basic Settings */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Schedule Name
                        </label>
                        <input
                          type="text"
                          value={config.name}
                          onChange={(e) => updateConfig(index, { name: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder={`Blog ${index + 1}`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          value={config.categoryId}
                          onChange={(e) => updateConfig(index, { categoryId: parseInt(e.target.value) })}
                          className={`w-full border rounded-md px-3 py-2 text-sm ${
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={config.frequency}
                          onChange={(e) => updateConfig(index, { 
                            frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                            weeklyDays: e.target.value === 'weekly' ? [1] : [],
                            monthlyDay: e.target.value === 'monthly' ? 1 : undefined
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>

                    {/* Column 2: Topics */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Topics * (URLs accepted)
                        </label>
                        <div className="space-y-2">
                          {config.topics.map((topic, topicIndex) => (
                            <input
                              key={topicIndex}
                              type="text"
                              value={topic}
                              onChange={(e) => updateTopic(index, topicIndex, e.target.value)}
                              placeholder={`Topic or URL ${topicIndex + 1}`}
                              className={`w-full border rounded-md px-3 py-2 text-sm ${
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

                    {/* Column 3: Scheduling */}
                    <div className="space-y-4">
                      {/* Frequency-specific controls */}
                      {config.frequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Days of Week
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {DAYS_OF_WEEK.map(day => (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => toggleWeeklyDay(index, day.value)}
                                className={`px-2 py-1 text-xs rounded border ${
                                  (config.weeklyDays || []).includes(day.value)
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

                      {config.frequency === 'monthly' && renderMonthlyCalendar(config, index)}

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={config.timeLocal}
                            onChange={(e) => updateConfig(index, { timeLocal: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timezone
                          </label>
                          <select
                            value={config.timezone}
                            onChange={(e) => updateConfig(index, { timezone: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            {TIMEZONES.map(tz => (
                              <option key={tz} value={tz}>{tz.split('/')[1]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Column 4: Actions */}
                    <div className="flex flex-col justify-end space-y-2">
                      <button
                        onClick={() => saveSchedule(index)}
                        disabled={loading || !shouldBeActive}
                        className="w-full px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>

                      <button
                        onClick={() => publishNow(index)}
                        disabled={loading || !config.id || !shouldBeActive}
                        className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Publishing...' : 'Publish Now'}
                      </button>

                      <button
                        onClick={() => pauseSchedule(index)}
                        disabled={loading || !config.id}
                        className={`w-full px-4 py-2 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                          config.isPaused
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                        }`}
                      >
                        {config.isPaused ? 'Resume' : 'Pause'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}