import { Button, Space, Typography, App } from 'antd'
import { DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { SECTION_TYPES } from './constants'
import s from '../scheme-layout-builder.module.scss'

const Toolbar = ({
  sections,
  onAddSection,
  onViewMode,
  onBackToSelection,
  onDeleteScheme,
  svgRef,
  onSchemeChange,
  onSectionsChange,
  setActiveSection
}) => {
  const { modal } = App.useApp()
  
  const handleDeleteScheme = () => {
    modal.confirm({
      title: 'Удалить схему?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => {
        setActiveSection(null)
        // Очищаем схему
        if (svgRef.current) {
          svgRef.current.innerHTML = ''
          const serializer = new XMLSerializer()
          const svgString = serializer.serializeToString(svgRef.current)
          if (onSchemeChange) {
            onSchemeChange(svgString)
          }
        }
        // Очищаем секции в SchemeLayoutBuilder
        if (onDeleteScheme) {
          onDeleteScheme()
        }
        // Уведомляем родительский компонент об удалении
        if (onSectionsChange) {
          onSectionsChange([])
        }
      }
    })
  }

  const handleBackToSelection = () => {
    // Проверяем, есть ли секции на схеме
    if (sections && sections.length > 0) {
      modal.confirm({
        title: 'Выйти из создания схемы?',
        content: 'При выходе изменения не сохранятся.',
        okText: 'ОК',
        cancelText: 'Отмена',
        onOk: () => {
          if (onBackToSelection) {
            onBackToSelection()
          }
        }
      })
    } else {
      // Если секций нет, просто выходим без предупреждения
      if (onBackToSelection) {
        onBackToSelection()
      }
    }
  }

  return (
    <div className={s.toolbar}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Кнопка возврата к выбору режима */}
        {onBackToSelection && (
          <Button
            size='large'
            type='default'
            htmlType='button'
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToSelection}
            style={{ marginBottom: '10px' }}
          >
            Назад
          </Button>
        )}
        
        {/* Кнопки Просмотр и Удалить */}
        <Space style={{ marginTop: '-10px', marginBottom: '10px' }}>
          <Button
            size='large'
            type='default'
            htmlType='button'
            onClick={onViewMode}
            disabled={!sections || sections.length === 0}
          >
            Просмотр
          </Button>
          <Button
            size='large'
            type='primary'
            htmlType='button'
            icon={<DeleteOutlined />}
            onClick={handleDeleteScheme}
            disabled={!sections || sections.length === 0}
            danger
            className={s.deleteButton}
          >
            Удалить
          </Button>
        </Space>
        
        <div>
          <Typography.Title level={5}>Добавить секцию</Typography.Title>
          <Space wrap>
            <Button 
              onClick={() => onAddSection(SECTION_TYPES.STAGE)}
              disabled={!!sections.find(s => s.type === SECTION_TYPES.STAGE)}
            >
              Сцена
            </Button>
            <Button onClick={() => onAddSection(SECTION_TYPES.DANCEFLOOR)}>
              Танцпол
            </Button>
            <Button onClick={() => onAddSection(SECTION_TYPES.ROWS)}>
              Ряды мест
            </Button>
            <Button onClick={() => onAddSection(SECTION_TYPES.BALCONY)}>
              Балкон
            </Button>
            <Button onClick={() => onAddSection(SECTION_TYPES.BAR)}>
              Бар
            </Button>
            <Button onClick={() => onAddSection(SECTION_TYPES.TABLE)}>
              Стол
            </Button>
            <Button onClick={() => onAddSection(SECTION_TYPES.SOFA)}>
              Диван
            </Button>
          </Space>
        </div>
      </Space>
    </div>
  )
}

export default Toolbar
