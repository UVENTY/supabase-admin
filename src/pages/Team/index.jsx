import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Col, Row, Form, Button, Select, Upload, message } from 'antd'
import { ArrowLeftOutlined, CaretLeftFilled, SaveOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import InputImage from '../../components/InputImage'
import MultilangInput from '../../components/MultilangInput'
import { fetchData, getTeam } from '../../redux/data'
import { getCities, getCountries } from '../../redux/config'
import { createTeam, updateTeam } from '../../supabase/team'
import Sidebar from '../../components/Layout/sidebar'

const getOptions = obj => Object.values(obj)
  .map(item => ({ label: item.en, value: item.id }))
  .sort((item1, item2) => item1.label > item2.label ? 1 : -1)

const getFile = e => {
  if (Array.isArray(e)) {
    return e[0]
  }
  return e && e.file
}

export default function PageTeam() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'create'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLoaded = useSelector(state => state.data.isLoaded)
  const isLoading = useSelector(state => state.data.isLoading)
  const stadiums = useSelector(state => state.data.stadiums)
  const cities = useSelector(getCities)
  const countries = useSelector(getCountries)
  const team = useSelector(state => getTeam(state, id))
  const queryClient = useQueryClient()

  const countriesOptions = useMemo(() => getOptions(countries), [countries])
  const citiesOptions = useMemo(() => getOptions(cities), [cities])
  const stadiumsOptions = useMemo(() => getOptions(stadiums), [stadiums])
  const [ form ] = Form.useForm()
  useEffect(() => {
    if (!isLoaded && !isLoading) {
      dispatch(fetchData())
    }
  }, [isLoaded, isLoading])

  if (!team && !isNew) {
    return null
  }

  const initialValues = !team ? {} : {
    name: {
      en: team.en || team.name_en || '',
      ru: team.ru || team.name_ru || '',
      ar: team.ar || team.name_ar || '',
      fr: team.fr || team.name_fr || '',
      es: team.es || team.name_es || ''
    },
    country: team.country,
    city: team.city || team.id_city,
    logo: team.logo,
    stadium: team.stadium?.id || team.id_stadium
  }


  return (<>
    <Sidebar buttons sticky>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teams')} block>Teams</Button>
      <Button icon={<SaveOutlined />} type='primary' onClick={() => form.submit()} loading={isSubmitting} block>Save</Button>
    </Sidebar>
    <Form
      style={{ flex: '1 1 0'}}
      layout='vertical'
      form={form}
      onFinish={async (values) => {
        setIsSubmitting(true)
        try {
          const { name: { en, ru, ar, fr, es }, country, city, stadium, logo } = values
          const teamData = { 
            en, 
            ru, 
            ar, 
            fr, 
            es, 
            country, 
            city, 
            stadium,
            logo: typeof logo === 'string' && logo.indexOf('http') !== 0 ? logo : logo
          }
          
          let result
          if (isNew) {
            console.log('📡 Creating new team...')
            result = await createTeam(teamData)
          } else {
            console.log('📡 Updating team...', id)
            result = await updateTeam(id, teamData)
          }

          if (result.error) {
            console.error('❌ Team save error:', result.error)
            message.error(`Ошибка при сохранении команды: ${result.error.message || 'Неизвестная ошибка'}`)
            return
          }

          queryClient.invalidateQueries({ queryKey: ['data'] })
          dispatch(fetchData())
          
          message.success(`Команда успешно ${isNew ? 'создана' : 'обновлена'}!`)
          navigate('/teams')
        } catch (error) {
          console.error('❌ Team save exception:', error)
          message.error(`Ошибка при сохранении команды: ${error.message || 'Неизвестная ошибка'}`)
        } finally {
          setIsSubmitting(false)
        }
      }}
      initialValues={initialValues}
    >
      <Row>
        <Col span={3}>
          <Form.Item
            style={{ margin: '20px 0 0 20px' }}
            label='Logo'
            name='logo'
          >
            <InputImage />
          </Form.Item>
        </Col>
        <Col span={21}>
          <Row style={{ margin: '20px 20px 0 20px' }}>
            <Col
              span={12}
              style={{ padding: '0 10px 0 0' }}
            >
              <Form.Item
                label='Name'
                name='name'
                rules={[{ required: true, message: 'Please input team name' }]}
              >
                <MultilangInput
                  size='large'
                  placeholder='Name'
                  style={{ width: '100%' }}
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
                  size='large'
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
          <Row style={{ margin: '20px 20px 0 20px' }}>
            <Col
              span={12}
              style={{ padding: '0 10px 0 0' }}
            >
              <Form.Item
                label='Country'
                name='country'
                rules={[{ required: true, message: 'Please input team country' }]}
              >
                <Select
                  size='large'
                  placeholder='Country'
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={countriesOptions}
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
                label='City'
                name='city'
              >
                <Select
                  size='large'
                  placeholder='City'
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={citiesOptions}
                  style={{ width: '100%' }}
                  showSearch
                />
              </Form.Item>
            </Col>
          </Row>
        </Col>
      </Row>
    </Form>
    <Sidebar />
  </>)
}