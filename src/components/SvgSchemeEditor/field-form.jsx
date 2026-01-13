import { Button, Card, Checkbox, Flex, Form, Input, InputNumber, Select, Tooltip, Typography } from 'antd'
import s from './svg-scheme-editor.module.scss'
import { useCallback, useEffect, useState } from 'react'
import { translit } from '../../utils/utils'
import { EMPTY_FUNC } from '../../consts'
import { QuestionCircleOutlined } from '@ant-design/icons'

const { Title } = Typography

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'file', label: 'SVG file' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'color', label: 'Color selector' }
]

export default function FieldForm(props) {
  const {
    isNewField,
    value,
    label,
    groupEditable,
    options,
    onCreate = EMPTY_FUNC,
    onCancel = EMPTY_FUNC,
    onChange = EMPTY_FUNC,
    onDelete = EMPTY_FUNC,
    ...rest
  } = props
  const [ values, setValues ] = useState({})
  const [ makeValue, setMakeValue ] = useState(true)

  const getValue = useCallback((fieldname) => {
    if (isNewField) return values[fieldname] || ''
    return props[fieldname]
  }, [props, values])

  const handleChange = useCallback((name, value) => {
    if (isNewField) {
      const upd = { [name]: value }
      if (name === 'value') setMakeValue(!value)
      if (name === 'label' && makeValue) {
        upd.value = translit(value).replaceAll('-', '')
      }
      setValues(prev => ({ ...prev, ...upd }))
    } else {
      onChange(name, value)
    }
  }, [isNewField, makeValue])

  const type = getValue('type') || 'text'

  return (
    <Card>
      {value !== 'row' && value !== 'seat' && 
        <>
          <Title level={5} className={s.title}>Settings</Title>
          <Form.Item label='Type'>
            <Select
              options={FIELD_TYPES}
              value={getValue('type') || 'text'}
              onChange={val => handleChange('type', val)}
            />
          </Form.Item>
          <Form.Item label='Label'>
            <Input
              value={getValue('label')}
              onChange={e => handleChange('label', e.target.value)}
            />
          </Form.Item>
          <Form.Item label='System name'>
            <Input
              className={s.placeholderLikeValue}
              value={getValue('value')}
              onChange={e => handleChange('value', e.target.value)}
              disabled={!isNewField}
            />
          </Form.Item>
          {type === 'number' && <Flex>
            <div>
              <b>Range</b> from <InputNumber
                value={getValue('min')}
                onChange={value => handleChange('min', value)}
              />
              {' to '}
              <InputNumber
                value={getValue('max')}
                onChange={value => handleChange('max', value)}
              />
            </div>
          </Flex>}
          <div className={s.checkbox}>
            <Checkbox
              checked={getValue('groupEditable')}
              onChange={e => handleChange('groupEditable', e.target.checked)}
            >
              Allow group editing
            </Checkbox>
            <Tooltip title='Ability to edit the field when selecting places in a group'>
              <QuestionCircleOutlined />
            </Tooltip>
          </div>
          {type === 'file' && <div className={s.checkbox}>
            <Checkbox
              checked={getValue('originalColors')}
              onChange={e => handleChange('originalColors', e.target.checked)}
            >
            Leave original colors
            </Checkbox>
            <Tooltip title='When checked, icons will not be colored in the category color'>
              <QuestionCircleOutlined />
            </Tooltip>
          </div>}

          {type === 'select' && <>
            <Title level={5} className={s.title} style={{ marginTop: 20 }}>Options</Title>
            <Select
              mode='tags'
              placeholder='Print option and poress Enter to add'
              value={(getValue('options') || []).map(({ label }) => label)}
              onChange={values => handleChange('options', values.map((label, i) => ({ label, value: `${i + 1}` })))}
            />
          </>}
        </>
      }
      {isNewField &&
        <Flex style={{ marginTop: 20 }} gap={20}>
          <Button
            type='primary'
            size='large'
            style={{ flex: '1 1 0' }}
            onClick={() => onCreate(values)}
          >
            Create
          </Button>
          <Button
            size='large'
            style={{ flex: '1 1 0' }}
            onClick={() => onCancel()}
            danger
          >
            Cancel
          </Button>
        </Flex> 
      }
      {!isNewField && !['categories', 'row', 'seat'].includes(value) &&
        <Button
          type='primary'
          onClick={() => onDelete(value)}
          style={{ marginTop: 20, float: 'right' }}
          danger
        >
          Delete option
        </Button>
      }
    </Card>
  )
}