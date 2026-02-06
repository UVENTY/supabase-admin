import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Typography, Spin, Alert, App, Input } from 'antd'
import { RobotOutlined, ArrowLeftOutlined, PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import Sidebar from '../../components/Layout/sidebar'
import { getAIPromptById } from '../../supabase/ai-prompts'
import { sendMessageToAI } from '../../api/ai'

const { TextArea } = Input
const { Title, Paragraph } = Typography

export default function PageAIAssistantExecute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message: messageApi } = App.useApp()
  
  const [prompt, setPrompt] = useState(null)
  const [aiResponse, setAiResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPrompt()
  }, [id])

  const loadPrompt = async () => {
    if (!id) {
      setError('Prompt ID not specified')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const { data, error: promptError } = await getAIPromptById(id)
      if (promptError) {
        throw promptError
      }
      if (!data) {
        throw new Error('Prompt not found')
      }
      setPrompt(data)
    } catch (error) {
      console.error('Error loading prompt:', error)
      setError(error.message || 'Failed to load prompt')
      messageApi.error('Failed to load prompt: ' + (error.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!prompt || !prompt.prompt) {
      messageApi.warning('Prompt is empty')
      return
    }

    setIsExecuting(true)
    setError(null)
    setAiResponse('')

    try {
      const response = await sendMessageToAI(prompt.prompt, [])
      setAiResponse(response)
    } catch (error) {
      console.error('Error executing prompt:', error)
      setError(error.message || 'Failed to get response from AI')
      messageApi.error('Error executing prompt: ' + (error.message || 'Unknown error'))
    } finally {
      setIsExecuting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <Card style={{ flex: '1 1 0', margin: '0 16px' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Paragraph style={{ marginTop: '16px' }}>Loading prompt...</Paragraph>
          </div>
        </Card>
        <Sidebar />
      </>
    )
  }

  if (error && !prompt) {
    return (
      <>
        <Sidebar />
        <Card style={{ flex: '1 1 0', margin: '0 16px' }}>
          <Alert
            message="Error"
            description={error}
            type="error"
            action={
              <Button size="small" onClick={() => navigate('/ai-assistant')}>
                Back to list
              </Button>
            }
          />
        </Card>
        <Sidebar />
      </>
    )
  }

  return (
    <>
      <Sidebar buttons sticky>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/ai-assistant')} 
          block
        >
          Back to list
        </Button>
      </Sidebar>
      <div style={{ flex: '1 1 0', margin: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={2}>
                <RobotOutlined /> Execute prompt
              </Title>
            </div>

            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                closable
                onClose={() => setError(null)}
              />
            )}

            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Prompt:
              </Typography.Text>
              <TextArea
                value={prompt?.prompt || ''}
                readOnly
                autoSize={{ minRows: 4, maxRows: 10 }}
                style={{ 
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecute}
              loading={isExecuting}
              size="large"
              block
            >
              Execute
            </Button>

            {isExecuting && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                <Paragraph style={{ marginTop: '12px', marginBottom: 0 }}>
                  AI is processing the request...
                </Paragraph>
              </div>
            )}

            {aiResponse && (
              <div>
                <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  <RobotOutlined /> AI Response:
                </Typography.Text>
                <Card 
                  style={{ 
                    backgroundColor: '#f0f7ff',
                    border: '1px solid #91d5ff'
                  }}
                >
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {aiResponse}
                  </Paragraph>
                </Card>
              </div>
            )}
          </Space>
        </Card>
      </div>
      <Sidebar />
    </>
  )
}
