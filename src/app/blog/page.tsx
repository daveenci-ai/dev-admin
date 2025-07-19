'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { BlogList } from '@/components/blog/BlogList'
import { RichTextEditor } from '@/components/blog/RichTextEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Search, Plus, FileText, Eye, Star, TrendingUp } from 'lucide-react'

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
  content?: string
  metaDescription?: string | null
  metaKeywords?: string | null
  llmPrompt?: string | null
}

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [featuredFilter, setFeaturedFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    tags: '',
    metaDescription: '',
    metaKeywords: '',
    featuredImageUrl: '',
    status: 'draft' as const,
    isFeatured: false,
    llmPrompt: ''
  })

  const handleAddPost = () => {
    setIsEditing(false)
    setCurrentPost(null)
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      tags: '',
      metaDescription: '',
      metaKeywords: '',
      featuredImageUrl: '',
      status: 'draft',
      isFeatured: false,
      llmPrompt: ''
    })
    setIsModalOpen(true)
  }

  const handleEditPost = async (post: BlogPost) => {
    // Fetch full post data including content
    try {
      const response = await fetch(`/api/blog/posts/${post.id}`)
      const fullPost = await response.json()
      
      setIsEditing(true)
      setCurrentPost(fullPost)
      setFormData({
        title: fullPost.title || '',
        slug: fullPost.slug || '',
        content: fullPost.content || '',
        excerpt: fullPost.excerpt || '',
        tags: fullPost.tags || '',
        metaDescription: fullPost.metaDescription || '',
        metaKeywords: fullPost.metaKeywords || '',
        featuredImageUrl: fullPost.featuredImageUrl || '',
        status: fullPost.status || 'draft',
        isFeatured: fullPost.isFeatured || false,
        llmPrompt: fullPost.llmPrompt || ''
      })
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch post details:', error)
      alert('Failed to load post details')
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      return
    }

    try {
      const response = await fetch(`/api/blog/posts/${postId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRefreshTrigger(prev => prev + 1)
      } else {
        alert('Failed to delete blog post')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete blog post')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = isEditing ? `/api/blog/posts/${currentPost?.id}` : '/api/blog/posts'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        setRefreshTrigger(prev => prev + 1)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save blog post')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to save blog post')
    }
  }

  // Generate slug from title
  const generateSlug = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setFormData(prev => ({ ...prev, slug }))
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-gray-600 mt-2">
            Create, edit, and manage your blog posts
          </p>
        </div>

        {/* Blog Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3" />
                <span>All time</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Eye className="h-3 w-3" />
                <span>Live posts</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Drafts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                <span>In progress</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Featured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Star className="h-3 w-3" />
                <span>Highlighted</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Posts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="true">Featured Only</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAddPost} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        {/* Blog List */}
        <BlogList
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          featuredFilter={featuredFilter}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          refreshTrigger={refreshTrigger}
        />

        {/* Add/Edit Blog Post Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, title: e.target.value }))
                      if (!isEditing) {
                        generateSlug(e.target.value)
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="auto-generated-from-title"
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <Label>Content *</Label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Write your blog post content here..."
                />
              </div>

              {/* Excerpt and Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Brief description of the post"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                </div>
              </div>

              {/* SEO and Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder="SEO meta description (max 160 chars)"
                    maxLength={160}
                    rows={2}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                    />
                    <Label htmlFor="featured">Featured Post</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Update Post' : 'Create Post'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
} 