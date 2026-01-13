import { useEffect, useState } from 'react'
import { Input } from 'antd'

export default function JSONEditor({
  value,
  onChange
}) {
  const [ text, setText ] = useState('')

  useEffect(() => {
    if (!value || typeof value !== 'object') return
    setText(JSON.stringify(value, null, '  '))
  }, [])

  useEffect(() => {
    try {
      const val = JSON.parse(text)
      onChange(val)
    } catch(e) {}
  }, [text])

  return (
    <div>
      <Input.TextArea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={20}
      />
    </div>
  )
}