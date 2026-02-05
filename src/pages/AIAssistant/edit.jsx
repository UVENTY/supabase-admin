import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Form, Button, Input, App } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import Sidebar from '../../components/Layout/sidebar'
import { getAIPromptById, updateAIPrompt, createAIPrompt } from '../../supabase/ai-prompts'

const { TextArea } = Input

export default function PageAIAssistantEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message: messageApi } = App.useApp()
  const isNew = id === 'create'
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    if (!isNew) {
      loadPrompt()
    } else {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    if (prompt && !isNew) {
      form.setFieldsValue({ 
        name: prompt.name || '',
        prompt: prompt.prompt 
      })
    }
  }, [prompt, isNew, form])

  const loadPrompt = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getAIPromptById(id)
      if (error) {
        throw error
      }
      if (!data) {
        messageApi.error('Prompt not found')
        navigate('/ai-assistant')
        return
      }
      setPrompt(data)
    } catch (error) {
      console.error('Error loading prompt:', error)
      messageApi.error('Failed to load prompt: ' + (error.message || 'Unknown error'))
      navigate('/ai-assistant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    if (!values.prompt || !values.prompt.trim()) {
      messageApi.warning('Prompt cannot be empty')
      return
    }

    setIsSubmitting(true)
    try {
      let result
      if (isNew) {
        result = await createAIPrompt(values.name, values.prompt)
      } else {
        result = await updateAIPrompt(id, values.name, values.prompt)
      }

      if (result.error) {
        throw result.error
      }

      messageApi.success(`Prompt successfully ${isNew ? 'created' : 'updated'}`)
      navigate('/ai-assistant')
    } catch (error) {
      console.error('Error saving prompt:', error)
      messageApi.error('Failed to save prompt: ' + (error.message || 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <div style={{ flex: '1 1 0', margin: '0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div>Loading...</div>
        </div>
        <Sidebar />
      </>
    )
  }

  if (!isNew && !prompt) {
    return (
      <>
        <Sidebar />
        <div style={{ flex: '1 1 0', margin: '0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div>Prompt not found</div>
        </div>
        <Sidebar />
      </>
    )
  }

  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ai-assistant')} block>
          Back
        </Button>
        <Button 
          icon={<SaveOutlined />} 
          type="primary" 
          onClick={() => form.submit()} 
          loading={isSubmitting} 
          block
        >
          Save
        </Button>
      </Sidebar>
      <Form
        style={{ flex: '1 1 0', margin: '20px' }}
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={isNew ? { 
          name: '',
          prompt: '' 
        } : {
          name: prompt?.name || '',
          prompt: prompt?.prompt || '' 
        }}
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { max: 255, message: 'Name must not exceed 255 characters' }
          ]}
        >
          <Input
            placeholder="Enter prompt name (optional)..."
            disabled={isSubmitting}
          />
        </Form.Item>
        <Form.Item
          name="prompt"
          label="Prompt"
          rules={[
            { required: true, message: 'Prompt is required' },
            { min: 3, message: 'Prompt must contain at least 3 characters' }
          ]}
        >
          <TextArea
            placeholder="Enter your prompt here..."
            autoSize={{ minRows: 10, maxRows: 20 }}
            disabled={isSubmitting}
          />
        </Form.Item>
      </Form>
      <Sidebar />
    </>
  )
}
