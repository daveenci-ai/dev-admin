'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Eye, Star } from 'lucide-react'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  status: string
  isFeatured: boolean | null
  viewCount: number | null
  readTimeMinutes: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  featuredImageUrl: string | null
  tags: string | null
}

interface BlogListProps {
  searchTerm: string
  statusFilter: string
  featuredFilter: string
  onEdit: (post: BlogPost) => void
  onDelete: (postId: number) => void
  refreshTrigger: number
}

export function BlogList({
  searchTerm,
  statusFilter,
  featuredFilter,
  onEdit,
  onDelete,
  refreshTrigger
}: BlogListProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchPosts()
  }, [searchTerm, statusFilter, featuredFilter, pagination.page, refreshTrigger])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        status: statusFilter,
        featured: featuredFilter
      })

      const response = await fetch(`/api/blog/posts?${params}`)
      const data = await response.json()
      
      setPosts(data.posts || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }))
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTags = (tags: string | null) => {
    if (!tags) return null
    return tags.split(',').map(tag => tag.trim()).slice(0, 3)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Read Time</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No blog posts found
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{post.title}</span>
                      {post.isFeatured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                        {post.excerpt}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(post.status)}>
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {post.publishedAt ? (
                      <div className="text-sm">
                        {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not published</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3 text-gray-400" />
                      <span>{post.viewCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {post.readTimeMinutes ? `${post.readTimeMinutes} min` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {formatTags(post.tags)?.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(post)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(post.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
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