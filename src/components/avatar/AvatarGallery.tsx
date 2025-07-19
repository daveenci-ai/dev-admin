'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Eye, 
  Search,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react'

interface AvatarGeneration {
  id: number
  prompt: string
  loraRepository: string
  loraScale: number
  guidanceScale: number
  inferenceSteps: number
  aspectRatio: string
  outputFormat: string
  seed: number | null
  enableSafetyChecker: boolean
  status: string
  imageUrl: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

interface AvatarGalleryProps {
  refreshTrigger: number
  onDelete: (id: number) => void
}

export function AvatarGallery({ refreshTrigger, onDelete }: AvatarGalleryProps) {
  const [generations, setGenerations] = useState<AvatarGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchGenerations()
  }, [searchTerm, statusFilter, pagination.page, refreshTrigger])

  const fetchGenerations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        status: statusFilter
      })

      const response = await fetch(`/api/avatar/gallery?${params}`)
      const data = await response.json()
      
      setGenerations(data.generations || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }))
    } catch (error) {
      console.error('Failed to fetch generations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const downloadImage = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `avatar-${prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}.${imageUrl.split('.').pop()}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
            </CardContent>
            <CardFooter className="p-4">
              <div className="space-y-2 w-full">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search avatars..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gallery Grid */}
      {generations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No avatars found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Generate your first avatar to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {generations.map((generation) => (
            <Card key={generation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-square relative bg-gray-100">
                  {generation.imageUrl ? (
                    <img
                      src={generation.imageUrl}
                      alt={generation.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {generation.status === 'processing' || generation.status === 'pending' ? (
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Generating...</p>
                        </div>
                      ) : generation.status === 'failed' ? (
                        <div className="text-center">
                          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                          <p className="text-sm text-red-500">Failed</p>
                        </div>
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(generation.status)}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-4">
                <div className="w-full space-y-3">
                  <div>
                    <h3 className="font-medium text-sm truncate" title={generation.prompt}>
                      {generation.prompt}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      LoRA: {generation.loraRepository}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{format(new Date(generation.createdAt), 'MMM dd, HH:mm')}</span>
                    <div className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      <span>{generation.aspectRatio}</span>
                    </div>
                  </div>

                  {generation.errorMessage && (
                    <p className="text-xs text-red-500 truncate" title={generation.errorMessage}>
                      Error: {generation.errorMessage}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    {generation.imageUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generation.imageUrl!, '_blank')}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadImage(generation.imageUrl!, generation.prompt)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(generation.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 