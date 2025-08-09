'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/PageHeader'
import { CheckCircle, AlertCircle, XCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'


interface Contact {
  id: number
  name: string
  primaryEmail: string
  secondaryEmail?: string
  primaryPhone: string | null
  secondaryPhone?: string
  company: string | null
  status: string
  source: string | null
  sentiment: string
  createdAt: string
  website?: string
  address?: string
  notes?: string
  linkedinUrl?: string
  facebookUrl?: string
  instagramUrl?: string
  youtubeUrl?: string
  tiktokUrl?: string
  touchpoints: Array<{
    id: number
    note: string
    source: string
    createdAt: string
    addedBy?: string
  }>
}

interface CRMStats {
  churned: number
  declined: number
  unqualified: number
  prospects: number
  leads: number
  opportunities: number
  clients: number
  total: number
}

export default function CRMPageComponent() {
  console.log('[CRM_COMPONENT] Component-level auth check initiated')
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<CRMStats>({
    churned: 0,
    declined: 0,
    unqualified: 0,
    prospects: 0,
    leads: 0,
    opportunities: 0,
    clients: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContactDetails, setShowContactDetails] = useState(false)
  const [allFilteredContacts, setAllFilteredContacts] = useState<Contact[]>([])
  const [filteredContactsCount, setFilteredContactsCount] = useState(0)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [showSocialMediaEdit, setShowSocialMediaEdit] = useState(false)
  const [newTouchpoint, setNewTouchpoint] = useState('')
  const [editedContact, setEditedContact] = useState<Contact | null>(null)
  const [showSentimentDropdown, setShowSentimentDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [dupGroups, setDupGroups] = useState<Array<{reason: string; members: any[]}>>([])
  const [showMergeUI, setShowMergeUI] = useState(false)
  const [mergePrimaryId, setMergePrimaryId] = useState<number | null>(null)
  const [mergeSelected, setMergeSelected] = useState<number[]>([])
  const [showNewContact, setShowNewContact] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [newContactForm, setNewContactForm] = useState({ name: '', primaryEmail: '', primaryPhone: '', company: '' })
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null)
  const [dedupePairs, setDedupePairs] = useState<Array<{ id: number; score: number; reason?: string; a: any; b: any }>>([])
  const [isNormalizing, setIsNormalizing] = useState(false)

  useEffect(() => {
    console.log('[CRM_COMPONENT] useEffect triggered - fetching data')
    fetchStats()
    fetchContacts()
    fetchAvailableSources()
  }, [searchTerm, statusFilter, sourceFilter, dateFilter, sentimentFilter])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.sentiment-dropdown') && !target.closest('.status-dropdown')) {
        setShowSentimentDropdown(false)
        setShowStatusDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchAvailableSources = async () => {
    try {
      const response = await fetch('/api/crm/sources')
      if (response.ok) {
        const data = await response.json()
        setAvailableSources(data.sources)
      }
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  }

  const fetchDuplicateGroups = async () => {
    const res = await fetch('/api/crm/duplicates')
    if (res.ok) {
      const data = await res.json()
      setDupGroups(data.groups || [])
    }
  }

  const fetchDedupePairs = async () => {
    try {
      // Kick a lightweight batch to build candidates for recent contacts
      await fetch('/api/crm/dedupe/batch?days=365&limit=300', { method: 'POST' })
      const res = await fetch('/api/crm/dedupe/candidates/with-contacts?status=pending&minScore=0.55')
      if (res.ok) {
        const data = await res.json()
        setDedupePairs(data.candidates || [])
      }
    } catch (e) {
      console.error('Error fetching dedupe candidates:', e)
    }
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        source: sourceFilter,
        dateRange: dateFilter,
        sentiment: sentimentFilter
      })
      
      const response = await fetch(`/api/crm/stats?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        // Set the filtered count based on current filters
        if (statusFilter !== 'all') {
          const statusKey = statusFilter === 'prospect' ? 'prospects' : 
                           statusFilter === 'lead' ? 'leads' :
                           statusFilter === 'opportunity' ? 'opportunities' :
                           statusFilter === 'client' ? 'clients' :
                           statusFilter === 'churned' ? 'churned' :
                           statusFilter === 'declined' ? 'declined' :
                           statusFilter === 'unqualified' ? 'unqualified' : 'total'
          setFilteredContactsCount(data[statusKey] || 0)
        } else {
          setFilteredContactsCount(data.total)
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        search: searchTerm,
        status: statusFilter,
        source: sourceFilter,
        dateRange: dateFilter,
        sentiment: sentimentFilter
      })
      
      const response = await fetch(`/api/crm/contacts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts)
        console.log('[CRM_COMPONENT] Contacts loaded successfully:', data.contacts.length)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusCardClick = (status: string) => {
    setStatusFilter(status.toLowerCase())
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setSourceFilter('all')
    setDateFilter('all')
    setSentimentFilter('all')
    setSortColumn('')
    setSortDirection('asc')
  }

  const fetchContactDetails = async (contactId: number) => {
    try {
      const response = await fetch(`/api/crm/contacts?includeAllTouchpoints=true&contactId=${contactId}`)
      const data = await response.json()
      if (data.contacts && data.contacts.length > 0) {
        return data.contacts[0]
      }
      return null
    } catch (error) {
      console.error('Error fetching contact details:', error)
      return null
    }
  }

  const handleContactClick = async (contact: Contact) => {
    setSelectedContact(contact) // Set immediately for responsive UI
    setShowContactDetails(true)
    
    // Fetch full contact details with all touchpoints in background
    const fullContact = await fetchContactDetails(contact.id)
    if (fullContact) {
      setSelectedContact(fullContact)
    }
  }

  const handleCloseContactDetails = () => {
    setShowContactDetails(false)
    setSelectedContact(null)
    setIsEditingContact(false)
    setEditedContact(null)
    setNewTouchpoint('')
    setShowSocialMediaEdit(false)
  }

  const handleEditContact = () => {
    if (selectedContact) {
      setEditedContact({ ...selectedContact })
      setIsEditingContact(true)
    }
  }

  const handleSaveContact = async () => {
    if (!editedContact) return
    
    try {
      const response = await fetch(`/api/crm/contacts/${editedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedContact)
      })
      
      if (response.ok) {
        const updatedContact = await response.json()
        setSelectedContact(updatedContact)
        setIsEditingContact(false)
        setEditedContact(null)
        // Refresh contacts list
        fetchContacts()
      }
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingContact(false)
    setEditedContact(null)
  }

  const handleAddTouchpoint = async () => {
    if (!selectedContact || !newTouchpoint.trim()) return
    
    try {
      const response = await fetch(`/api/crm/contacts/${selectedContact.id}/touchpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newTouchpoint.trim() })
      })
      
      if (response.ok) {
        // Refresh contact details
        const fullContact = await fetchContactDetails(selectedContact.id)
        if (fullContact) {
          setSelectedContact(fullContact)
        }
        setNewTouchpoint('')
      }
    } catch (error) {
      console.error('Error adding touchpoint:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedContact) return
    
    try {
      const response = await fetch(`/api/crm/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedContact, status: newStatus })
      })
      
      if (response.ok) {
        const updatedContact = await response.json()
        setSelectedContact(updatedContact)
        fetchContacts() // Refresh list
        fetchStats() // Refresh stats
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
    setShowStatusDropdown(false)
  }

  const handleSentimentChange = async (newSentiment: string) => {
    if (!selectedContact) return
    
    try {
      const response = await fetch(`/api/crm/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedContact, sentiment: newSentiment })
      })
      
      if (response.ok) {
        const updatedContact = await response.json()
        setSelectedContact(updatedContact)
        fetchContacts() // Refresh list
      }
    } catch (error) {
      console.error('Error updating sentiment:', error)
    }
    setShowSentimentDropdown(false)
  }



  const handleExportCSV = async () => {
    try {
      setLoading(true)
      // Fetch ALL filtered contacts for export
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Get all filtered contacts
        search: searchTerm,
        status: statusFilter,
        source: sourceFilter,
        dateRange: dateFilter,
        sentiment: sentimentFilter
      })
      
      const response = await fetch(`/api/crm/contacts?${params}`)
      if (response.ok) {
        const data = await response.json()
        
        // Create CSV content
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Sentiment']
        const csvContent = [
          headers.join(','),
          ...data.contacts.map((contact: Contact) => [
            `"${contact.name}"`,
            `"${contact.primaryEmail}"`,
            `"${contact.primaryPhone || ''}"`,
            `"${contact.company || ''}"`,
            `"${contact.status}"`,
            `"${contact.source || ''}"`,
            `"${contact.sentiment}"`
          ].join(','))
        ].join('\n')

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error exporting contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />
  }

  const { formatInternationalPhone } = require('@/lib/utils')

  const sortedContacts = [...contacts].sort((a, b) => {
    if (!sortColumn) return 0
    
    let aValue = a[sortColumn as keyof Contact]
    let bValue = b[sortColumn as keyof Contact]
    
    // Handle null values
    if (aValue === null) aValue = ''
    if (bValue === null) bValue = ''
    
    // Convert to strings for comparison
    const aStr = String(aValue).toLowerCase()
    const bStr = String(bValue).toLowerCase()
    
    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getStatusColor = (status: string) => {
    const colors = {
      CHURNED: 'bg-gray-100 text-gray-800',
      DECLINED: 'bg-red-100 text-red-800', 
      UNQUALIFIED: 'bg-gray-100 text-gray-800',
      PROSPECT: 'bg-blue-100 text-blue-800',
      LEAD: 'bg-yellow-100 text-yellow-800',
      OPPORTUNITY: 'bg-green-100 text-green-800',
      CLIENT: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getSentimentIcon = (sentiment: string) => {
    const sentimentLower = sentiment?.toLowerCase() || 'neutral'
    
    switch (sentimentLower) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'bad':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'neutral':
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const statCards = [
    { 
      label: 'CHURNED', 
      value: stats.churned,
      status: 'churned', 
      color: 'text-gray-800',
      hoverBg: 'hover:bg-gray-100',
      borderColor: 'border-b-gray-600',
      activeBg: 'bg-gray-100',
      activeBorder: 'border-gray-600'
    },
    { 
      label: 'DECLINED', 
      value: stats.declined,
      status: 'declined', 
      color: 'text-red-600',
      hoverBg: 'hover:bg-red-50',
      borderColor: 'border-b-red-600',
      activeBg: 'bg-red-50',
      activeBorder: 'border-red-600'
    },
    { 
      label: 'UNQUALIFIED', 
      value: stats.unqualified,
      status: 'unqualified', 
      color: 'text-gray-600',
      hoverBg: 'hover:bg-gray-50',
      borderColor: 'border-b-gray-500',
      activeBg: 'bg-gray-50',
      activeBorder: 'border-gray-500'
    },
    { 
      label: 'PROSPECTS', 
      value: stats.prospects,
      status: 'prospect', 
      color: 'text-blue-600',
      hoverBg: 'hover:bg-blue-50',
      borderColor: 'border-b-blue-600',
      activeBg: 'bg-blue-50',
      activeBorder: 'border-blue-600'
    },
    { 
      label: 'LEADS', 
      value: stats.leads,
      status: 'lead', 
      color: 'text-yellow-600',
      hoverBg: 'hover:bg-yellow-50',
      borderColor: 'border-b-yellow-600',
      activeBg: 'bg-yellow-50',
      activeBorder: 'border-yellow-600'
    },
    { 
      label: 'OPPORTUNITIES', 
      value: stats.opportunities,
      status: 'opportunity', 
      color: 'text-green-600',
      hoverBg: 'hover:bg-green-50',
      borderColor: 'border-b-green-600',
      activeBg: 'bg-green-50',
      activeBorder: 'border-green-600'
    },
    { 
      label: 'CLIENTS', 
      value: stats.clients,
      status: 'client', 
      color: 'text-green-700',
      hoverBg: 'hover:bg-green-50',
      borderColor: 'border-b-green-700',
      activeBg: 'bg-green-50',
      activeBorder: 'border-green-700'
    }
  ]

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      <PageHeader title="CRM">
        <div className="hidden md:flex gap-2">
          <button onClick={() => setShowNewContact(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm">New Contact</button>
          <button onClick={() => setShowBulkImport(true)} className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm">Bulk Import</button>
          <button onClick={() => { fetchDedupePairs(); setShowMergeUI(true); }} className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm">Find Duplicates</button>
          <button
            onClick={async () => {
              try {
                setIsNormalizing(true)
                let afterId = 0
                let total = 0
                for (let i = 0; i < 20; i++) { // up to ~10k rows in 500-size chunks
                  const res = await fetch(`/api/crm/dedupe/normalize-all?limit=500&afterId=${afterId}`, { method: 'POST' })
                  const data = await res.json()
                  total += data.processed || 0
                  if (data.afterId) afterId = data.afterId
                  if (data.done) break
                }
                // After normalizing, build candidates for the most recent slice
                await fetch('/api/crm/dedupe/batch?days=365&limit=500', { method: 'POST' })
                alert(`Normalized ${total} contacts and rebuilt candidates`)
              } catch (e) {
                alert('Normalize failed, check logs')
              } finally {
                setIsNormalizing(false)
              }
            }}
            className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm"
          >
            Normalize All
          </button>
        </div>
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {statCards.map((stat) => {
          const isActive = statusFilter === stat.status
          return (
            <div 
              key={stat.label}
              onClick={() => handleStatusCardClick(stat.status)}
              className={`app-card app-card--p transition-all duration-200 cursor-pointer ${
                isActive 
                  ? `${stat.activeBg} border-2 ${stat.activeBorder} shadow-md scale-105` 
                  : `border border-gray-200 ${stat.borderColor} border-b-2 ${stat.hoverBg} hover:shadow-md`
              }`}
            >
              <div className={`text-xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
              <div className="text-xs text-gray-400">+100% 28d</div>
            </div>
          )
        })}
      </div>

      {/* Search and Filters Row */}
      <div className="mb-6">
        {/* Search, Filters and Action Buttons in one row */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
          <div className="flex-1 min-w-80">
            <input
              type="text"
              placeholder="Search contacts by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
          </div>
          
          <div className="min-w-40">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 text-sm bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sources</option>
              {availableSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          
          <div className="min-w-36">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 text-sm bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="180">Last 6 Months</option>
            </select>
          </div>
          
          <div className="min-w-28">
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">😐 All</option>
              <option value="good">😊 Good</option>
              <option value="neutral">😐 Neutral</option>
              <option value="bad">😞 Bad</option>
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 min-w-fit">
            <button
              onClick={handleExportCSV}
              className="whitespace-nowrap px-5 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm"
            >
              Export CSV ({filteredContactsCount} Contacts)
            </button>
            
            <button
              onClick={resetFilters}
              className="whitespace-nowrap px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Contacts Table */}
      <div className="app-card overflow-hidden">
        {isNormalizing && (
          <div className="p-4 bg-yellow-50 text-yellow-800 border-b border-yellow-200 text-sm">
            Normalization in progress… You can keep working; duplicates will appear once processing completes.
          </div>
        )}
        <table className="app-table">
          <thead className="app-thead">
            <tr>
              <th 
                className="app-th cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Full Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="app-th cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="app-th cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('source')}
              >
                <div className="flex items-center space-x-1">
                  <span>Source</span>
                  {getSortIcon('source')}
                </div>
              </th>
              <th 
                className="app-th cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('primaryEmail')}
              >
                <div className="flex items-center space-x-1">
                  <span>Email</span>
                  {getSortIcon('primaryEmail')}
                </div>
              </th>
              <th 
                className="app-th cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('primaryPhone')}
              >
                <div className="flex items-center space-x-1">
                  <span>Phone</span>
                  {getSortIcon('primaryPhone')}
                </div>
              </th>
              <th 
                className="app-th cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Last Touchpoint</span>
                  {getSortIcon('createdAt')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="app-td text-center py-12">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-500">Loading contacts...</span>
                  </div>
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="app-td text-center py-12 text-gray-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              sortedContacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className="app-tr cursor-pointer"
                  onClick={() => handleContactClick(contact)}
                >
                  <td className="app-td">
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">
                        {getSentimentIcon(contact.sentiment)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                        {contact.company && (
                          <div className="text-sm text-gray-500">{contact.company}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="app-td">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${getStatusColor(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="app-td text-gray-900">
                    {contact.source || '-'}
                  </td>
                  <td className="app-td">
                    <a href={`mailto:${contact.primaryEmail}`} className="text-sm text-blue-600 hover:text-blue-900">
                      {contact.primaryEmail}
                    </a>
                  </td>
                  <td className="app-td text-gray-900">
                    {formatInternationalPhone(contact.primaryPhone).formatted}
                  </td>
                  <td className="app-td text-gray-500 max-w-xs">
                    {contact.touchpoints && contact.touchpoints.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-gray-900 font-medium truncate" title={contact.touchpoints[0].note}>
                          {contact.touchpoints[0].note.length > 50 
                            ? `${contact.touchpoints[0].note.substring(0, 50)}...` 
                            : contact.touchpoints[0].note
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(contact.touchpoints[0].createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No activity</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

            {/* Contact Details Modal */}
      {showContactDetails && selectedContact && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseContactDetails}
          />
          
          {/* Panel */}
          <div className={`absolute right-0 top-0 h-full w-1/2 min-w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            showContactDetails ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Close button */}
            <button
              onClick={handleCloseContactDetails}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Scrollable content */}
            <div className="h-full overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedContact.name}
                </h2>
                
                {/* Sentiment, Status, Source, and Added Date Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Sentiment Dropdown */}
                  <div className="relative sentiment-dropdown">
                    <button
                      onClick={() => {
                        setShowSentimentDropdown(!showSentimentDropdown)
                        setShowStatusDropdown(false)
                      }}
                      className="flex items-center hover:bg-gray-100 p-1 rounded transition-colors"
                      title="Click to change sentiment"
                    >
                      {getSentimentIcon(selectedContact.sentiment)}
                    </button>
                    
                    {showSentimentDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleSentimentChange('GOOD')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Good
                          </button>
                          <button
                            onClick={() => handleSentimentChange('NEUTRAL')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                          >
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            Neutral
                          </button>
                          <button
                            onClick={() => handleSentimentChange('BAD')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                            Bad
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative status-dropdown">
                    <button
                      onClick={() => {
                        setShowStatusDropdown(!showStatusDropdown)
                        setShowSentimentDropdown(false)
                      }}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${getStatusColor(selectedContact.status)}`}
                      title="Click to change status"
                    >
                      {selectedContact.status.toUpperCase()}
                    </button>
                    
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          {['CHURNED', 'DECLINED', 'UNQUALIFIED', 'PROSPECT', 'LEAD', 'OPPORTUNITY', 'CLIENT'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 ${getStatusColor(status)}`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Source */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Source:</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                      {selectedContact.source || 'N/A'}
                    </span>
                  </div>

                  {/* Added Date */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Added:</span>
                    <span className="text-xs text-gray-700">
                      {new Date(selectedContact.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                
                {/* Edit/Save Buttons */}
                <div className="flex gap-2">
                  {!isEditingContact ? (
                    <button
                      onClick={handleEditContact}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit Contact
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveContact}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingContact(false)
                          setEditedContact(null)
                        }}
                        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedContact) return
                          if (!confirm('Delete this contact and related touchpoints?')) return
                          const res = await fetch(`/api/crm/contacts/${selectedContact.id}`, { method: 'DELETE' })
                          if (res.ok) {
                            setShowContactDetails(false)
                            setSelectedContact(null)
                            fetchContacts()
                            fetchStats()
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
                  {isEditingContact ? (
                    <input
                      type="email"
                      value={editedContact?.primaryEmail || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, primaryEmail: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{selectedContact.primaryEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone</label>
                  {isEditingContact ? (
                    <input
                      type="tel"
                      value={editedContact?.primaryPhone || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, primaryPhone: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{selectedContact.primaryPhone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Email</label>
                  {isEditingContact ? (
                    <input
                      type="email"
                      value={editedContact?.secondaryEmail || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, secondaryEmail: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{selectedContact.secondaryEmail || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Phone</label>
                  {isEditingContact ? (
                    <input
                      type="tel"
                      value={editedContact?.secondaryPhone || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, secondaryPhone: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{selectedContact.secondaryPhone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  {isEditingContact ? (
                    <input
                      type="text"
                      value={editedContact?.company || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, company: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{selectedContact.company || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <p className="text-gray-900">{selectedContact.source || 'Unknown'}</p>
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Added Date</label>
                  <p className="text-gray-900">{format(new Date(selectedContact.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Notes</h3>
              {isEditingContact ? (
                <textarea
                  value={editedContact?.notes || ''}
                  onChange={(e) => setEditedContact(prev => prev ? {...prev, notes: e.target.value} : null)}
                  placeholder="Add notes about this contact..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {selectedContact.notes || 'No notes added yet.'}
                </p>
              )}
            </div>

            {/* Touchpoints Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Activity & Touchpoints</h3>
                <span className="text-sm text-gray-500">
                  {selectedContact.touchpoints?.length || 0} entries
                </span>
              </div>

              {/* Add New Touchpoint */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Touchpoint</label>
                <div className="flex gap-2">
                  <textarea
                    value={newTouchpoint}
                    onChange={(e) => setNewTouchpoint(e.target.value)}
                    placeholder="Describe the interaction or activity..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
                  />
                  <button
                    onClick={handleAddTouchpoint}
                    disabled={!newTouchpoint.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Touchpoints List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedContact.touchpoints && selectedContact.touchpoints.length > 0 ? (
                  selectedContact.touchpoints.map((touchpoint) => (
                    <div key={touchpoint.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">
                            {format(new Date(touchpoint.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                          {touchpoint.addedBy && (
                            <span className="text-xs text-gray-400 mt-1">
                              Added by: {touchpoint.addedBy}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-blue-600 font-medium">
                          {touchpoint.source}
                        </span>
                      </div>
                      <p className="text-gray-900 text-sm">{touchpoint.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No activity recorded yet.</p>
                )}
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* New Contact Drawer (slide-in) */}
      {showNewContact && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowNewContact(false)} />

          {/* Drawer Panel */}
          <div className={`absolute right-0 top-0 h-full w-1/2 min-w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${showNewContact ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Add Contact</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowNewContact(false)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    value={newContactForm.name}
                    onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Full name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Primary Email</label>
                  <input
                    value={newContactForm.primaryEmail}
                    onChange={(e) => setNewContactForm({ ...newContactForm, primaryEmail: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Primary Phone</label>
                  <input
                    value={newContactForm.primaryPhone}
                    onChange={(e) => setNewContactForm({ ...newContactForm, primaryPhone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="(123) 123-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Company</label>
                  <input
                    value={newContactForm.company}
                    onChange={(e) => setNewContactForm({ ...newContactForm, company: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Company"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 text-sm" onClick={() => setShowNewContact(false)}>Cancel</button>
                <button
                  className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
                  disabled={!newContactForm.name || !newContactForm.primaryEmail}
                  onClick={async () => {
                    const payload = {
                      ...newContactForm,
                      status: 'PROSPECT',
                      source: 'Manual',
                      userId: 1,
                    }
                    const res = await fetch('/api/crm/contacts', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
                    if (res.ok) {
                      setShowNewContact(false)
                      setNewContactForm({ name: '', primaryEmail: '', primaryPhone: '', company: '' })
                      fetchContacts()
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkImport(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[620px] p-6">
            <h3 className="text-lg font-semibold mb-4">Bulk Import from Images</h3>
            <input type="file" accept="image/*" multiple onChange={(e) => setBulkFiles(e.target.files)} className="mb-4" />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 text-sm" onClick={() => setShowBulkImport(false)}>Cancel</button>
              <button
                className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
                disabled={!bulkFiles || bulkFiles.length === 0}
                onClick={async () => {
                  if (!bulkFiles) return
                  const form = new FormData()
                  Array.from(bulkFiles).forEach((f) => form.append('files', f))
                  const res = await fetch('/api/crm/contacts/bulk-upload', { method: 'POST', body: form })
                  const data = await res.json()
                  console.log('[Bulk Import] result', data)
                  setShowBulkImport(false)
                  setBulkFiles(null)
                  fetchContacts()
                }}
              >
                Upload & Parse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedupe Candidates Drawer */}
      {showMergeUI && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMergeUI(false)} />
          <div className="absolute right-0 top-0 h-full w-[680px] bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Duplicate Candidates</h3>
              <button className="text-gray-500" onClick={() => setShowMergeUI(false)}>Close</button>
            </div>
            {dedupePairs.length === 0 ? (
              <p className="text-gray-500">No candidates found.</p>
            ) : (
              <div className="space-y-4">
                {dedupePairs.map((c) => (
                  <div key={c.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Score: <span className="font-semibold">{c.score.toFixed(3)}</span>{c.reason ? ` • ${c.reason}` : ''}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/crm/dedupe/${c.id}/merge`, { method: 'POST' })
                            if (res.ok) {
                              await fetchDedupePairs()
                              await fetchContacts()
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                        >
                          Merge
                        </button>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/crm/dedupe/${c.id}/reject`, { method: 'POST' })
                            if (res.ok) {
                              await fetchDedupePairs()
                            }
                          }}
                          className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[c.a, c.b].map((m: any, idx: number) => (
                        <div key={idx} className="border rounded p-2">
                          <div className="font-medium text-sm">{m?.name || '-'}</div>
                          <div className="text-xs text-gray-500 break-all">{m?.primaryEmail || '-'}</div>
                          <div className="text-xs text-gray-500">{m?.primaryPhone || '-'}</div>
                          <div className="text-xs text-gray-500">{m?.company || '-'}</div>
                          <div className="text-xs text-gray-400">Added {m?.createdAt ? format(new Date(m.createdAt), 'MMM d, yyyy') : '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 