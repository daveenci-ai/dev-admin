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
import { Edit, Trash2, Phone, Mail } from 'lucide-react'

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

interface ContactsTableProps {
  searchTerm: string
  statusFilter: string
  sourceFilter: string
  onEdit: (contact: Contact) => void
  onDelete: (contactId: number) => void
}

export function ContactsTable({
  searchTerm,
  statusFilter,
  sourceFilter,
  onEdit,
  onDelete
}: ContactsTableProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchContacts()
  }, [searchTerm, statusFilter, sourceFilter, pagination.page])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        status: statusFilter,
        source: sourceFilter
      })

      const response = await fetch(`/api/crm/contacts?${params}`)
      const data = await response.json()
      
      setContacts(data.contacts || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }))
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'CLIENT':
        return 'bg-green-100 text-green-800'
      case 'OPPORTUNITY':
        return 'bg-blue-100 text-blue-800'
      case 'LEAD':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROSPECT':
        return 'bg-gray-100 text-gray-800'
      case 'CHURNED':
        return 'bg-red-100 text-red-800'
      case 'DECLINED':
        return 'bg-red-100 text-red-800'
      case 'UNQUALIFIED':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatLastTouchpoint = (touchpoints: Contact['touchpoints']) => {
    if (!touchpoints || touchpoints.length === 0) {
      return 'No touchpoints'
    }
    
    const latest = touchpoints[0]
    return format(new Date(latest.createdAt), 'MMM dd, yyyy')
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
              <TableHead>Full Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Last Touchpoint</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(contact.status)}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{contact.source || 'Unknown'}</TableCell>
                  <TableCell>
                    <a 
                      href={`mailto:${contact.primaryEmail}`}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{contact.primaryEmail}</span>
                    </a>
                  </TableCell>
                  <TableCell>
                    {contact.primaryPhone ? (
                      <a 
                        href={`tel:${contact.primaryPhone}`}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{contact.primaryPhone}</span>
                      </a>
                    ) : (
                      'No phone'
                    )}
                  </TableCell>
                  <TableCell>{contact.company || 'No company'}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatLastTouchpoint(contact.touchpoints)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(contact.id)}
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