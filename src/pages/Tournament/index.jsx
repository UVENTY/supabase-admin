import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Col, Row, Form, Button, message } from 'antd'
import { ArrowLeftOutlined, CaretLeftFilled, SaveOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import MultilangInput from '../../components/MultilangInput'
import { fetchData, getTournament } from '../../redux/data'
import { createTournament, updateTournament } from '../../supabase/tournament'
import Sidebar from '../../components/Layout/sidebar'

export default function PageTournament() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'create'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLoaded = useSelector(state => state.data.isLoaded)
  const isLoading = useSelector(state => state.data.isLoading)
  const tournament = useSelector(state => getTournament(state, id))
  const [ form ] = Form.useForm()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!isLoaded && !isLoading) {
      dispatch(fetchData())
    }
  }, [isLoaded, isLoading, dispatch])

  useEffect(() => {
    if (!tournament && !isNew && isLoaded && !isLoading) {
      dispatch(fetchData())
    }
  }, [tournament, isNew, isLoaded, isLoading, id, dispatch])
  
  if (!tournament && !isNew) {
    if (isLoading) {
      return <div>Загрузка...</div>
    }
    return <div>Турнир не найден. ID: {id}</div>
  }

  const initialValues = !tournament ? {} : {
    name: {
      en: tournament.en || '',
      ru: tournament.ru || '',
      ar: tournament.ar || '',
      fr: tournament.fr || '',
      es: tournament.es || ''
    },
    about: {
      en: tournament.about_en || '',
      ru: tournament.about_ru || '',
      ar: tournament.about_ar || '',
      fr: tournament.about_fr || '',
      es: tournament.about_es || ''
    }
  }

  return (<>
    <Sidebar buttons sticky>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tournaments')} block>Back</Button>
      <Button icon={<SaveOutlined />} type='primary' onClick={() => form.submit()} loading={isSubmitting} block>Save</Button>
    </Sidebar>
    <Form
      style={{ flex: '1 1 0'}}
      form={form}
      layout='vertical'
      onFinish={async (values) => {
        setIsSubmitting(true)
        try {
          const { name, about } = values
          const tournamentData = {
            en: name?.en || '',
            ru: name?.ru || '',
            ar: name?.ar || '',
            fr: name?.fr || '',
            es: name?.es || '',
            about_en: about?.en || '',
            about_ru: about?.ru || '',
            about_ar: about?.ar || '',
            about_fr: about?.fr || '',
            about_es: about?.es || ''
          }

          let result
          if (isNew) {
            console.log('📡 Creating new tournament...')
            result = await createTournament(tournamentData)
          } else {
            console.log('📡 Updating tournament...', id)
            result = await updateTournament(id, tournamentData)
          }

          if (result.error) {
            console.error('❌ Tournament save error:', result.error)
            message.error(`Ошибка при сохранении турнира: ${result.error.message || 'Неизвестная ошибка'}`)
            setIsSubmitting(false)
            return
          }

          try {
            await dispatch(fetchData())
            console.log('✅ Данные обновлены после сохранения турнира')
          } catch (fetchError) {
            console.error('❌ Error fetching data after save:', fetchError)
          }
          
          await queryClient.invalidateQueries({ queryKey: ['data'] })
          await queryClient.refetchQueries({ queryKey: ['data'] })
          
          message.success(`Турнир успешно ${isNew ? 'создан' : 'обновлен'}!`)
          
          setTimeout(() => {
            navigate('/tournaments')
          }, 300)
        } catch (error) {
          console.error('❌ Tournament save exception:', error)
          message.error(`Ошибка при сохранении турнира: ${error.message || 'Неизвестная ошибка'}`)
        } finally {
          setIsSubmitting(false)
        }
      }}
      initialValues={initialValues}
    >
      <Row style={{ margin: '20px 20px 0 20px' }}>
        <Col
          span={12}
          style={{ padding: '0 10px 0 0' }}
        >
          <Form.Item
            label='Name'
            name='name'
          >
            <MultilangInput
              size='large'
            />
          </Form.Item>
        </Col>
        <Col
          span={12}
          style={{ padding: '0 0 0 10px' }}
        >
          <Form.Item
            label='About'
            name='about'
          >
            <MultilangInput
              size='large'
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
    <Sidebar />
    </> )
}