import { useMemo, useState, useCallback, useEffect } from 'react'
import { Col, Row, Button, Form, Select, Input, Tabs } from 'antd'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { forEach } from 'lodash'
import HTMLPreview from '../../components/HTMLPreview'
import { getLang, getLangValue, updateLang } from '../../redux/config'
import Sidebar from '../../components/Layout/sidebar'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'

const TEMPLATE_BY_PAGE = {
  signup: 'email_register',
  'successful-payment': 'email_ticket_paid',
  'email-verification': 'email_verification_start',
  'checking-ticket': 'email_ticket_block_cart',
  'checking-ticket-available': 'email_available_seats',
  'restore-password': 'email_remind'
}

export default function PageTemplates() {
  const [ form ] = Form.useForm()
  const { page } = useParams()
  const [ activeLang, setActiveLang ] = useState('1')
  const [ tab, setTab ] = useState('code')
  const dispatch = useDispatch()

  const subjectKey = `${TEMPLATE_BY_PAGE[page]}_subject`
  const contentKey = `${TEMPLATE_BY_PAGE[page]}_body` 
  const langs = useSelector(getLang)
  const subject = useSelector(state => getLangValue(state, subjectKey))
  const content = useSelector(state => getLangValue(state, contentKey))
  const isUpdating = useSelector(state => state.config.isUpdating)

  const langsOptions = useMemo(() => langs.map(lang => ({
    label: lang.native,
    value: lang.id
  })), [langs])

  useEffect(() => {
    form.resetFields()
  }, [page])

  const handleSubmit = useCallback(values => {
    const obj = {}
    forEach(values.content, (value, lang) => {
      if (value === undefined) return
      obj[contentKey] = { ...obj[contentKey], [lang]: value }
    })
    dispatch(updateLang(obj))
  }, [contentKey])

  return (<>
    <Sidebar buttons sticky>
      <Button icon={<SaveOutlined />} type='primary' onClick={() => form.submit()} block>Save</Button>
    </Sidebar>
    <Form
      style={{ flex: '1 1 0'}}
      layout='vertical'
      initialValues={{ subject, content }}
      onFinish={handleSubmit}
      form={form}
    >
      <Row>
        <Col span={22} offset={1}>
          <Select
            style={{ width: '100%' }}
            options={langsOptions}
            value={activeLang}
            onChange={setActiveLang}
          />
        </Col>
      </Row>
      {langsOptions.map(lang => (
        <Row
          key={lang.value}
          style={{
            display: lang.value === activeLang ? 'block' : 'none',
            margin: '20px 0'
          }}
        >
          <Col span={22} offset={1}>
            <Form.Item
              label='Subject'
              name={['subject', lang.value]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={22} offset={1}>
            <Tabs
              items={[
                {
                  key: 'code',
                  label: 'Code',
                },
                {
                  key: 'preview',
                  label: 'Preview'
                }
              ]}
              onChange={key => setTab(key)}
              value={tab}
            />
          </Col>
          <Col span={22} offset={1}>
            {tab === 'preview' &&
              <Form.Item
                label='Body'
                name={['content', lang.value]}
              >
                <HTMLPreview />
              </Form.Item>
            }
            <Form.Item
              label='Body'
              name={['content', lang.value]}
              style={{ display: tab !== 'code' ? 'none' : null }}
            >
              <Input.TextArea
                rows={30}
              />
            </Form.Item>
          </Col>
        </Row>
      ))}
    </Form>
    <Sidebar />
    </> )
}