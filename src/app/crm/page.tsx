'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface Contact {
  id: number
  name: string
  primaryEmail: string
  primaryPhone: string | null
  company: string | null
  status: string
  source: string | null
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

  useEffect(() => {
    fetchStats()
    fetchContacts()
  }, [searchTerm, statusFilter, sourceFilter])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/crm/stats')
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

  const statCards = [
    { 
      label: 'CHURNED', 
      value: stats.churned, 
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      borderColor: 'hover:border-red-200'
    },
    { 
      label: 'DECLINED', 
      value: stats.declined, 
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      borderColor: 'hover:border-red-200'
    },
    { 
      label: 'UNQUALIFIED', 
      value: stats.unqualified, 
      color: 'text-gray-600',
      bgColor: 'hover:bg-gray-50',
      borderColor: 'hover:border-gray-300'
    },
    { 
      label: 'PROSPECTS', 
      value: stats.prospects, 
      color: 'text-blue-600',
      bgColor: 'hover:bg-blue-50',
      borderColor: 'hover:border-blue-200'
    },
    { 
      label: 'LEADS', 
      value: stats.leads, 
      color: 'text-yellow-600',
      bgColor: 'hover:bg-yellow-50',
      borderColor: 'hover:border-yellow-200'
    },
    { 
      label: 'OPPORTUNITIES', 
      value: stats.opportunities, 
      color: 'text-purple-600',
      bgColor: 'hover:bg-purple-50',
      borderColor: 'hover:border-purple-200'
    },
    { 
      label: 'CLIENTS', 
      value: stats.clients, 
      color: 'text-green-600',
      bgColor: 'hover:bg-green-50',
      borderColor: 'hover:border-green-200'
    }
  ]

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div 
            key={stat.label} 
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 cursor-pointer ${stat.bgColor} ${stat.borderColor}`}
          >
            <div className={`text-2xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-1">+100% 28d</div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Time</option>
          <option value="PROSPECT">Prospects</option>
          <option value="LEAD">Leads</option>
          <option value="OPPORTUNITY">Opportunities</option>
          <option value="CLIENT">Clients</option>
        </select>
      </div>

      {/* Full Screen Contacts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Touchpoint</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Loading contacts...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No contacts found. Try adjusting your search or filters.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                    {contact.company && (
                      <div className="text-sm text-gray-500">{contact.company}</div>
                    )}
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