import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, App } from 'antd'
import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons'
import Sidebar from '../../components/Layout/sidebar'
import { getAIPrompts, deleteAIPrompt } from '../../supabase/ai-prompts'
import { getColumnSearch } from '../../utils/components'

const getColumns = (handleDeletePrompt, deletingPromptId) => [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    width: 200,
    ...getColumnSearch('name', { getData: 'name' }),
    render: (text) => text || '-'
  },
  {
    title: 'Prompt',
    dataIndex: 'prompt',
    key: 'prompt',
    ellipsis: true,
    ...getColumnSearch('prompt', { getData: 'prompt' })
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    align: 'center',
    render: (_, record) => (
      <Button
        icon={<DeleteOutlined />}
        danger
        onClick={(e) => {
          e.stopPropagation()
          handleDeletePrompt(record)
        }}
        disabled={deletingPromptId === record.id}
        size="large"
        block
      >
        Delete
      </Button>
    )
  }
]

export default function PageAIAssistant() {
  const navigate = useNavigate()
  const { message: messageApi, modal } = App.useApp()
  const [prompts, setPrompts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingPromptId, setDeletingPromptId] = useState(null)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getAIPrompts()
      if (error) {
        throw error
      }
      setPrompts(data || [])
    } catch (error) {
      console.error('Error loading prompts:', error)
      messageApi.error('Failed to load prompts: ' + (error.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePrompt = async (prompt) => {
    modal.confirm({
      title: 'Confirm deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'Are you sure you want to delete this prompt? This action cannot be undone.',
      okText: 'Yes, delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        setDeletingPromptId(prompt.id)
        try {
          const { error } = await deleteAIPrompt(prompt.id)
          if (error) {
            throw error
          }
          messageApi.success('Prompt successfully deleted')
          loadPrompts()
        } catch (error) {
          console.error('Error deleting prompt:', error)
          messageApi.error('Failed to delete prompt: ' + (error.message || 'Unknown error'))
        } finally {
          setDeletingPromptId(null)
        }
      }
    })
  }

  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<PlusOutlined />} type='primary' onClick={() => navigate('/ai-assistant/create')} block>
          Create
        </Button>
      </Sidebar>
      <Table
        style={{ flex: '1 1 0' }}
        columns={getColumns(handleDeletePrompt, deletingPromptId)}
        dataSource={prompts}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total prompts: ${total}`
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/ai-assistant/${record.id}`),
          style: { cursor: 'pointer' }
        })}
      />
      <Sidebar />
    </>
  )
}
