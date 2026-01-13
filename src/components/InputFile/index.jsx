import { useState, useRef, useCallback } from 'react'
import { Button } from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'

export default function InputFile({
  value,
  onChange,
  label,
  disabled,
  ...rest
}) {
  const [ fileName, setFileName ] = useState()
  const ref = useRef()
  const handleClickButton = useCallback(() => {
    if (!ref.current) return
    ref.current.click()
  }, [ref])

  const handleRemoveFile = useCallback(() => {
    setFileName(null)
    onChange(null)
  }, [])

  const handleChange = useCallback((e) => {
    const file = e.target?.files[0]
    if (!file) return
    setFileName(file.name)
    onChange(file)
  }, [])

  return (
    <>
      <Button.Group style={{ maxWidth: '100%' }}>
        <Button
          icon={!fileName && <UploadOutlined />}
          size='large'
          title={fileName}
          {...rest}
          style={{ flexShrink: 1, overflow: 'hidden' }}
          onClick={handleClickButton}
          disabled={disabled}
        >
          {fileName || label}
        </Button>
        {!!fileName &&
          <Button
            size='large'
            onClick={handleRemoveFile}
            style={{ flex: '0 0 30px', padding: '0' }}
            disabled={disabled}
            danger
          >
            <DeleteOutlined />
          </Button>
        }
      </Button.Group>
      <input
        onChange={handleChange}
        value=''
        type='file'
        style={{ display: 'none' }}
        ref={ref}
      />
    </>
  )
}