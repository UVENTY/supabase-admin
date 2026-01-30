import { Button, Space } from 'antd'
import { DragOutlined, SettingOutlined } from '@ant-design/icons'
import s from '../scheme-layout-builder.module.scss'

const SectionActionMenu = ({ 
  visible, 
  position, 
  onDrag, 
  onConfigure, 
  onClose,
  isDraggable = false
}) => {
  if (!visible) return null

  const menuStyle = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000,
    background: '#fff',
    border: '1px solid #d9d9d9',
    borderRadius: '4px',
    padding: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '180px'
  }

  return (
    <div style={menuStyle} className={s.sectionActionMenu}>
      {isDraggable && (
        <Button
          type="text"
          icon={<DragOutlined />}
          onClick={() => {
            onDrag()
            onClose()
          }}
          style={{ width: '100%', textAlign: 'left' }}
        >
          Перетащить элемент
        </Button>
      )}
      <Button
        type="text"
        icon={<SettingOutlined />}
        onClick={() => {
          onConfigure()
          onClose()
        }}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Настроить секцию
      </Button>
    </div>
  )
}

export default SectionActionMenu
