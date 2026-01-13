import { useState, useCallback, useId } from 'react'
import ReactQuill from 'react-quill'
import { Input, Modal } from 'antd'
import 'react-quill/dist/quill.snow.css'

const TOOLBAR_BLOCK_OFFSET = 15

export default function Wysiwyg({
  value,
  onChange,
  id
}) {
  const [ isRaw, setIsRaw ] = useState(false)
  const [ rawHtml, setRawHtml ] = useState('')

  const toggleRaw = useCallback(() => {
    if (!isRaw) {
      setRawHtml(value)
    }
    setIsRaw(!isRaw)
  }, [isRaw, value])

  const saveRaw = useCallback(() => {
    onChange(rawHtml)
    setIsRaw(false)
  }, [onChange, rawHtml, setIsRaw])

  return (
    <div>
      <Modal
        title='Edit source code'
        open={isRaw}
        onOk={saveRaw}
        onCancel={toggleRaw}
        width={900}
      >
        <Input.TextArea
          style={{ marginRight: 20 }}
          rows={20}
          value={rawHtml}
          onChange={e => setRawHtml(e.target.value)}
        />
      </Modal>
      <div className={`toolbar-${id}`}>
        <select className="ql-font" />
        <select className="ql-header" />
        <button className="ql-bold" style={{ marginLeft: TOOLBAR_BLOCK_OFFSET }} />
        <button className="ql-italic" />
        <button className="ql-underline" />
        <button className="ql-strike" />
        <button className="ql-blockquote" style={{ marginLeft: TOOLBAR_BLOCK_OFFSET }} />
        <button className="ql-code-block" />
        <button className="ql-list" value="ordered" style={{ marginLeft: TOOLBAR_BLOCK_OFFSET }} />
        <button className="ql-list" value="bullet" />
        <select className="ql-align" />
        <select className="ql-color" style={{ marginLeft: TOOLBAR_BLOCK_OFFSET }} />
        <select className="ql-background" />
        <button className="ql-link" style={{ marginLeft: TOOLBAR_BLOCK_OFFSET }} />
        <button className="ql-image" />
        <button onClick={toggleRaw} style={{ marginLeft: TOOLBAR_BLOCK_OFFSET, whiteSpace: 'nowrap' }}>Edit HTML</button>
      </div>
      <ReactQuill
        modules={{ toolbar: `.toolbar-${id}` }}
        theme='snow'
        value={value || ''}
        onChange={onChange}
        style={{
          background: '#fff'
        }}
      />
    </div>
  )
}