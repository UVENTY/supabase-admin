import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Table, Tag, Card } from 'antd'
import { CheckOutlined, PlusOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { getColumnSearch } from '../../utils/components'
import { USER_ROLES, USER_ROLES_COLOR } from '../../consts'
import Sidebar from '../../components/Layout/sidebar'
import { getUsers } from '../../supabase/users'
import CreateUser from '../User/create'

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (name, { family }) => [name, family].filter(item => item).join(' ') || 'No name',
    ...getColumnSearch('name', { getData: record => ([record.name, record.family].join(' ')) })
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    render: email => email || 'No email',
    ...getColumnSearch('email')
  },
  {
    title: 'Role',
    dataIndex: 'id_role',
    key: 'id_role',
    render: text => (<Tag color={USER_ROLES_COLOR[text]}>{USER_ROLES[text]}</Tag>),
    filters: Object.keys(USER_ROLES).map(id => ({
      text: USER_ROLES[id],
      value: Number(id) 
    })),
    onFilter: (value, record) => Number(record.id_role) === Number(value)
  },
  {
    title: 'Checked seller',
    dataIndex: 'id_verification_status',
    key: 'id_verification_status',
    render: (state, record) => record.id_role === '2' && state === '2' ? <CheckOutlined style={{ color: '#09d934' }} /> : ''
  }
]

export default function PageUsers() {
  const navigate = useNavigate()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef(null)

  const handleUserCreated = () => {
    setShowCreateForm(false)
    setIsSubmitting(false)
  }

  const handleBack = () => {
    setShowCreateForm(false)
  }

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.submit()
    }
  }

  const { isLoading, data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: users, error } = await getUsers()
      
      if (error) {
        console.error('❌ Error fetching users:', error)
        return []
      }

      return (users || []).map(user => ({
        id_user: user.id_user,
        id_role: user.id_role,
        phone: user.phone,
        email: user.email,
        name: user.name,
        family: user.family,
        middle: user.middle,
        id_verification_status: user.id_verification_status
      }))
    }
  })

  return (<>
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
          onClick={() => setShowCreateForm(true)} 
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
          title="Create New User"
        >
          <CreateUser 
            ref={formRef}
            onUserCreated={handleUserCreated}
            onCancel={() => setShowCreateForm(false)}
            onLoadingChange={(loading) => setIsSubmitting(loading)}
          />
        </Card>
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowKey={({ id_user }) => id_user}
          onRow={record => ({
            onClick: () => navigate(`/users/${record.id_user}`)
          })}
        />
      )}
    </div>
    <Sidebar />
  </>
  )
}