import React, { useState, useRef } from 'react'
import { Button, Card } from 'antd'
import { PlusOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import StripeAccounts from '../../components/StripeAccounts/StripeAccounts'
import StripeAccountForm from '../../components/StripeAccounts/StripeAccountForm'
import Sidebar from '../../components/Layout/sidebar'

export default function PageStripeAccounts() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const formRef = useRef(null)

  const handleAccountSaved = () => {
    setShowCreateForm(false)
    setEditingAccount(null)
    setIsSubmitting(false)
    setRefreshKey(prev => prev + 1) 
  }

  const handleBack = () => {
    setShowCreateForm(false)
    setEditingAccount(null)
  }

  const handleSave = () => {
    if (formRef.current) {
      setIsSubmitting(true)
      formRef.current.submit()
    }
  }

  const handleEdit = (account) => {
    setEditingAccount(account)
    setShowCreateForm(true)
  }

  return (
    <>
      <Sidebar buttons sticky>
        {showCreateForm ? (
          <>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack} 
              block
            >
              Back
            </Button>
            <Button 
              icon={<SaveOutlined />} 
              type='primary' 
              onClick={handleSave}
              loading={isSubmitting}
              block
            >
              Save
            </Button>
          </>
        ) : (
          <Button 
            icon={<PlusOutlined />} 
            type='primary' 
            onClick={() => {
              setEditingAccount(null)
              setShowCreateForm(true)
            }} 
            block
          >
            Create
          </Button>
        )}
      </Sidebar>
      <div style={{ flex: '1 1 0', padding: '20px' }}>
        {showCreateForm ? (
          <Card
            style={{ marginBottom: '20px' }}
            title={editingAccount ? 'Edit Stripe Account' : 'Create New Stripe Account'}
          >
            <StripeAccountForm 
              ref={formRef}
              editingAccount={editingAccount}
              onSaved={handleAccountSaved}
              onLoadingChange={(loading) => setIsSubmitting(loading)}
            />
          </Card>
        ) : (
          <StripeAccounts key={refreshKey} onEdit={handleEdit} />
        )}
      </div>
      <Sidebar />
    </>
  )
}