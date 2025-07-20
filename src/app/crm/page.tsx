'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CheckCircle, AlertCircle, XCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface Contact {
  id: number
  name: string
  primaryEmail: string
  primaryPhone: string | null
  company: string | null
  status: string
  source: string | null
  sentiment: string
  createdAt: string
  linkedin_url?: string
  facebook_url?: string
  instagram_url?: string
  youtube_url?: string
  tiktok_url?: string
  touchpoints: Array<{
    id: number
    note: string
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

export default function CRMPage() {
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

  useEffect(() => {
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
        // Contacts loaded successfully
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

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact)
    setShowContactDetails(true)
  }

  const handleCloseContactDetails = () => {
    setShowContactDetails(false)
    setSelectedContact(null)
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
      CHURNED: 'bg-red-100 text-red-800',
      DECLINED: 'bg-red-100 text-red-800', 
      UNQUALIFIED: 'bg-gray-100 text-gray-800',
      PROSPECT: 'bg-blue-100 text-blue-800',
      LEAD: 'bg-yellow-100 text-yellow-800',
      OPPORTUNITY: 'bg-purple-100 text-purple-800',
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
      color: 'text-black',
      bgColor: 'hover:bg-gray-100',
      borderColor: 'border-b-black',
      activeBg: 'bg-gray-100',
      activeBorder: 'border-black'
    },
    { 
      label: 'DECLINED', 
      value: stats.declined,
      status: 'declined', 
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      borderColor: 'border-b-red-500',
      activeBg: 'bg-red-50',
      activeBorder: 'border-red-500'
    },
    { 
      label: 'UNQUALIFIED', 
      value: stats.unqualified,
      status: 'unqualified', 
      color: 'text-gray-600',
      bgColor: 'hover:bg-gray-50',
      borderColor: 'border-b-gray-400',
      activeBg: 'bg-gray-50',
      activeBorder: 'border-gray-400'
    },
    { 
      label: 'PROSPECTS', 
      value: stats.prospects,
      status: 'prospect', 
      color: 'text-blue-600',
      bgColor: 'hover:bg-blue-50',
      borderColor: 'border-b-blue-500',
      activeBg: 'bg-blue-50',
      activeBorder: 'border-blue-500'
    },
    { 
      label: 'LEADS', 
      value: stats.leads,
      status: 'lead', 
      color: 'text-yellow-600',
      bgColor: 'hover:bg-yellow-50',
      borderColor: 'border-b-yellow-500',
      activeBg: 'bg-yellow-50',
      activeBorder: 'border-yellow-500'
    },
    { 
      label: 'OPPORTUNITIES', 
      value: stats.opportunities,
      status: 'opportunity', 
      color: 'text-green-500',
      bgColor: 'hover:bg-green-50',
      borderColor: 'border-b-green-400',
      activeBg: 'bg-green-50',
      activeBorder: 'border-green-400'
    },
    { 
      label: 'CLIENTS', 
      value: stats.clients,
      status: 'client', 
      color: 'text-green-700',
      bgColor: 'hover:bg-green-50',
      borderColor: 'border-b-green-600',
      activeBg: 'bg-green-50',
      activeBorder: 'border-green-600'
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
              className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 cursor-pointer border-b-2 ${
                isActive 
                  ? `${stat.activeBg} ${stat.activeBorder}` 
                  : `${stat.bgColor} ${stat.borderColor}`
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.touchpoints && contact.touchpoints.length > 0 
                      ? format(new Date(contact.touchpoints[0].createdAt), 'MMM d, yyyy')
                      : 'No activity'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Contact Details Sliding Panel - Overlays on top */}
      {showContactDetails && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black z-40 transition-opacity duration-500 ease-out ${
              showContactDetails ? 'bg-opacity-50' : 'bg-opacity-0'
            }`}
            onClick={handleCloseContactDetails}
          />
          
          {/* Sliding Panel */}
          <div className={`fixed top-0 right-0 h-full w-1/2 bg-white shadow-2xl z-50 transform transition-all duration-700 ease-out ${
            showContactDetails ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}>
            <div className="flex flex-col h-full">
              {/* Header with Contact Name & Company */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex-1">
                  {selectedContact && (
                    <>
                      <h2 className="text-xl font-semibold text-white">{selectedContact.name}</h2>
                      {selectedContact.company && (
                        <p className="text-blue-100 text-sm mt-1">{selectedContact.company}</p>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={handleCloseContactDetails}
                  className="p-2 hover:bg-blue-500 rounded-md transition-colors"
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Teleprompter-style Info Bar */}
              {selectedContact && (
                <div className="bg-gray-100 p-4 border-b border-gray-200">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${getStatusColor(selectedContact.status)}`}>
                        {selectedContact.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sentiment</div>
                      <div className="flex items-center justify-center">
                        <span className="text-lg mr-1">{getSentimentIcon(selectedContact.sentiment)}</span>
                        <span className="text-xs font-medium text-gray-700 capitalize">{selectedContact.sentiment}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source</div>
                      <div className="text-xs font-medium text-gray-700">{selectedContact.source || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Created</div>
                      <div className="text-xs font-medium text-gray-700">
                        {format(new Date(selectedContact.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {selectedContact && (
                  <div className="space-y-6">
                    {/* Contact Information Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Contact Information
                      </h4>
                      
                      {/* Email Row */}
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Primary Email</label>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${selectedContact.primaryEmail}`} className="text-blue-600 hover:text-blue-800 text-sm truncate">
                              {selectedContact.primaryEmail}
                            </a>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Secondary Email</label>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-500 text-sm">Not provided</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Phone Row */}
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Primary Phone</label>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-gray-900 text-sm">{selectedContact.primaryPhone || 'Not provided'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Secondary Phone</label>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-gray-500 text-sm">Not provided</span>
                          </div>
                        </div>
                      </div>
                      
                                             {/* Address Row */}
                       <div className="mb-4">
                         <label className="text-sm font-medium text-gray-500 mb-2 block">Address</label>
                         <div className="flex items-center">
                           <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                           <span className="text-gray-500 text-sm">Not provided</span>
                         </div>
                       </div>
                       
                       {/* Social Media Links */}
                       <div>
                         <label className="text-sm font-medium text-gray-500 mb-3 block">Social Media</label>
                         <div className="flex gap-3">
                           {/* LinkedIn */}
                           {selectedContact.linkedin_url ? (
                             <a 
                               href={selectedContact.linkedin_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                               title="LinkedIn Profile"
                             >
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                               </svg>
                             </a>
                           ) : (
                             <div className="p-2 text-gray-300" title="LinkedIn not provided">
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                               </svg>
                             </div>
                           )}

                           {/* Facebook */}
                           {selectedContact.facebook_url ? (
                             <a 
                               href={selectedContact.facebook_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                               title="Facebook Profile"
                             >
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                               </svg>
                             </a>
                           ) : (
                             <div className="p-2 text-gray-300" title="Facebook not provided">
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                               </svg>
                             </div>
                           )}

                           {/* Instagram */}
                           {selectedContact.instagram_url ? (
                             <a 
                               href={selectedContact.instagram_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-md transition-colors"
                               title="Instagram Profile"
                             >
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.52.204 5.036.43c-.54.25-.972.633-1.38 1.153-.41.52-.713.97-.91 1.64-.198.67-.267 1.37-.267 2.31v8.934c0 .94.069 1.64.267 2.31.197.67.5 1.12.91 1.64.408.52.84.903 1.38 1.153.484.226 1.058.348 2.005.382.948.035 1.355.048 4.976.048 3.621 0 4.028-.013 4.976-.048.947-.034 1.521-.156 2.005-.382.54-.25.972-.633 1.38-1.153.41-.52.713-.97.91-1.64.198-.67.267-1.37.267-2.31V5.583c0-.94-.069-1.64-.267-2.31-.197-.67-.5-1.12-.91-1.64-.408-.52-.84-.903-1.38-1.153C18.497.204 17.923.082 16.976.048 16.028.013 15.621 0 12.017 0zm0 2.16c3.558 0 3.984.013 5.393.048.802.007 1.546.109 2.218.347.584.207 1.022.482 1.45.91.428.428.703.866.91 1.45.238.672.34 1.416.347 2.218.035 1.409.048 1.835.048 5.393s-.013 3.984-.048 5.393c-.007.802-.109 1.546-.347 2.218-.207.584-.482 1.022-.91 1.45-.428.428-.866.703-1.45.91-.672.238-1.416.34-2.218.347-1.409.035-1.835.048-5.393.048s-3.984-.013-5.393-.048c-.802-.007-1.546-.109-2.218-.347-.584-.207-1.022-.482-1.45-.91-.428-.428-.703-.866-.91-1.45-.238-.672-.34-1.416-.347-2.218C2.173 15.984 2.16 15.558 2.16 12s.013-3.984.048-5.393c.007-.802.109-1.546.347-2.218.207-.584.482-1.022.91-1.45.428-.428.866-.703 1.45-.91.672-.238 1.416-.34 2.218-.347C8.033 2.173 8.459 2.16 12.017 2.16zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                               </svg>
                             </a>
                           ) : (
                             <div className="p-2 text-gray-300" title="Instagram not provided">
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.52.204 5.036.43c-.54.25-.972.633-1.38 1.153-.41.52-.713.97-.91 1.64-.198.67-.267 1.37-.267 2.31v8.934c0 .94.069 1.64.267 2.31.197.67.5 1.12.91 1.64.408.52.84.903 1.38 1.153.484.226 1.058.348 2.005.382.948.035 1.355.048 4.976.048 3.621 0 4.028-.013 4.976-.048.947-.034 1.521-.156 2.005-.382.54-.25.972-.633 1.38-1.153.41-.52.713-.97.91-1.64.198-.67.267-1.37.267-2.31V5.583c0-.94-.069-1.64-.267-2.31-.197-.67-.5-1.12-.91-1.64-.408-.52-.84-.903-1.38-1.153C18.497.204 17.923.082 16.976.048 16.028.013 15.621 0 12.017 0zm0 2.16c3.558 0 3.984.013 5.393.048.802.007 1.546.109 2.218.347.584.207 1.022.482 1.45.91.428.428.703.866.91 1.45.238.672.34 1.416.347 2.218.035 1.409.048 1.835.048 5.393s-.013 3.984-.048 5.393c-.007.802-.109 1.546-.347 2.218-.207.584-.482 1.022-.91 1.45-.428.428-.866.703-1.45.91-.672.238-1.416.34-2.218.347-1.409.035-1.835.048-5.393.048s-3.984-.013-5.393-.048c-.802-.007-1.546-.109-2.218-.347-.584-.207-1.022-.482-1.45-.91-.428-.428-.703-.866-.91-1.45-.238-.672-.34-1.416-.347-2.218C2.173 15.984 2.16 15.558 2.16 12s.013-3.984.048-5.393c.007-.802.109-1.546.347-2.218.207-.584.482-1.022.91-1.45.428-.428.866-.703 1.45-.91.672-.238 1.416-.34 2.218-.347C8.033 2.173 8.459 2.16 12.017 2.16zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                               </svg>
                             </div>
                           )}

                           {/* YouTube */}
                           {selectedContact.youtube_url ? (
                             <a 
                               href={selectedContact.youtube_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                               title="YouTube Channel"
                             >
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M23.498 6.186a2.999 2.999 0 00-2.109-2.124C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.389.517A2.999 2.999 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.999 2.999 0 002.109 2.124C4.495 20.455 12 20.455 12 20.455s7.505 0 9.389-.517a2.999 2.999 0 002.109-2.124C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                               </svg>
                             </a>
                           ) : (
                             <div className="p-2 text-gray-300" title="YouTube not provided">
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M23.498 6.186a2.999 2.999 0 00-2.109-2.124C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.389.517A2.999 2.999 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.999 2.999 0 002.109 2.124C4.495 20.455 12 20.455 12 20.455s7.505 0 9.389-.517a2.999 2.999 0 002.109-2.124C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                               </svg>
                             </div>
                           )}

                           {/* TikTok */}
                           {selectedContact.tiktok_url ? (
                             <a 
                               href={selectedContact.tiktok_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-black hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                               title="TikTok Profile"
                             >
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                               </svg>
                             </a>
                           ) : (
                             <div className="p-2 text-gray-300" title="TikTok not provided">
                               <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                               </svg>
                             </div>
                           )}
                         </div>
                       </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Activity Timeline
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Last Activity</label>
                          <p className="mt-1 text-gray-900 font-medium">
                            {selectedContact.touchpoints && selectedContact.touchpoints.length > 0 
                              ? format(new Date(selectedContact.touchpoints[0].createdAt), 'EEEE, MMMM do, yyyy')
                              : 'No activity recorded'
                            }
                          </p>
                          {selectedContact.touchpoints && selectedContact.touchpoints.length > 0 && (
                            <p className="text-sm text-gray-500">
                              {format(new Date(selectedContact.touchpoints[0].createdAt), 'h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="border-t border-gray-200 p-6 bg-white">
                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Contact
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm">
                    <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 