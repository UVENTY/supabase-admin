import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Space, Typography, Spin, Alert, App } from 'antd'
import { RobotOutlined, LoadingOutlined } from '@ant-design/icons'
import Sidebar from '../../components/Layout/sidebar'
import { getAIPrompts } from '../../supabase/ai-prompts'
import { sendMessageToAI } from '../../api/ai'
import { fetchData, setTicketsPurchases } from '../../redux/data'
import { getCities, getCountries } from '../../redux/config'
import { useTicketsData } from './hooks/useTicketsData'
import { useTicketPurchases } from './hooks/useTicketPurchases'
import { useContextReady } from './hooks/useContextReady'
import { getEventsContext } from './utils/getEventsContext'
import { getEventOptions } from './utils/getEventOptions'
import { loadEventPurchases } from './utils/loadEventPurchases'
import PromptCard from './components/PromptCard'

const { Title, Paragraph } = Typography

export default function PageAIPrompts() {
  const dispatch = useDispatch()
  const { message: messageApi } = App.useApp()
  
  const [prompts, setPrompts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [executingPrompts, setExecutingPrompts] = useState({}) 
  const [responses, setResponses] = useState({}) 
  const [errors, setErrors] = useState({}) 
  const [selectedEvents, setSelectedEvents] = useState({}) 
  const [expandedPrompts, setExpandedPrompts] = useState({}) 
  const [selectedAI, setSelectedAI] = useState({}) 

  const schedule = useSelector(state => state.data.schedule || {})
  const stadiums = useSelector(state => state.data.stadiums || {})
  const teams = useSelector(state => state.data.teams || {})
  const tournaments = useSelector(state => state.data.tournaments || {})
  const ticketsPurchases = useSelector(state => state.data.ticketsPurchases || {})
  const cities = useSelector(getCities)
  const countries = useSelector(getCountries)

  useEffect(() => {
    dispatch(fetchData())
  }, [dispatch])

  const eventIds = Object.keys(schedule)
  const { data: ticketsData } = useTicketsData(eventIds)

  const selectedEventIds = Object.values(selectedEvents).filter(Boolean)
  const { isLoadingPurchases } = useTicketPurchases(selectedEventIds)

  const { contextReady, setContextReady, loadingContext, setLoadingContext } = useContextReady(
    selectedEvents,
    schedule,
    ticketsData,
    ticketsPurchases,
    isLoadingPurchases
  )

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
      console.error('Ошибка загрузки промтов:', error)
      messageApi.error('Не удалось загрузить промты: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async (prompt) => {
    if (!prompt || !prompt.prompt) {
      messageApi.warning('Промт пуст')
      return
    }

    const selectedEventId = selectedEvents[prompt.id]
    if (!selectedEventId) {
      messageApi.warning('Пожалуйста, выберите событие для выполнения промта')
      return
    }

    setExecutingPrompts(prev => ({ ...prev, [prompt.id]: true }))
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[prompt.id]
      return newErrors
    })
    setResponses(prev => {
      const newResponses = { ...prev }
      delete newResponses[prompt.id]
      return newResponses
    })

    try {
      const eventIdStr = String(selectedEventId)
      if (!ticketsPurchases[eventIdStr]) {
        await loadEventPurchases(selectedEventId, dispatch)
      }
      
      const context = getEventsContext(
        selectedEventId,
        schedule,
        teams,
        stadiums,
        tournaments,
        ticketsData,
        ticketsPurchases,
        cities,
        countries
      )
      
      const aiProvider = selectedAI[prompt.id] || 'groq'
      const response = await sendMessageToAI(prompt.prompt, [], context, aiProvider)
      setResponses(prev => ({ ...prev, [prompt.id]: response }))
    } catch (error) {
      console.error('Ошибка выполнения промта:', error)
      const errorMessage = error.message || 'Не удалось получить ответ от AI'
      setErrors(prev => ({ ...prev, [prompt.id]: errorMessage }))
      messageApi.error('Ошибка выполнения промта: ' + errorMessage)
    } finally {
      setExecutingPrompts(prev => ({ ...prev, [prompt.id]: false }))
    }
  }

  const eventOptions = getEventOptions(schedule, teams)

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <Card style={{ flex: '1 1 0', margin: '0 16px' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Paragraph style={{ marginTop: '16px' }}>Загрузка промтов...</Paragraph>
          </div>
        </Card>
        <Sidebar />
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div style={{ flex: '1 1 0', margin: '0 16px', width: 0, minWidth: 0 }}>
        <Card style={{ marginBottom: '16px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Title level={2}>
              <RobotOutlined /> AI Assistant
            </Title>
            <Paragraph>
              Для получения информации воспользуйтесть AI ассистентом.
            </Paragraph>
          </Space>
        </Card>

        {prompts.length === 0 ? (
          <Card>
            <Alert
              message="Нет доступных промтов"
              description="Промты еще не созданы администратором."
              type="info"
            />
          </Card>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }} wrap>
            {prompts.map((prompt) => (
              <div key={prompt.id} style={{ width: '100%' }}>
                <PromptCard
                key={prompt.id}
                prompt={prompt}
                isExpanded={expandedPrompts[prompt.id]}
                onToggleExpand={() => {
                  setExpandedPrompts(prev => ({
                    ...prev,
                    [prompt.id]: !prev[prompt.id]
                  }))
                }}
                selectedEvent={selectedEvents[prompt.id]}
                onEventChange={(value) => {
                  setSelectedEvents(prev => ({ ...prev, [prompt.id]: value }))

                  setContextReady(prev => ({ ...prev, [prompt.id]: false }))
                  setLoadingContext(prev => ({ ...prev, [prompt.id]: true }))

                  setResponses(prev => {
                    const newResponses = { ...prev }
                    delete newResponses[prompt.id]
                    return newResponses
                  })
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[prompt.id]
                    return newErrors
                  })
                }}
                selectedAI={selectedAI[prompt.id]}
                onAIChange={(value) => {
                  setSelectedAI(prev => ({ ...prev, [prompt.id]: value }))

                  setResponses(prev => {
                    const newResponses = { ...prev }
                    delete newResponses[prompt.id]
                    return newResponses
                  })
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[prompt.id]
                    return newErrors
                  })
                }}
                eventOptions={eventOptions}
                contextReady={contextReady[prompt.id]}
                loadingContext={loadingContext[prompt.id]}
                isExecuting={executingPrompts[prompt.id]}
                onExecute={() => handleExecute(prompt)}
                error={errors[prompt.id]}
                onErrorClose={() => setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors[prompt.id]
                  return newErrors
                })}
                response={responses[prompt.id]}
              />
              </div>
            ))}
          </Space>
        )}
      </div>
      <Sidebar />
    </>
  )
}
