import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Col, Row, Form, Button, Select, Input, Upload, Flex, message } from 'antd'
import { ArrowLeftOutlined, CaretLeftFilled, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import buildConfig from '../../buildConfig'
import JSONEditor from '../../components/JSONEditor'
import InputImage from '../../components/InputImage'
import MultilangInput from '../../components/MultilangInput'
import StadiumScheme from '../../components/StadiumScheme'
import { fetchData, getStadium, getStadiumSchemeStatus, fetchStadiumScheme } from '../../redux/data'
import { getCities, getCountries } from '../../redux/config'
import { createStadium, updateStadium } from '../../supabase/stadium'
import SvgSchemeEditor from '../../components/SvgSchemeEditor'
import { toBase64 } from '../../utils/utils'
import Sidebar from '../../components/Layout/sidebar'

const getOptions = obj => Object.values(obj)
  .map(item => ({ label: item.en, value: item.id }))
  .sort((item1, item2) => item1.label > item2.label ? 1 : -1)

  
const config = buildConfig.getPaths({
  type: 'scheme_type',
  upload: 'scheme_upload'
}, 'stadium')

export default function PageStadium() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'create'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLoaded = useSelector(state => state.data.isLoaded)
  const isLoading = useSelector(state => state.data.isLoading)
  const cities = useSelector(getCities)
  const countries = useSelector(getCountries)
  const stadium = useSelector(state => getStadium(state, id))
  const schemeStatus = useSelector(state => getStadiumSchemeStatus(state, id))
  const queryClient = useQueryClient()

  const [ form ] = Form.useForm()

  const countriesOptions = useMemo(() => getOptions(countries), [countries])
  const citiesOptions = useMemo(() => getOptions(cities), [cities])

  useEffect(() => {
    if (isNew) return
    if (['loading', 'loaded'].includes(schemeStatus) || !isLoaded) return
    dispatch(fetchStadiumScheme(id, config.type))
  }, [isLoaded, schemeStatus, id, isNew])

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      dispatch(fetchData())
    }
  }, [isLoaded, isLoading])

  const parsedScheme = useMemo(() => {
    if (!stadium?.scheme) return undefined
    try {
      if (typeof stadium.scheme === 'string') {
        return JSON.parse(stadium.scheme.replaceAll('\'', '"'))
      }
      return stadium.scheme
    } catch (e) {
      console.warn('⚠️ Не удалось распарсить схему стадиона:', e)
      return undefined
    }
  }, [stadium?.scheme])

  if ((!stadium || schemeStatus !== 'loaded') && !isNew) {
    return null
  }

  const initialValues = !stadium ? {} : {
    name: {
      en: stadium.en,
      ru: stadium.ru,
      ar: stadium.ar,
      fr: stadium.fr,
      es: stadium.es
    },
    address: {
      en: stadium.address_en,
      ru: stadium.address_ru,
      ar: stadium.address_ar,
      fr: stadium.address_fr,
      es: stadium.address_es
    },
    country: stadium.country,
    city: stadium.city,
    scheme_blob: parsedScheme || stadium.scheme_blob, 
    scheme: parsedScheme || stadium.scheme 
  }

  return (<>
    <Sidebar buttons sticky>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stadiums')} block>Stadiums</Button>
      <Button icon={<SaveOutlined />} type='primary' onClick={() => form.submit()} loading={isSubmitting} block>Save</Button>
    </Sidebar>
    <Form
      style={{ flex: '1 1 0'}}
      layout='vertical'
      form={form}
      onFinish={async (values) => {
        setIsSubmitting(true)
        try {
          const { name, address = {}, country, city, scheme, scheme_blob } = values
          
          let jsonScheme = scheme
          let base64SchemeBlob = ''
          
          if (config.type === 'svg' && scheme_blob) {
            if (typeof scheme_blob === 'object' && scheme_blob.scheme) {
              const file = new File([JSON.stringify(scheme_blob)], 'scheme.json', {
                type: 'application/json',
              })
              base64SchemeBlob = await toBase64(file)
              
              if (!jsonScheme) {
                jsonScheme = scheme_blob 
              }
            } else if (typeof scheme_blob === 'string') {
              base64SchemeBlob = scheme_blob
            }
          } else {
            const file = scheme_blob && new File([JSON.stringify(scheme_blob)], 'scheme.json', {
              type: 'application/json',
            })
            base64SchemeBlob = await (file ? toBase64(file) : Promise.resolve(scheme_blob || ''))
          }
          
          const stadiumData = {
            en: name?.en || '',
            ru: name?.ru || '',
            ar: name?.ar || '',
            fr: name?.fr || '',
            es: name?.es || '',
            address_en: address?.en || '',
            address_ru: address?.ru || '',
            address_ar: address?.ar || '',
            address_fr: address?.fr || '',
            address_es: address?.es || '',
            country,
            city,
            scheme: jsonScheme ? (typeof jsonScheme === 'string' ? jsonScheme : JSON.stringify(jsonScheme).replaceAll('"', '\'')) : '',
            scheme_blob: base64SchemeBlob
          }

          let result
          if (isNew) {
            console.log('📡 Creating new stadium...')
            result = await createStadium(stadiumData)
          } else {
            console.log('📡 Updating stadium...', id)
            result = await updateStadium(id, stadiumData)
          }

          if (result.error) {
            console.error('❌ Stadium save error:', result.error)
            message.error(`Ошибка при сохранении стадиона: ${result.error.message || 'Неизвестная ошибка'}`)
            return
          }

          queryClient.invalidateQueries({ queryKey: ['data'] })
          dispatch(fetchData())
          
          message.success(`Стадион успешно ${isNew ? 'создан' : 'обновлен'}!`)
          navigate('/stadiums')
        } catch (error) {
          console.error('❌ Stadium save exception:', error)
          message.error(`Ошибка при сохранении стадиона: ${error.message || 'Неизвестная ошибка'}`)
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
            label='Address'
            name='address'
          >
            <MultilangInput
              size='large'
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
      <Row style={{ margin: '20px 20px 0 20px' }}>
        <Col
          span={24}
          style={{ padding: '0 10px 0 0' }}
        >
          <Form.Item
            name='scheme_blob'
          >
            {config.type === 'svg' ? <SvgSchemeEditor /> : <InputImage />}
          </Form.Item>
        </Col>
      </Row>
      {config.type === 'json' && <Row style={{ margin: '20px 20px 0 20px' }}>
        <Col
          span={12}
          style={{ padding: '0 10px 0 0' }}
        >
          <Form.Item
            label='Json scheme'
            name='scheme'
          >
            <JSONEditor />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label='Json scheme preview'
            name='scheme'
          >
            <StadiumScheme />
          </Form.Item>
        </Col>
      </Row>}
    </Form>
    <Sidebar />
  </>)
}