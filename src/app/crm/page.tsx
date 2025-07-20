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
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      // Fetch current page for display
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
      }
      
      // Fetch ALL filtered contacts for export count
      const allParams = new URLSearchParams({
        page: '1',
        limit: '10000', // Get all contacts
        search: searchTerm,
        status: statusFilter,
        source: sourceFilter,
        dateRange: dateFilter,
        sentiment: sentimentFilter
      })
      
      const allResponse = await fetch(`/api/crm/contacts?${allParams}`)
      if (allResponse.ok) {
        const allData = await allResponse.json()
        setAllFilteredContacts(allData.contacts)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
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

  const handleExportCSV = () => {
    // Create CSV content using ALL filtered contacts, not just displayed ones
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Sentiment']
    const csvContent = [
      headers.join(','),
      ...allFilteredContacts.map(contact => [
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <input
              type="text"
              placeholder="Search contacts by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
          </div>
          
          <div className="lg:col-span-2">
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
          
          <div className="lg:col-span-2">
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
          
          <div className="lg:col-span-1">
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
          <div className="lg:col-span-3 flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm"
            >
              Export CSV ({allFilteredContacts.length} Contacts)
            </button>
            
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
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
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Loading contacts...
                </td>
              </tr>
            ) : sortedContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No contacts found. Try adjusting your search or filters.
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
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleCloseContactDetails}
          />
          
          {/* Sliding Panel */}
          <div className={`fixed top-0 right-0 h-full w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
            showContactDetails ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                <h2 className="text-xl font-semibold text-white">Contact Details</h2>
                <button
                  onClick={handleCloseContactDetails}
                  className="p-2 hover:bg-blue-500 rounded-md transition-colors"
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {selectedContact && (
                  <div className="space-y-6">
                    {/* Contact Header Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 text-3xl">
                          {getSentimentIcon(selectedContact.sentiment)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900">{selectedContact.name}</h3>
                          {selectedContact.company && (
                            <p className="text-base text-gray-600 mt-1">{selectedContact.company}</p>
                          )}
                          <div className="mt-2">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${getStatusColor(selectedContact.status)}`}>
                              {selectedContact.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Contact Information
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Primary Email</label>
                          <div className="mt-1 flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${selectedContact.primaryEmail}`} className="text-blue-600 hover:text-blue-800">
                              {selectedContact.primaryEmail}
                            </a>
                          </div>
                        </div>
                        
                        {selectedContact.primaryPhone && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Phone Number</label>
                            <div className="mt-1 flex items-center">
                              <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-gray-900">{selectedContact.primaryPhone}</span>
                            </div>
                          </div>
                        )}
                        
                        {selectedContact.source && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Source</label>
                            <div className="mt-1 flex items-center">
                              <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-gray-900">{selectedContact.source}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Sentiment Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status & Sentiment
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <div className="mt-2">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full uppercase tracking-wide ${getStatusColor(selectedContact.status)}`}>
                              {selectedContact.status}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Sentiment</label>
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-2xl">{getSentimentIcon(selectedContact.sentiment)}</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">{selectedContact.sentiment}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Timeline
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Contact Created</label>
                          <p className="mt-1 text-gray-900 font-medium">
                            {format(new Date(selectedContact.createdAt), 'EEEE, MMMM do, yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(selectedContact.createdAt), 'h:mm a')}
                          </p>
                        </div>
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