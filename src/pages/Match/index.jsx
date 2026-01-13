import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Col, Row, Form, Button, Select, DatePicker, TimePicker, Checkbox, message } from 'antd'
import { CaretLeftFilled } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { fetchData, getMatch } from '../../redux/data'
import { createSchedule, updateSchedule } from '../../supabase/schedule'

const getOptions = obj => Object.values(obj)
  .map(item => ({ label: item.en, value: item.id }))
  .sort((item1, item2) => item1.label > item2.label ? 1 : -1)

export default function PageMatch() {
  const [ messageApi, contextHolder ] = message.useMessage()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'create'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLoaded = useSelector(state => state.data.isLoaded)
  const isLoading = useSelector(state => state.data.isLoading)
  const teams = useSelector(state => state.data.teams)
  const tournaments = useSelector(state => state.data.tournaments)
  const stadiums = useSelector(state => state.data.stadiums)
  const match = useSelector(state => getMatch(state, id))
  const queryClient = useQueryClient()

  const teamsOptions = useMemo(() => getOptions(teams), [teams])
  const tournamentsOptions = useMemo(() => getOptions(tournaments), [tournaments])
  const stadiumsOptions = useMemo(() => getOptions(stadiums), [stadiums])

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      dispatch(fetchData())
    }
  }, [isLoaded, isLoading])

  if (!match && !isNew) {
    return null
  }

  const date = match ? dayjs.utc(match.datetime) : dayjs.utc()

  const initialValues = !match ? {} : {
    team1: match.team1.id,
    team2: match.team2.id,
    date,
    time: date,
    stadium: match.stadium && match.stadium.id,
    tournament: match.tournament && match.tournament.id,
    top: match.top === '1'
  }

  return (
    <Form
      layout='vertical'
      onFinish={async (values) => {
        setIsSubmitting(true)
        try {
          const { team1, team2, date, time, stadium, tournament, top } = values
          const datetime = `${date.format('YYYY-MM-DD')} ${time.format('HH:mm:ss')}+03:00`
          const scheduleData = { 
            team1, 
            team2, 
            stadium, 
            tournament, 
            datetime, 
            top: top ? '1' : '0',
            time_zone: '+03:00'
          }

          let result
          if (isNew) {
            console.log('📡 Creating new match...')
            result = await createSchedule(scheduleData)
          } else {
            console.log('📡 Updating match...', id)
            result = await updateSchedule(id, scheduleData)
          }

          if (result.error) {
            console.error('❌ Match save error:', result.error)
            messageApi.error(`Ошибка при сохранении матча: ${result.error.message || 'Неизвестная ошибка'}`)
            return
          }

          queryClient.invalidateQueries({ queryKey: ['data'] })
          dispatch(fetchData())
          
          messageApi.success(`Матч успешно ${isNew ? 'создан' : 'обновлен'}!`)
          navigate('/matches')
        } catch (error) {
          console.error('❌ Match save exception:', error)
          messageApi.error(`Ошибка при сохранении матча: ${error.message || 'Неизвестная ошибка'}`)
        } finally {
          setIsSubmitting(false)
        }
      }}
      initialValues={initialValues}
    >
      <Row
        style={{
          borderBottom: '1px solid #ccc',
          padding: '10px'
        }}
      >
        <Button
          icon={<CaretLeftFilled />}
          style={{ marginRight: '10px' }}
          onClick={() => navigate('/matches')}
        >
          Back
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
        >
          {isNew ? 'Create' : 'Save'}
        </Button>
      </Row>
      <Row style={{ margin: '20px 20px 0 20px' }}>
        <Col
          span={12}
          style={{ padding: '0 10px 0 0' }}
        >
          <Form.Item
            label='Home team'
            name='team1'
            rules={[{ required: true, message: 'Please input home team' }]}
          >
            <Select
              size='large'
              placeholder='Home team'
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={teamsOptions}
              style={{ width: '100%' }}
              showSearch
            />
          </Form.Item>
        </Col>
        <Col
          span={12}
          style={{ padding: '0 0 0 10px' }}
        >
          <Form.Item
            label='Guest team'
            name='team2'
            rules={[{ required: true, message: 'Please input guest team' }]}
          >
            <Select
              size='large'
              placeholder='Guest team'
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={teamsOptions}
              style={{ width: '100%' }}
              showSearch
            />
          </Form.Item>
        </Col>
      </Row>
      <Row style={{ margin: '0 20px' }}>
        <Col span={6} style={{ padding: '0 10px 0 0' }}>
          <Form.Item
            label='Date'
            name='date'
            rules={[{ required: true, message: 'Please input date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={6} style={{ padding: '0 10px 0 0' }}>
          <Form.Item
            label='Time'
            name='time'
            rules={[{ required: true, message: 'Please input time' }]}
          >
            <TimePicker
              value={date}
              style={{ width: '100%' }}
              format='HH:mm'
            />
          </Form.Item>
        </Col>
        <Col
          span={12}
          style={{ padding: '0 0 0 10px' }}
        >
          <Form.Item
            label='Stadium'
            name='stadium'
          >
            <Select
              placeholder='Stadium'
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={stadiumsOptions}
              style={{ width: '100%' }}
              showSearch
            />
          </Form.Item>
        </Col>
      </Row>
      <Row style={{ margin: '0 20px' }}>
        <Col span={24}>
          <Form.Item
            label='Tournament'
            name='tournament'
            rules={[{ required: true, message: 'Please input tournament' }]}
          >
            <Select
              placeholder='Tournament'
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={tournamentsOptions}
              style={{ width: '100%' }}
              showSearch
            />
          </Form.Item>
        </Col>
      </Row>
      <Row style={{ margin: '0 20px' }}>
        <Col span={24}>
          <Form.Item
            name='top'
            valuePropName='checked'
          >
            <Checkbox>Top match</Checkbox>
          </Form.Item>
        </Col>
      </Row>
      {contextHolder}
    </Form>
  )
}