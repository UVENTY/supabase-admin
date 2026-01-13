import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Input, Select } from 'antd'
import { getLang } from '../../redux/config'

export default function MultilangInput({
  value = {},
  onChange = () => {},
  defaultLang = 'en',
  size,
  ...props
}) {
  const [ lang, setLang ] = useState(defaultLang)
  const langs = useSelector(getLang)

  const selectLang = (
    <Select
      onSelect={setLang}
      value={lang}
      style={{ width: 80 }}
      size={size}
    >
      {(langs || []).map(langItem => (
        <Select.Option key={langItem?.iso || langItem} value={langItem?.iso || langItem}>
          {langItem?.iso || langItem}
        </Select.Option>
      ))}
    </Select>
  )

  return (
    <Input
      {...props}
      size={size}
      value={value?.[lang] || ''}
      onChange={e => {
        onChange({ ...value, [lang]: e.target.value })
      }}
      addonBefore={selectLang}
    />
  )
}