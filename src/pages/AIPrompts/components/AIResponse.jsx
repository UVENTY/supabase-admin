import { Card, Typography, Button, Space } from 'antd'
import { RobotOutlined, DownloadOutlined } from '@ant-design/icons'
import { downloadBlob } from '../../../utils/utils'

const { Paragraph } = Typography

export default function AIResponse({ response }) {
  if (!response) return null

  const handleDownloadImage = async () => {
    try {
      let imageBlob = null
      let filename = `ai-generated-image-${Date.now()}.png`
 
      if (response.imageUrl) {
        const imageResponse = await fetch(response.imageUrl)
        imageBlob = await imageResponse.blob()
      } 
      else if (response.base64Image || response.imageBase64) {
        const base64Data = response.base64Image || response.imageBase64
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        imageBlob = new Blob([byteArray], { type: 'image/png' })
      }

      if (imageBlob) {
        downloadBlob(imageBlob, filename)
      }
    } catch (error) {
      console.error('Ошибка при скачивании изображения:', error)
    }
  }

  const isImageResponse = typeof response === 'object' && (response.type === 'image' || response.imageUrl || response.base64Image || response.imageBase64)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Typography.Text strong>
          <RobotOutlined /> Ответ AI:
        </Typography.Text>
        {isImageResponse && (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadImage}
            style={{ paddingTop: '5px', paddingBottom: '5px', minHeight: '34px' }}
          >
            Скачать изображение
          </Button>
        )}
      </div>
      <Card
        style={{
          backgroundColor: '#f0f7ff',
          border: '1px solid #91d5ff',
          marginTop: '8px'
        }}
      >
        {isImageResponse ? (
          <div>
            {(response.imageUrl || response.base64Image) && (
              <div style={{ marginBottom: '12px' }}>
                {response.imageUrl ? (
                  <img 
                    src={response.imageUrl} 
                    alt="Сгенерированное изображение" 
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                ) : (
                  <img 
                    src={`data:image/png;base64,${response.base64Image || response.imageBase64}`} 
                    alt="Сгенерированное изображение" 
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                )}
              </div>
            )}
            {response.imageBase64 && !response.base64Image && (
              <div style={{ marginBottom: '12px' }}>
                <img 
                  src={`data:image/png;base64,${response.imageBase64}`} 
                  alt="Сгенерированное изображение" 
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            )}
            {response.content && (
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                {response.content}
              </Paragraph>
            )}
          </div>
        ) : (
          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
            {response}
          </Paragraph>
        )}
      </Card>
    </div>
  )
}
