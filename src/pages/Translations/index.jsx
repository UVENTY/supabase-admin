import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Form, Input, Row, Col, Select, Divider } from 'antd'
import { pickBy, transform, keys } from 'lodash'
import { CheckOutlined, LoadingOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { diff } from 'deep-object-diff'
import { getLang, getLangValue, updateLang } from '../../redux/config'

const FIELD_NAME_MAP = {
  match_list_header: 'Match list header',
  filter_reset: 'Reset filter button text',
  tickets_in_stock: 'Tickets in stock filter text',
  filter_tournaments_placeholder: 'Filter default tournament text',
  filter_team_placeholder: 'Filter default team'
}

const CREATE_NAME = '_create'

export default function PageTranslations() {
  const [ isSaved, setIsSaved ] = useState(true)
  const [ selectedVar, setSelectedVar ] = useState()
  const [ newVarName, setNewVarName ] = useState('')
  const dispatch = useDispatch()
  const isUpdating = useSelector(state => state.config.isUpdating)
  const langs = useSelector(getLang)
  const langValues = useSelector(getLangValue)

  const isNew = selectedVar === CREATE_NAME

  useEffect(() => {
    if (!isUpdating) {
      setIsSaved(true)
    }
  }, [isUpdating])

  const handleFinish = useCallback(values => {
    if (isNew) {
      if (langValues[newVarName] && !window.confirm('Variable with this name already exist, update?')) {
        return
      }
      dispatch(updateLang(values)).then(() => {
        setSelectedVar()
      })
      return
    }
    const changed = transform(
      pickBy(diff(langValues, values), value => value),
      (acc, item, key) => {
        const newItem = pickBy(item, value => value)
        if (keys(newItem).length) acc[key] = newItem
        return acc
      },
    {})
    dispatch(updateLang(changed))
  }, [langValues, isNew, newVarName])

  const varsOptions = Object.keys(langValues).map(value => ({
    value,
    label: FIELD_NAME_MAP[value] || value
  }))

  let saveButtonIcon
  if (isUpdating) saveButtonIcon = <LoadingOutlined />
  if (isSaved) saveButtonIcon = <CheckOutlined />

  return (
    <Form
      layout='vertical'
      onFinish={handleFinish}
      initialValues={langValues}
      onValuesChange={() => setIsSaved(false)}
    >
      <Row
        style={{
          borderBottom: '1px solid #ccc',
          padding: '10px'
        }}
        justify="space-between"
      >
        <Col>
          <Button
            type='primary'
            htmlType='submit'
            disabled={isUpdating || isSaved}
            icon={saveButtonIcon}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          {isNew && <Button
            style={{ marginLeft: 10 }}
            onClick={() => setSelectedVar()}
          >
            Cancel
          </Button>}
        </Col>
        {!isNew && <Col>
          <Button
            type='primary'
            icon={<PlusCircleOutlined />}
            onClick={() => setSelectedVar(CREATE_NAME)}
          >
            Create new
          </Button>
        </Col>}
      </Row>
      <Row style={{ margin: '20px 0 0 30px' }}>
        <Col span={23}>
          {isNew ?
            <Input
              placeholder='Variable name'
              style={{ width: '100%' }}
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
            />
            : 
            <Select
              disabled={isUpdating}
              options={varsOptions}
              style={{ width: '100%' }}
              placeholder='Select variable'
              onSelect={value => {
                setSelectedVar(value)
                setIsSaved(true)
              }}
              showSearch
            />
          }
        </Col>
      </Row>
      {!!selectedVar && (!!langValues[selectedVar] || isNew) && <div style={{ margin: '20px 0 0 30px' }}>
        {langs.map((lang, i) => (
          <Row key={lang.id}>
            <Col span={23}>
              <Form.Item
                label={lang.native}
                name={[isNew ? newVarName : selectedVar, lang.id]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        ))}
      </div>}
    </Form>
  )
}