'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
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

  useEffect(() => {
    console.log('[CRM_COMPONENT] useEffect triggered - fetching data')
    fetchStats()
    fetchContacts()
    fetchAvailableSources()
  }, [searchTerm, statusFilter, sourceFilter, dateFilter, sentimentFilter])

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
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {statCards.map((stat) => {
          const isActive = statusFilter === stat.status
          return (
            <div 
              key={stat.label}
              onClick={() => handleStatusCardClick(stat.status)}
              className={`bg-white p-4 rounded-lg shadow-sm transition-all duration-200 cursor-pointer ${
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Full Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('source')}
              >
                <div className="flex items-center space-x-1">
                  <span>Source</span>
                  {getSortIcon('source')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('primaryEmail')}
              >
                <div className="flex items-center space-x-1">
                  <span>Email</span>
                  {getSortIcon('primaryEmail')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('primaryPhone')}
              >
                <div className="flex items-center space-x-1">
                  <span>Phone</span>
                  {getSortIcon('primaryPhone')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
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
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-500">Loading contacts...</span>
                  </div>
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              sortedContacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleContactClick(contact)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${getStatusColor(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contact.source || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a href={`mailto:${contact.primaryEmail}`} className="text-sm text-blue-600 hover:text-blue-900">
                      {contact.primaryEmail}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contact.primaryPhone || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
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

      {/* Contact Details Sliding Panel */}
      {showContactDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
          {/* Overlay - click to close */}
          <div 
            className="flex-1 cursor-pointer" 
            onClick={handleCloseContactDetails}
          />
          
          {/* Sliding Panel */}
          <div className={`
            bg-white w-full max-w-md h-full shadow-xl overflow-y-auto transform transition-transform duration-300 ease-in-out
            ${showContactDetails ? 'translate-x-0' : 'translate-x-full'}
          `}>
            {selectedContact && (
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {selectedContact.name}
                    </h2>
                                         <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedContact.status)}`}>
                      {selectedContact.status.toUpperCase()}
                    </div>
                  </div>
                  <button
                    onClick={handleCloseContactDetails}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                  >
                    ×
                  </button>
                </div>

                {/* Edit/Save Buttons */}
                <div className="mb-6 flex gap-2">
                  {!isEditingContact ? (
                    <button
                      onClick={handleEditContact}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Contact
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveContact}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingContact(false)
                          setEditedContact(null)
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
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

                    {(selectedContact.secondaryEmail || isEditingContact) && (
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
                          <p className="text-gray-900">{selectedContact.secondaryEmail}</p>
                        )}
                      </div>
                    )}

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

                    {(selectedContact.secondaryPhone || isEditingContact) && (
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
                          <p className="text-gray-900">{selectedContact.secondaryPhone}</p>
                        )}
                      </div>
                    )}

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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(selectedContact.sentiment)}
                        <span className="text-gray-900 capitalize">{selectedContact.sentiment}</span>
                      </div>
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
                      selectedContact.touchpoints.map((touchpoint, index) => (
                        <div key={touchpoint.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-500">
                              {format(new Date(touchpoint.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
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
            )}
          </div>
        </div>
      )}
    </div>
  )
} 