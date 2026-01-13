import { useMemo, useState, useCallback, useEffect } from 'react'
import { Col, Row, Button, Form, Select, Input } from 'antd'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { forEach } from 'lodash'
import Wysiwyg from '../../components/Wysiwyg'
import { getLang, getLangValue, updateLang } from '../../redux/config'
import Sidebar from '../../components/Layout/sidebar'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'

export default function PageContent() {
  const [ form ] = Form.useForm()
  const { page } = useParams()
  const [ activeLang, setActiveLang ] = useState('1')
  const dispatch = useDispatch()

  const contentKey = `page_content_${page}`
  const titleKey = `page_title_${page}`
  const langs = useSelector(getLang)
  const content = useSelector(state => getLangValue(state, contentKey))
  const title = useSelector(state => getLangValue(state, titleKey))
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
    forEach(values.title, (value, lang) => {
      if (value === undefined) return
      obj[titleKey] = { ...obj[titleKey], [lang]: value }
    })
    forEach(values.content, (value, lang) => {
      if (value === undefined) return
      obj[contentKey] = { ...obj[contentKey], [lang]: value }
    })
    dispatch(updateLang(obj))
  }, [contentKey, titleKey])

  return (<>
    <Sidebar buttons sticky>
      <Button icon={<SaveOutlined />} type='primary' onClick={() => form.submit()} loading={isUpdating} block>Save</Button>
    </Sidebar>
    <Form
      style={{ flex: '1 1 0'}}
      layout='vertical'
      initialValues={{ title, content }}
      onFinish={handleSubmit}
      form={form}
    >
      <Row style={{ margin: '20px 0' }}>
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
              label='Page title'
              name={['title', lang.value]}
            >
              <Input
              />
            </Form.Item>
          </Col>
          <Col span={22} offset={1}>
            <Form.Item
              label='Page content'
              name={['content', lang.value]}
            >
              <Wysiwyg />
            </Form.Item>
          </Col>
        </Row>
      ))}
    </Form>
    <Sidebar />
 </> )
}