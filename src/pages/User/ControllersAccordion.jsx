import { useEffect, useState, useRef } from 'react'
import { Table, App, Button, Card } from 'antd'
import { PlusOutlined, SaveOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import CreateUser from './create'
import { getUsersByRole } from '../../supabase/users'
import { supabase } from '../../supabase/client'

export default function ControllersAccordion({ eventId }) {
  const [controllers, setControllers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingController, setDeletingController] = useState(false)
  const formRef = useRef(null)
  const { message, modal } = App.useApp()

  const fetchControllers = async () => {
    setLoading(true)
    try {
      const { data, error } = await getUsersByRole(6)
      
      if (error) {
        console.error('❌ Error fetching controllers:', error)
        message.error('Ошибка загрузки списка контролёров')
        return
      }

      let filteredData = data || []
      if (eventId) {
        filteredData = filteredData.filter(user => 
          !user.id_schedule || user.id_schedule === Number(eventId)
        )
      }

      setControllers(filteredData)
    } catch (e) {
      console.error('Error fetching controllers:', e)
      message.error('Ошибка загрузки списка контролёров')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchControllers()
  }, [eventId])

  const handleUserCreated = () => {
    fetchControllers()
    setShowCreateForm(false) 
  }

  const handleDeleteController = (controller) => {
    modal.confirm({
      title: 'Confirm Deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'This action cannot be undone. Are you sure you want to delete this controller?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        setDeletingController(true)
        try {
          const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('id_user', controller.id_user)

          if (userError) throw userError

          try {
            const userEmail = controller.email
            if (userEmail) {
              console.log('⚠️ User deleted from users table. Auth user may still exist:', userEmail)
            }
          } catch (authError) {
            console.warn('Warning: Could not delete user from Auth:', authError)
          }

          message.success('Controller deleted successfully')
          fetchControllers() 
        } catch (error) {
          console.error('Error deleting controller:', error)
          message.error('Error deleting controller: ' + error.message)
        } finally {
          setDeletingController(false)
        }
      }
    })
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        {controllers.length > 0 && <h4>Existing Controllers</h4>}
        <Table
          dataSource={controllers}
          loading={loading}
          rowKey="id_user"
          pagination={false}
          size="small"
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Last Name', dataIndex: 'family' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Phone', dataIndex: 'phone' },
            { 
              title: 'Event', 
              dataIndex: 'id_schedule',
              render: (scheduleId) => scheduleId ? `Event ${scheduleId}` : 'All events'
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 120,
              align: 'center',
              render: (_, record) => (
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteController(record)
                  }}
                  disabled={deletingController}
                  size="large"
                  block
                >
                  Delete
                </Button>
              )
            }
          ]}
          locale={{ emptyText: eventId ? 'No controllers for this event' : 'No controllers' }}
        />
      </div>

      <h4 style={{ marginBottom: '16px' }}>Create New Controller</h4>
      {!showCreateForm && (
        <Button 
          type="dashed" 
          onClick={() => setShowCreateForm(true)} 
          block 
          icon={<PlusOutlined />}
          style={{ marginBottom: 16 }}
        >
          Add Controller
        </Button>
      )}
      
      {showCreateForm && (
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Button
              type="link"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </Button>
          }
        >
          <CreateUser 
            ref={formRef}
            onUserCreated={handleUserCreated} 
            eventId={eventId}
            onCancel={() => setShowCreateForm(false)}
            onLoadingChange={(loading) => setIsSubmitting(loading)}
          />
          <div style={{ marginTop: 24 }}>
            <Button 
              icon={<SaveOutlined />} 
              type='primary' 
              onClick={() => {
                if (formRef.current) {
                  formRef.current.submit()
                }
              }}
              loading={isSubmitting}
              block
            >
              Create Controller
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 