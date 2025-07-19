'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Download } from 'lucide-react'

interface CRMFiltersProps {
  searchTerm: string
  statusFilter: string
  sourceFilter: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSourceChange: (value: string) => void
  onAddContact: () => void
  onExportCSV: () => void
}

export function CRMFilters({
  searchTerm,
  statusFilter,
  sourceFilter,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onAddContact,
  onExportCSV
}: CRMFiltersProps) {
  const [sources, setSources] = useState<string[]>([])

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/crm/contacts?limit=1')
      const data = await response.json()
      setSources(data.sources || [])
    } catch (error) {
      console.error('Failed to fetch sources:', error)
    }
  }

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'PROSPECT', label: 'Prospects' },
    { value: 'LEAD', label: 'Leads' },
    { value: 'OPPORTUNITY', label: 'Opportunities' },
    { value: 'CLIENT', label: 'Clients' },
    { value: 'CHURNED', label: 'Churned' },
    { value: 'DECLINED', label: 'Declined' },
    { value: 'UNQUALIFIED', label: 'Unqualified' }
  ]

  return (
    <div className="space-y-4">
      {/* Top row - Search and Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search contacts by name, email, or company..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onAddContact} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <Button variant="outline" onClick={onExportCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Bottom row - Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select value={sourceFilter} onValueChange={onSourceChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
} 