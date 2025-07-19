'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CRMStat {
  title: string
  value: number
  change: number
  trend: 'up' | 'down' | 'neutral'
}

export function CRMStats() {
  const [stats, setStats] = useState<CRMStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/crm/stats')
      const data = await response.json()
      setStats(data.stats || [])
    } catch (error) {
      console.error('Failed to fetch CRM stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up') {
      return change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
    } else if (trend === 'down') {
      return change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-600'
    }
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center space-x-1 text-xs">
              {getTrendIcon(stat.trend)}
              <span className={getTrendColor(stat.trend, stat.change)}>
                {Math.abs(stat.change)}%
              </span>
              <span className="text-gray-500">from last 28 days</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 