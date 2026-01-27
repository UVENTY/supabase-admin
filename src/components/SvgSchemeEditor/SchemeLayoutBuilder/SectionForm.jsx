import { Button, Card, Input, InputNumber, Select, Space, ColorPicker, Radio } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { SECTION_TYPES } from './constants'
import FormField from './FormField'

const SectionForm = ({ 
  section, 
  formData, 
  setFormData, 
  categories = [], 
  sections = [],
  onCategoriesChange 
}) => {
  if (!section || !formData) return null
  
  // Проверяем, является ли это балконом со столом
  const isBalconyWithTable = section.type === SECTION_TYPES.BALCONY && formData.balconyType === 'tables'
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontWeight: 500 }}>Название</div>
        <Input
          value={formData.label}
          onChange={(e) => {
            setFormData({ ...formData, label: e.target.value })
          }}
          placeholder="Например: STAGE"
        />
      </div>
      
      {section.type !== SECTION_TYPES.STAGE && section.type !== SECTION_TYPES.BAR && (
        <div>
          <div style={{ marginBottom: '8px', fontWeight: 500 }}>Категория</div>
          <Select
            value={formData.category}
            onChange={(value) => {
              setFormData({ ...formData, category: value })
            }}
            style={{ width: '100%' }}
            showSearch
            placeholder="Выберите или введите новую категорию"
            allowClear
            filterOption={(input, option) => {
              const label = option?.label || option?.value || ''
              return label.toLowerCase().includes(input.toLowerCase())
            }}
            onSearch={(value) => {
              if (value && value.trim() && !categories.find(c => c.value === value.trim())) {
                if (onCategoriesChange) {
                  const newCategory = {
                    value: value.trim(),
                    label: value.trim(),
                    color: '#cccccc',
                    icon: null
                  }
                  onCategoriesChange([...categories, newCategory])
                  setFormData({ ...formData, category: value.trim() })
                }
              }
            }}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '8px', borderTop: '1px solid #d9d9d9' }}>
                  <Button
                    type="link"
                    block
                    onClick={() => {
                      const newValue = `cat${categories.length + 1}`
                      if (onCategoriesChange) {
                        const newCategory = {
                          value: newValue,
                          label: newValue,
                          color: '#cccccc',
                          icon: null
                        }
                        onCategoriesChange([...categories, newCategory])
                        setFormData({ ...formData, category: newValue })
                      }
                    }}
                  >
                    <PlusOutlined /> Создать новую категорию
                  </Button>
                </div>
              </>
            )}
          >
            {categories.map(cat => (
              <Select.Option key={cat.value} value={cat.value} label={cat.label || cat.value}>
                {cat.label || cat.value}
              </Select.Option>
            ))}
          </Select>
        </div>
      )}
      
      <div>
        <div style={{ marginBottom: '8px', fontWeight: 500 }}>Цвет</div>
        <ColorPicker
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color: color.toHexString() })}
        />
      </div>
      
      {section.type === SECTION_TYPES.STAGE && (
        <>
          <FormField label="Ширина (px)">
            <InputNumber
              value={formData.stageWidth || 900}
              onChange={(value) => setFormData({ ...formData, stageWidth: value })}
              min={100}
              style={{ width: '100%' }}
              addonAfter="px"
            />
          </FormField>
          <FormField label="Высота (px)">
            <InputNumber
              value={formData.stageHeight || 80}
              onChange={(value) => setFormData({ ...formData, stageHeight: value })}
              min={20}
              style={{ width: '100%' }}
              addonAfter="px"
            />
          </FormField>
        </>
      )}
      
      {section.type === SECTION_TYPES.DANCEFLOOR && (
        <>
          <FormField label="Количество мест">
            <InputNumber
              value={formData.count}
              onChange={(value) => setFormData({ ...formData, count: value })}
              min={0}
              style={{ width: '100%' }}
            />
          </FormField>
          <FormField label="Ширина (%)">
            <InputNumber
              value={formData.widthPercent || 100}
              onChange={(value) => {
                // Валидация: минимальная ширина 10%, максимальная 100%
                const validatedValue = value < 10 ? 10 : (value > 100 ? 100 : value)
                setFormData({ ...formData, widthPercent: validatedValue })
              }}
              min={10}
              max={100}
              style={{ width: '100%' }}
              addonAfter="%"
              tooltip="Ширина в процентах от ширины схемы SVG"
            />
          </FormField>
          <FormField label="Высота (%)">
            <InputNumber
              value={formData.heightPercent || 25}
              onChange={(value) => {
                // Валидация: минимальная высота 5%
                const validatedValue = value < 5 ? 5 : value
                setFormData({ ...formData, heightPercent: validatedValue })
              }}
              min={5}
              style={{ width: '100%' }}
              addonAfter="%"
              tooltip="Высота в процентах от высоты схемы SVG"
            />
          </FormField>
        </>
      )}
      
      {section.type === SECTION_TYPES.ROWS && (
        <>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              // Добавляем ряд в временные данные
              const rows = formData.rows || []
              const newRow = {
                rowNumber: rows.length + 1,
                seatsCount: 10
              }
              setFormData({ ...formData, rows: [...rows, newRow] })
            }}
            block
            style={{ marginBottom: 16 }}
          >
            Добавить ряд
          </Button>
          
          {(formData.rows || []).map((row, index) => {
            // Вычисляем глобальный номер ряда на основе позиции секции и индекса ряда внутри секции
            const rowSectionsBefore = sections.filter(s => s.type === SECTION_TYPES.ROWS && s.id < section.id)
            const rowsCountBefore = rowSectionsBefore.reduce((sum, s) => sum + (s.rows?.length || 0), 0)
            const globalRowNumber = rowsCountBefore + index + 1
            
            return (
            <Card key={`${section.id}-${row.rowNumber}-${index}`} size="small" style={{ marginBottom: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <FormField label={`Ряд ${globalRowNumber}`}>
                  <InputNumber
                    value={row.seatsCount}
                    onChange={(value) => {
                      // Изменяем ряд в временных данных
                      const rows = [...(formData.rows || [])]
                      if (rows[index]) {
                        rows[index] = { ...rows[index], seatsCount: value }
                      }
                      setFormData({ ...formData, rows })
                    }}
                    min={1}
                    style={{ width: '100%' }}
                    placeholder="Количество мест"
                  />
                </FormField>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    // Удаляем ряд из временных данных
                    const rows = [...(formData.rows || [])]
                    rows.splice(index, 1)
                    setFormData({ ...formData, rows })
                  }}
                  block
                >
                  Удалить ряд
                </Button>
              </Space>
            </Card>
            )
          })}
        </>
      )}
      
      {section.type === SECTION_TYPES.BALCONY && (
        <>
          <FormField label="Тип балкона">
            <Radio.Group
              value={formData.balconyType || 'seats'}
              onChange={(e) => {
                const newType = e.target.value
                // При смене типа сбрасываем настройки стола, если переключаемся не на столы
                setFormData({ 
                  ...formData, 
                  balconyType: newType,
                  tableShape: newType === 'tables' ? (formData.tableShape || 'round') : undefined,
                  tableSize: newType === 'tables' ? (formData.tableSize || 60) : undefined,
                  tableHeight: newType === 'tables' ? (formData.tableHeight || 40) : undefined,
                  tableSeatsTop: newType === 'tables' ? (formData.tableSeatsTop || 0) : undefined,
                  tableSeatsRight: newType === 'tables' ? (formData.tableSeatsRight || 0) : undefined,
                  tableSeatsBottom: newType === 'tables' ? (formData.tableSeatsBottom || 0) : undefined,
                  tableSeatsLeft: newType === 'tables' ? (formData.tableSeatsLeft || 0) : undefined
                })
              }}
            >
              <Radio value="seats">С местами</Radio>
              <Radio value="dancefloor">Танцпольный</Radio>
              <Radio value="tables">Столы</Radio>
              <Radio value="sofas">Диваны</Radio>
            </Radio.Group>
          </FormField>
          {formData.balconyType === 'dancefloor' ? (
            <FormField label="Количество мест">
              <InputNumber
                value={formData.count || 0}
                onChange={(value) => setFormData({ ...formData, count: value })}
                min={0}
                style={{ width: '100%' }}
              />
            </FormField>
          ) : formData.balconyType === 'tables' ? (
            <FormField label="Количество столов">
              <InputNumber
                value={formData.tablesCount || 1}
                onChange={(value) => setFormData({ ...formData, tablesCount: value || 1 })}
                min={1}
                style={{ width: '100%' }}
              />
            </FormField>
          ) : formData.balconyType === 'sofas' ? (
            <FormField label="Количество диванов">
              <InputNumber
                value={formData.sofasCount || 1}
                onChange={(value) => setFormData({ ...formData, sofasCount: value || 1 })}
                min={1}
                style={{ width: '100%' }}
              />
            </FormField>
          ) : (
            <>
              <FormField label="Количество рядов">
                <InputNumber
                  value={formData.rowsCount || 0}
                  onChange={(value) => setFormData({ ...formData, rowsCount: value || 0 })}
                  min={0}
                  style={{ width: '100%' }}
                />
              </FormField>
              <FormField label="Мест в ряду">
                <InputNumber
                  value={formData.seatsPerRow || 0}
                  onChange={(value) => setFormData({ ...formData, seatsPerRow: value || 0 })}
                  min={0}
                  style={{ width: '100%' }}
                />
              </FormField>
            </>
          )}
          {formData.balconyType !== 'tables' && (
            <>
              {section.position !== 'middle' && (
                <FormField label="Ширина балкона (%)">
                  <InputNumber
                    value={formData.widthPercent || 12}
                    onChange={(value) => {
                      // Валидация: максимальная ширина не должна превышать 50% от ширины SVG
                      const maxWidth = 50
                      const validatedValue = value > maxWidth ? maxWidth : (value < 5 ? 5 : value)
                      setFormData({ ...formData, widthPercent: validatedValue })
                    }}
                    min={5}
                    max={50}
                    style={{ width: '100%' }}
                    addonAfter="%"
                    tooltip="Ширина в процентах от ширины схемы SVG"
                  />
                </FormField>
              )}
              {section.position === 'middle' && (
                <FormField label="Высота балкона (%)">
                  <InputNumber
                    value={formData.heightPercent || 25}
                    onChange={(value) => {
                      // Валидация: максимальная высота не должна превышать 50% от высоты SVG
                      const maxHeight = 50
                      const validatedValue = value > maxHeight ? maxHeight : (value < 5 ? 5 : value)
                      setFormData({ ...formData, heightPercent: validatedValue })
                    }}
                    min={5}
                    max={50}
                    style={{ width: '100%' }}
                    addonAfter="%"
                    tooltip="Высота в процентах от высоты схемы SVG (максимум 50% для предотвращения перекрытий)"
                  />
                </FormField>
              )}
            </>
          )}
        </>
      )}
      
      {section.type === SECTION_TYPES.BAR && (
        <>
          <FormField label="Ширина бара">
            <InputNumber
              value={formData.width || 100}
              onChange={(value) => setFormData({ ...formData, width: value })}
              min={20}
              style={{ width: '100%' }}
            />
          </FormField>
          <FormField label="Высота бара">
            <InputNumber
              value={formData.height || 80}
              onChange={(value) => setFormData({ ...formData, height: value })}
              min={20}
              style={{ width: '100%' }}
            />
          </FormField>
        </>
      )}
      
      {section.type === SECTION_TYPES.TABLE && (
        <>
          <FormField label="Форма стола">
            <Select
              value={formData.shape || 'round'}
              onChange={(value) => {
                // При смене формы стола сбрасываем количество мест, чтобы они перерисовались
                // Сохраняем все существующие свойства, включая координаты x и y
                setFormData({ 
                  ...formData, 
                  shape: value,
                  seatsTop: formData.seatsTop || 0,
                  seatsRight: formData.seatsRight || 0,
                  seatsBottom: formData.seatsBottom || 0,
                  seatsLeft: formData.seatsLeft || 0
                  // x и y сохраняются автоматически через spread оператор
                })
              }}
              style={{ width: '100%' }}
            >
              <Select.Option value="round">Круглый</Select.Option>
              <Select.Option value="square">Квадратный</Select.Option>
              <Select.Option value="rectangular">Прямоугольный</Select.Option>
            </Select>
          </FormField>
          
          {/* Визуальный редактор стола */}
          <FormField label="Количество мест по сторонам">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '80px 100px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              marginBottom: '16px',
              backgroundColor: '#fafafa',
              position: 'relative',
              minHeight: '130px',
              overflow: 'visible'
            }}>
              {/* Визуализация стола */}
              <div style={{
                position: 'relative',
                width: formData.shape === 'rectangular' ? `${(formData.tableSize || 60) * 2}px` : `${(formData.tableSize || 60) * 2}px`,
                height: formData.shape === 'rectangular' ? `${(formData.tableHeight || 40) * 2}px` : `${(formData.tableSize || 60) * 2}px`,
                backgroundColor: formData.color || '#8B4513',
                borderRadius: formData.shape === 'round' ? '50%' : '4px',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {/* Инпуты по сторонам стола - всегда 4 стороны */}
                {/* Верх */}
                <div style={{
                  position: 'absolute',
                  top: '-80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 10
                }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Сверху</div>
                  <InputNumber
                    value={formData.seatsTop || 0}
                    onChange={(value) => setFormData({ ...formData, seatsTop: value || 0 })}
                    min={0}
                    size="small"
                    style={{ width: '70px' }}
                    placeholder="0"
                  />
                </div>
                {/* Право */}
                <div style={{
                  position: 'absolute',
                  right: '-100px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 10
                }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Справа</div>
                  <InputNumber
                    value={formData.seatsRight || 0}
                    onChange={(value) => setFormData({ ...formData, seatsRight: value || 0 })}
                    min={0}
                    size="small"
                    style={{ width: '70px' }}
                    placeholder="0"
                  />
                </div>
                {/* Низ */}
                <div style={{
                  position: 'absolute',
                  bottom: '-80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 10
                }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Снизу</div>
                  <InputNumber
                    value={formData.seatsBottom || 0}
                    onChange={(value) => setFormData({ ...formData, seatsBottom: value || 0 })}
                    min={0}
                    size="small"
                    style={{ width: '70px' }}
                    placeholder="0"
                  />
                </div>
                {/* Лево */}
                <div style={{
                  position: 'absolute',
                  left: '-100px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 10
                }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Слева</div>
                  <InputNumber
                    value={formData.seatsLeft || 0}
                    onChange={(value) => setFormData({ ...formData, seatsLeft: value || 0 })}
                    min={0}
                    size="small"
                    style={{ width: '70px' }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </FormField>
          {(formData.shape === 'round' || formData.shape === 'square') && (
            <FormField label="Размер стола">
              <InputNumber
                value={formData.tableSize || 60}
                onChange={(value) => setFormData({ ...formData, tableSize: value })}
                min={20}
                style={{ width: '100%' }}
              />
            </FormField>
          )}
          {formData.shape === 'rectangular' && (
            <>
              <FormField label="Ширина стола">
                <InputNumber
                  value={formData.tableSize || 60}
                  onChange={(value) => setFormData({ ...formData, tableSize: value })}
                  min={20}
                  style={{ width: '100%' }}
                />
              </FormField>
              <FormField label="Высота стола">
                <InputNumber
                  value={formData.tableHeight || 40}
                  onChange={(value) => setFormData({ ...formData, tableHeight: value })}
                  min={20}
                  style={{ width: '100%' }}
                />
              </FormField>
            </>
          )}
        </>
      )}
      
      {section.type === SECTION_TYPES.SOFA && (
        <>
          <FormField label="Ширина дивана">
            <InputNumber
              value={formData.sofaWidth || 120}
              onChange={(value) => setFormData({ ...formData, sofaWidth: value })}
              min={40}
              style={{ width: '100%' }}
            />
          </FormField>
          <FormField label="Высота дивана">
            <InputNumber
              value={formData.sofaHeight || 60}
              onChange={(value) => setFormData({ ...formData, sofaHeight: value })}
              min={30}
              style={{ width: '100%' }}
            />
          </FormField>
          
          {/* Визуальный редактор дивана */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '40px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              backgroundColor: '#fafafa',
              position: 'relative',
              minHeight: '130px'
            }}>
              {/* Визуализация дивана */}
              <div style={{
                position: 'relative',
                width: `${(formData.sofaWidth || 120) * 1.5}px`,
                height: `${(formData.sofaHeight || 60) * 1.5}px`,
                backgroundColor: formData.color || '#8B4513',
                borderRadius: '4px',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {/* Показываем места внутри дивана */}
                {(formData.seatsCount || 0) > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    right: '10px',
                    bottom: '10px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    alignItems: 'flex-start',
                    alignContent: 'flex-start'
                  }}>
                    {Array.from({ length: Math.min(formData.seatsCount || 0, 20) }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: formData.seatColor || '#ffaa00',
                          border: '1px solid #000',
                          flexShrink: 0
                        }}
                      />
                    ))}
                    {(formData.seatsCount || 0) > 20 && (
                      <div style={{
                        fontSize: '10px',
                        color: '#666',
                        width: '100%',
                        textAlign: 'center',
                        marginTop: '4px'
                      }}>
                        +{(formData.seatsCount || 0) - 20} мест
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <FormField label="Количество мест">
            <InputNumber
              value={formData.seatsCount || 0}
              onChange={(value) => setFormData({ ...formData, seatsCount: value || 0 })}
              min={0}
              style={{ width: '100%' }}
            />
          </FormField>
        </>
      )}
    </div>
  )
}

export default SectionForm
