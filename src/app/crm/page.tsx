'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { CRMStats } from '@/components/crm/CRMStats'
import { CRMFilters } from '@/components/crm/CRMFilters'
import { ContactsTable } from '@/components/crm/ContactsTable'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from 'next-auth/react'

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

export default function CRMPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentContact, setCurrentContact] = useState<Contact | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    primaryEmail: '',
    primaryPhone: '',
    company: '',
    industry: '',
    website: '',
    notes: '',
    source: '',
    status: 'PROSPECT' as const
  })

  const handleAddContact = () => {
    setIsEditing(false)
    setCurrentContact(null)
    setFormData({
      name: '',
      primaryEmail: '',
      primaryPhone: '',
      company: '',
      industry: '',
      website: '',
      notes: '',
      source: '',
      status: 'PROSPECT'
    })
    setIsModalOpen(true)
  }

  const handleEditContact = (contact: Contact) => {
    setIsEditing(true)
    setCurrentContact(contact)
    setFormData({
      name: contact.name,
      primaryEmail: contact.primaryEmail,
      primaryPhone: contact.primaryPhone || '',
      company: contact.company || '',
      industry: '',
      website: '',
      notes: '',
      source: contact.source || '',
      status: contact.status as any
    })
    setIsModalOpen(true)
  }

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return
    }

    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRefreshKey(prev => prev + 1)
      } else {
        alert('Failed to delete contact')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete contact')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user?.id) {
      alert('You must be logged in to create contacts')
      return
    }

    try {
      const url = isEditing ? `/api/crm/contacts/${currentContact?.id}` : '/api/crm/contacts'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          userId: parseInt(session.user.id)
        })
      })

      if (response.ok) {
        setIsModalOpen(false)
        setRefreshKey(prev => prev + 1)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save contact')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to save contact')
    }
  }

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    alert('CSV export functionality will be implemented soon')
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-600 mt-2">
            Manage your contacts, leads, and customer relationships
          </p>
        </div>

        {/* CRM Statistics */}
        <CRMStats key={refreshKey} />

        {/* Filters and Search */}
        <CRMFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          sourceFilter={sourceFilter}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onSourceChange={setSourceFilter}
          onAddContact={handleAddContact}
          onExportCSV={handleExportCSV}
        />

        {/* Contacts Table */}
        <ContactsTable
          key={refreshKey}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          sourceFilter={sourceFilter}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
        />

        {/* Add/Edit Contact Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
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
                      <SelectItem value="PROSPECT">Prospect</SelectItem>
                      <SelectItem value="LEAD">Lead</SelectItem>
                      <SelectItem value="OPPORTUNITY">Opportunity</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="CHURNED">Churned</SelectItem>
                      <SelectItem value="DECLINED">Declined</SelectItem>
                      <SelectItem value="UNQUALIFIED">Unqualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="primaryEmail">Email *</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryEmail: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryPhone">Phone</Label>
                  <Input
                    id="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="e.g. Website, Referral, LinkedIn"
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this contact"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Update Contact' : 'Create Contact'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
} 