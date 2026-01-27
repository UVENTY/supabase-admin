import { Card, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { SECTION_TYPES } from './constants'
import s from '../scheme-layout-builder.module.scss'

const Sidebar = ({
  sections,
  activeSection,
  onSectionClick,
  onSectionDelete
}) => {
  const getSectionLabel = (section) => {
    if (section.type === SECTION_TYPES.STAGE) return 'Сцена'
    if (section.type === SECTION_TYPES.DANCEFLOOR) return 'Танцпол'
    if (section.type === SECTION_TYPES.ROWS) return `Ряды (${section.rows?.length || 0})`
    if (section.type === SECTION_TYPES.BALCONY) {
      if (section.position === 'left') return 'Левый балкон'
      if (section.position === 'right') return 'Правый балкон'
      if (section.position === 'middle') return 'Нижний балкон'
      return 'Балкон'
    }
    if (section.type === SECTION_TYPES.BAR) return 'Бар'
    if (section.type === SECTION_TYPES.TABLE) return 'Стол'
    if (section.type === SECTION_TYPES.SOFA) return 'Диван'
    return 'Секция'
  }

  return (
    <div className={s.sidebar}>
      <Typography.Title level={5}>Секции ({sections.length})</Typography.Title>
      
      {sections.length === 0 && (
        <Card>
          <Typography.Text type="secondary">
            Добавьте секции для создания схемы зала
          </Typography.Text>
        </Card>
      )}
      
      {sections.map(section => (
        <Card
          key={section.id}
          size="small"
          style={{ marginBottom: 8, cursor: 'pointer' }}
          className={activeSection === section.id ? s.activeCard : ''}
          onClick={() => onSectionClick(section.id)}
        >
          <div className={s.sectionRow}>
            <Typography.Text strong>
              {getSectionLabel(section)}
            </Typography.Text>
            <CloseOutlined 
              className={s.deleteIcon}
              onClick={(e) => {
                e.stopPropagation()
                onSectionDelete(section.id)
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default Sidebar
