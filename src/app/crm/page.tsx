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
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchStats()
    fetchContacts()
  }, [searchTerm, statusFilter, sourceFilter, dateFilter])

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        source: sourceFilter,
        dateRange: dateFilter
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
      setLoading(true)
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        source: sourceFilter,
        dateRange: dateFilter,
        limit: '50'
      })
      
      const response = await fetch(`/api/crm/contacts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts)
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
    setSortColumn('')
    setSortDirection('asc')
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
      label: 'ALL CONTACTS',
      value: stats.total,
      status: 'all',
      color: 'text-gray-600',
      bgColor: 'hover:bg-gray-50',
      borderColor: 'border-b-gray-400',
      activeBg: 'bg-gray-50',
      activeBorder: 'border-gray-400'
    },
    { 
      label: 'CHURNED', 
      value: stats.churned,
      status: 'churned', 
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      borderColor: 'border-b-red-400',
      activeBg: 'bg-red-50',
      activeBorder: 'border-red-400'
    },
    { 
      label: 'DECLINED', 
      value: stats.declined,
      status: 'declined', 
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      borderColor: 'border-b-red-400',
      activeBg: 'bg-red-50',
      activeBorder: 'border-red-400'
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
      borderColor: 'border-b-blue-400',
      activeBg: 'bg-blue-50',
      activeBorder: 'border-blue-400'
    },
    { 
      label: 'LEADS', 
      value: stats.leads,
      status: 'lead', 
      color: 'text-yellow-600',
      bgColor: 'hover:bg-yellow-50',
      borderColor: 'border-b-yellow-400',
      activeBg: 'bg-yellow-50',
      activeBorder: 'border-yellow-400'
    },
    { 
      label: 'OPPORTUNITIES', 
      value: stats.opportunities,
      status: 'opportunity', 
      color: 'text-purple-600',
      bgColor: 'hover:bg-purple-50',
      borderColor: 'border-b-purple-400',
      activeBg: 'bg-purple-50',
      activeBorder: 'border-purple-400'
    },
    { 
      label: 'CLIENTS', 
      value: stats.clients,
      status: 'client', 
      color: 'text-green-600',
      bgColor: 'hover:bg-green-50',
      borderColor: 'border-b-green-400',
      activeBg: 'bg-green-50',
      activeBorder: 'border-green-400'
    }
  ]

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
              <div className={`text-xl font-bold text-gray-900 mb-1`}>{stat.value}</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
              <div className="text-xs text-gray-400">+100% 28d</div>
            </div>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search contacts by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Sources</option>
          <option value="networking">Networking</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="social">Social Media</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="180">Last 6 Months</option>
        </select>
        <button
          onClick={resetFilters}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          Reset
        </button>
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
                <tr key={contact.id} className="hover:bg-gray-50">
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
    </div>
  )
} 