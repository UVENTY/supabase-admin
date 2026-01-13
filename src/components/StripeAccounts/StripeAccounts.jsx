import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, App } from 'antd'
import { DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { supabase } from '../../supabase/client'

const StripeAccounts = ({ onEdit }) => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const { message, modal } = App.useApp()

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stripe_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      message.error('Error loading accounts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])


  const handleDelete = (account) => {
    modal.confirm({
      title: 'Confirm Deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'This action cannot be undone. Are you sure you want to delete this Stripe account?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('stripe_accounts')
            .delete()
            .eq('id_stripe_account', account.id_stripe_account)

          if (error) throw error
          message.success('Account deleted successfully')
          loadAccounts()
        } catch (error) {
          message.error('Error deleting account: ' + error.message)
        }
      }
    })
  }

  const testConnection = async (account) => {
    try {
      const { loadStripe } = await import('@stripe/stripe-js')
      
      const key = account.is_test_mode ? account.publishable_key_test : account.publishable_key_live
      
      if (!key) {
        throw new Error(`No ${account.is_test_mode ? 'test' : 'live'} key configured for this account`)
      }

      console.log(`Testing connection with ${account.is_test_mode ? 'test' : 'live'} key...`)
      
      const stripe = await loadStripe(key)

      if (!stripe) {
        throw new Error('Failed to initialize Stripe')
      }

      message.success(`✅ Connection to account "${account.name}" successful! ${account.is_test_mode ? 'Test' : 'Live'} mode is working.`)
      console.log('✅ Stripe initialized successfully:', stripe)
    } catch (error) {
      console.error('❌ Stripe connection error:', error)
      message.error(`Connection error: ${error.message}`)
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      render: (text) => <strong>{text}</strong>,
      ellipsis: true
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: text => text || <span style={{ color: '#999' }}>No description</span>,
      ellipsis: {
        showTitle: true
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: '15%',
      align: 'center',
      render: (_, record) => (
        record.is_test_mode ? (
          <Tag color="orange" style={{ fontSize: '13px' }}>Test Mode</Tag>
        ) : (
          <Tag color="green" style={{ fontSize: '13px' }}>Live Mode</Tag>
        )
      )
    },
    {
      title: 'Test',
      key: 'test',
      width: '12%',
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Button
          icon={<CheckCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            testConnection(record)
          }}
          size="large"
          block
        >
          Test
        </Button>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Button
          icon={<DeleteOutlined />}
          danger
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(record)
          }}
          size="large"
          block
        >
          Delete
        </Button>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={accounts}
      loading={loading}
      rowKey="id_stripe_account"
      pagination={{ 
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} accounts`
      }}
      scroll={{ x: 800 }}
      size="middle"
      bordered
      onRow={(record) => ({
        onClick: () => {
          if (onEdit) {
            onEdit(record)
          }
        },
        style: { cursor: 'pointer' }
      })}
    />
  )
}

export default StripeAccounts