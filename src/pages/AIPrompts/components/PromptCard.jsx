import { Card, Button, Space, Typography, Spin, Alert, Input, Select } from 'antd'
import { PlayCircleOutlined, LoadingOutlined, RobotOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import AIResponse from './AIResponse'

const { TextArea } = Input
const { Paragraph } = Typography

export default function PromptCard({
  prompt,
  isExpanded,
  onToggleExpand,
  selectedEvent,
  onEventChange,
  selectedAI,
  onAIChange,
  eventOptions,
  contextReady,
  loadingContext,
  isExecuting,
  onExecute,
  error,
  onErrorClose,
  response
}) {
  return (
    <Card
      style={{ 
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.transform = ''
      }}
      onClick={onToggleExpand}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text strong style={{ fontSize: '16px' }}>
            {prompt.name || `Промт #${prompt.id}`}
          </Typography.Text>
          {isExpanded ? (
            <UpOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
          ) : (
            <DownOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
          )}
        </div>
      }
      styles={{
        body: isExpanded ? {} : { display: 'none', padding: 0 }
      }}
    >
      {isExpanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Промт:
              </Typography.Text>
              <TextArea
                value={prompt.prompt}
                readOnly
                autoSize={{ minRows: 3, maxRows: 6 }}
                style={{
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Выберите событие: <span style={{ color: 'red' }}>*</span>
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите событие для выполнения промта"
                value={selectedEvent}
                onChange={onEventChange}
                options={eventOptions}
                showSearch={false}
                allowClear={false}
              />
            </div>

            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Выберите модель AI <span style={{ color: 'red' }}>*</span>
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите AI провайдера"
                value={selectedAI || 'gemini'}
                onChange={onAIChange}
                options={[
                  { label: 'Gemini (text)', value: 'gemini' },
                  { label: 'Groq (text)', value: 'groq' },
                  { label: 'Reve (image)', value: 'reve' }
                ]}
              />
            </div>

            <Button
              type="primary"
              icon={loadingContext ? <LoadingOutlined /> : <PlayCircleOutlined />}
              onClick={onExecute}
              loading={isExecuting || loadingContext}
              disabled={!selectedEvent || !contextReady || loadingContext}
              block
              size="large"
            >
              {loadingContext ? 'Формирование контекста...' : 'Выполнить'}
            </Button>

            {isExecuting && (
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                <Paragraph style={{ marginTop: '8px', marginBottom: 0, fontSize: '12px' }}>
                  AI обрабатывает запрос...
                </Paragraph>
              </div>
            )}

            {error && (
              <Alert
                message="Ошибка"
                description={error}
                type="error"
                closable
                onClose={onErrorClose}
              />
            )}

            {response && <AIResponse response={response} />}
          </Space>
        </div>
      )}
    </Card>
  )
}
