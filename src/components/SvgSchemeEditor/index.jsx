import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Upload, Input, Typography, ColorPicker, Flex, Select, Form, Space, Radio, App } from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons'
import axios from 'axios'
import { clearFillAndStringify, getCategories, transformScheme } from './utils'
import { EMPTY_ARRAY, EMPTY_FUNC, NON_SEAT_ROW } from '../../consts'
import SvgScheme, { SeatPreview as SvgSchemeSeatPreview  } from '../SvgScheme'
import SvgSchemeEditSeat from './edit-seat'
import FieldForm from './field-form'
import { activeSeatClassName, defaultCustomProps, labelClass, seatClassName } from './consts'
import { isMacintosh, renderHiddenHTML, setCurrentColor, toText } from '../../utils/utils'
import SchemeLayoutBuilder from './SchemeLayoutBuilder/SchemeLayoutBuilder'
import s from './svg-scheme-editor.module.scss'
import Categories from './categories'

const { Title } = Typography

const getSelectionKey = selected => {
  const key = selected.map(el => el.getAttribute('data-row') ? `${el.getAttribute('data-row')}-${el.getAttribute('data-seat')}` : el.getAttribute('data-category')).join('_')
  return key
}

const isMac = isMacintosh()

const MODE_UPLOAD = 'upload'
const MODE_LAYOUT = 'layout'

export default function SvgSchemeEditor(props) {
  const { initialValue, value, onChange, tickets = [], onTicketsChange = EMPTY_FUNC, hallId, changedPrice = {}, allowCreateScheme = true } = props
  const { modal } = App.useApp()
  const [ categories, setCategories ] = useState(value?.categories || EMPTY_ARRAY)
  const [customProps, setCustomProps] = useState(value?.customProps || defaultCustomProps || [])
  const [ scheme, setScheme ] = useState(value?.scheme || '')
  const [ selectedSeats, setSelectedSeats ] = useState([])
  const [ editProp, setEditProp ] = useState('categories')
  const [ mode, setMode ] = useState(value?.scheme ? MODE_UPLOAD : MODE_UPLOAD)
  const [savedSections, setSavedSections] = useState(null) // Сохраняем секции при переключении режимов
  const svgRef = useRef()
  
  // Используем ref для отслеживания предыдущего value, чтобы избежать бесконечных циклов
  const prevValueRef = useRef(value)
  const isInternalUpdateRef = useRef(false)
  
  // Обновляем схему, категории и customProps при изменении value prop
  useEffect(() => {
    // Пропускаем обновление, если это внутреннее обновление (из onChange)
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false
      return
    }
    
    // Проверяем, действительно ли value изменился
    const valueStr = JSON.stringify(value)
    const prevValueStr = JSON.stringify(prevValueRef.current)
    if (valueStr === prevValueStr) {
      return
    }
    
    prevValueRef.current = value
    
    if (value) {
      if (value.scheme && value.scheme !== scheme) {
        setScheme(value.scheme)
        // Если схема загружена, переключаемся в режим просмотра только если мы не в режиме создания
        if (mode === MODE_LAYOUT && value.scheme) {
          setMode(MODE_UPLOAD)
        }
      }
      if (value.categories && JSON.stringify(value.categories) !== JSON.stringify(categories)) {
        setCategories(value.categories)
      }
      if (value.customProps && JSON.stringify(value.customProps) !== JSON.stringify(customProps)) {
        setCustomProps(value.customProps)
      }
    } else {
      // Если value пустой, сбрасываем схему и остаемся в режиме выбора
      if (scheme) {
        setScheme('')
      }
    }
  }, [value])
  
  useEffect(() => {
    if (typeof value === 'string' && value?.startsWith('http')) {
      axios.get(value).then(({ data }) => {
        if (!data) {
          console.error('No data received from server');
          return;
        }
        const svg = renderHiddenHTML(data.scheme || '')
        if (!svg) return
        const nonSeatCount = {}
        tickets.forEach(({ section, row, seat, price, tariff, is_sold, is_reserved }) => {
          const ticketPrice = typeof price === 'number' ? price : (typeof tariff === 'number' ? tariff : null)
          
          if (row === NON_SEAT_ROW) {
            const key = is_sold || is_reserved ? 'busyCount' : 'count'
            nonSeatCount[section] = (nonSeatCount[section] || {})
            nonSeatCount[section][key] = (nonSeatCount[section][key] || 0) + 1
            if (!nonSeatCount[section].price && ticketPrice) {
              nonSeatCount[section].price = ticketPrice
            }
            return
          }
          if (ticketPrice !== null) {
            svg.querySelector(`.${seatClassName}[data-row="${row}"][data-seat="${seat}"]`)?.setAttribute('data-price', ticketPrice)
          }
          if (is_sold || is_reserved) {
            svg.querySelector(`.${seatClassName}[data-row="${row}"][data-seat="${seat}"]`)?.setAttribute('data-disabled', '')
          }
        })
        Object.entries(nonSeatCount).map(([ key, value ]) => {
          const el = svg.querySelector(`.${seatClassName}[data-category="${key}"]`)
          el?.setAttribute('data-price', value.price || 0)
          el?.setAttribute('data-count', value.count || 0)
          el?.setAttribute('data-busyCount', value.busyCount || 0)
        })
        
        tickets.filter(item => item.status === 2 || item.is_reserved).forEach(ticket => {
          const el = svg.querySelector(`.${seatClassName}[data-row="${ticket.row}"][data-seat="${ticket.seat}"]`)
          if (el) {
            el.setAttribute('data-disabled', '')
            el.setAttribute('style', 'stroke: red; stroke-width: 2px;')
            el.classList.add('unavailable')
          }
        })
        
        tickets.filter(item => item.status === 3 || item.is_sold).forEach(ticket => {
          const el = svg.querySelector(`.${seatClassName}[data-row="${ticket.row}"][data-seat="${ticket.seat}"]`)
          if (el) {
            el.setAttribute('data-disabled', '')
            el.setAttribute('fill', '#808080') 
            el.setAttribute('style', 'fill: #808080;') 
            el.classList.add('unavailable')
          }
        })
        
        const s = new XMLSerializer();
        setScheme(s.serializeToString(svg))
        setCategories(data.categories)
        
        if (!(data.customProps || []).find(prop => prop.value == 'count')) {
          data.customProps = [ ...(data.customProps || []).slice(0, 2), {
            value: 'count',
            label: 'Tickets leave',
            type: 'number',
          }, {
            value: 'busyCount',
            label: 'Booking / Sold',
            type: 'number',
          }, ...data.customProps.slice(2)]
        }
        setCustomProps(data.customProps)
        document.body.removeChild(svg.parentNode)
      })
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current) return
    
    // svgRef может указывать на div, нужно найти SVG внутри
    const svgElement = svgRef.current.querySelector('svg') || svgRef.current
    if (!svgElement || !svgElement.querySelectorAll) return
    
    const unavailableElements = svgElement.querySelectorAll('.unavailable')
    if (unavailableElements) {
      unavailableElements.forEach(el => {
        el.removeAttribute('data-disabled')
        el.removeAttribute('style')
        el.removeAttribute('fill')
        el.classList.remove('unavailable')
      })
    }
    
    tickets.filter(item => item.status === 2 || item.is_reserved).forEach(ticket => {
      const el = svgElement.querySelector(`.${seatClassName}[data-row="${ticket.row}"][data-seat="${ticket.seat}"]`)
      if (el) {
        el.setAttribute('data-disabled', '')
        el.setAttribute('style', 'stroke: red; stroke-width: 2px;')
        el.classList.add('unavailable')
      }
    })
    
    tickets.filter(item => item.status === 3 || item.is_sold).forEach(ticket => {
      const el = svgElement.querySelector(`.${seatClassName}[data-row="${ticket.row}"][data-seat="${ticket.seat}"]`)
      if (el) {
        el.setAttribute('data-disabled', '')
        el.setAttribute('fill', '#808080') 
        el.setAttribute('style', 'fill: #808080;') 
        el.classList.add('unavailable')
      }
    })
  }, [tickets])

  // Используем ref для отслеживания предыдущих значений, чтобы избежать бесконечных циклов
  const prevDataRef = useRef({ scheme, categories, customProps })
  
  useEffect(() => {
    // Проверяем, действительно ли данные изменились
    const currentData = { scheme, categories, customProps }
    const prevData = prevDataRef.current
    
    if (
      prevData.scheme === currentData.scheme &&
      JSON.stringify(prevData.categories) === JSON.stringify(currentData.categories) &&
      JSON.stringify(prevData.customProps) === JSON.stringify(currentData.customProps)
    ) {
      return
    }
    
    prevDataRef.current = currentData
    
    // Устанавливаем флаг, что это внутреннее обновление
    isInternalUpdateRef.current = true
    onChange(currentData)
  }, [scheme, categories, customProps, onChange])

  useEffect(() => {
    if (!svgRef.current) return
    // svgRef может указывать на div, нужно найти SVG внутри
    const svgElement = svgRef.current.querySelector('svg') || svgRef.current
    if (svgElement && svgElement.querySelectorAll) {
      svgElement.querySelectorAll(`.${seatClassName}.${activeSeatClassName}`).forEach(el => el.classList.remove(activeSeatClassName))
      selectedSeats.forEach(el => el.classList.add(activeSeatClassName))
    }
  }, [selectedSeats])

  const handleChangeCategory = useCallback((index, key, value) => {
    setCategories(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }, [setCategories])

  const reorderCategories = useCallback((index, targetIndex) => {
    const items = [ ...categories ]
    const [removed] = items.splice(index, 1)
    items.splice(targetIndex, 0, removed)
    setCategories(items)
  })

  const deleteCategory = useCallback((value) => {
    if (svgRef.current) {
      // svgRef может указывать на div, нужно найти SVG внутри
      const svgElement = svgRef.current.querySelector('svg') || svgRef.current
      if (svgElement && svgElement.querySelectorAll) {
        Array.from(svgElement.querySelectorAll(`.${seatClassName}[data-category="${value}"]`))
          .forEach(el => el.removeAttribute('data-category'))
      }
    }
    setCategories(prev => prev.filter((cat) => cat.value !== value))
  }, [setCategories])

  const toggleSelect = ({ detail, target: el, ctrlKey, metaKey }) => {
    const isDoubleClick = detail > 1
    setSelectedSeats(prev => {
      if (isDoubleClick) {
        if (!svgRef.current) return prev
        // svgRef может указывать на div, нужно найти SVG внутри
        const svgElement = svgRef.current.querySelector('svg') || svgRef.current
        if (!svgElement || !svgElement.querySelectorAll) return prev
        const cat = el.getAttribute('data-category')
        const group = Array.from(svgElement.querySelectorAll(`.${seatClassName}[data-category="${cat}"]`))
        const isFullIncludes = group.every(el => prev.includes(el))
        return ctrlKey || metaKey ? 
          (isFullIncludes ? prev.filter(el => !group.includes(el)) : prev.filter(el => !group.includes(el)).concat(group)) :
          group
      }
      if (ctrlKey || metaKey) {
        return prev.includes(el) ? prev.filter(item => item !== el) : [...prev, el] 
      }
      const next = prev.length === 1 ? (prev[0] === el ? [] : [el]) : [el]
      return prev.length === 1 ? (prev[0] === el ? [] : [el]) : [el]
    })
  }

  const changeSelected = useCallback((values) => {
    const changesMap = {}
    setSelectedSeats(prev => prev.map(el => {
      if (values.price !== undefined || values.count !== undefined) {
        const [cat, seat, row] = ['category', 'seat', 'row'].map(key => el.getAttribute(`data-${key}`))
        const hall_id = el.getAttribute('data-hall_id') || el.getAttribute('data-hall') || hallId
        if (!seat && !row) {
          changesMap[cat] = {
            price: values.price !== undefined ? values.price : undefined,
            count: values.count !== undefined ? values.count : undefined
          }
        } else if (values.price !== undefined) {
          const key = [hall_id, cat, row, seat].filter(Boolean).join(';')
          changesMap[key] = values.price
        }
      }
      Object.entries(values).forEach(([key, value]) => value !== undefined && value !== null && value !== '' ?
        el.setAttribute(`data-${key}`, value) :
        el.removeAttribute(`data-${key}`)
      )
      return el
    }))
    
    if (Object.keys(changesMap).length > 0 && onTicketsChange) {
      onTicketsChange(changesMap)
    }
    
    updateFromSvg()
  }, [hallId, onTicketsChange])

  const updateFromSvg = (cb) => {
    if (!svgRef.current) {
      cb && cb(null)
      return
    }
    // svgRef может указывать на div, нужно найти SVG внутри
    const svgElement = svgRef.current.querySelector('svg') || svgRef.current
    if (!svgElement) {
      cb && cb(null)
      return
    }
    const node = svgElement.cloneNode(true)
    if (node) {
      const priceElements = node.querySelectorAll(`.${seatClassName}[data-price]`)
      if (priceElements) priceElements.forEach(el => el.removeAttribute('data-price'))
      const countElements = node.querySelectorAll(`.${seatClassName}[data-count]`)
      if (countElements) countElements.forEach(el => el.removeAttribute('data-count'))
      const activeElements = node.querySelectorAll(`.${seatClassName}.${activeSeatClassName}`)
      if (activeElements) activeElements.forEach(el => el.classList.remove(activeSeatClassName))
      
      // Используем XMLSerializer для сохранения полной структуры SVG с атрибутами
      const serializer = new XMLSerializer()
      const newSchemeContent = serializer.serializeToString(node)
      
      // Обновляем схему только если новый контент не пустой
      if (newSchemeContent && newSchemeContent.trim()) {
        setScheme(newSchemeContent)
      }
    }
    cb && cb(null)
  }

  // Объединяем defaultCustomProps с customProps, чтобы все поля всегда были доступны
  const allCustomProps = useMemo(() => {
    const defaultValues = defaultCustomProps.map(dcp => dcp.value)
    const merged = [...defaultCustomProps, ...customProps.filter(cp => !defaultValues.includes(cp.value))]
    return merged
  }, [customProps])

  const propOptions = useMemo(() => ([
    { value: 'categories', label: 'Categories' },
    ...allCustomProps
  ]), [allCustomProps])

  const activeProp = editProp === 'new' ?
    { isNewField: true } :
    allCustomProps.find(({ value }) => value == editProp)
  
  const handleBuilderChange = useCallback((newScheme) => {
    try {
      // newScheme уже является полным SVG
      const parser = new DOMParser()
      const doc = parser.parseFromString(newScheme, 'image/svg+xml')
      const svg = doc.querySelector('svg')
      if (svg) {
        // Извлекаем viewBox и содержимое
        const viewBox = svg.getAttribute('viewBox') || '0 0 1000 800'
        const serializer = new XMLSerializer()
        
        // Создаем новый SVG с правильной структурой для сохранения
        const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        newSvg.setAttribute('viewBox', viewBox)
        newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        // Устанавливаем фон как при создании схемы (#2a2a2a)
        newSvg.setAttribute('style', 'border: 1px solid #d9d9d9; background: #2a2a2a; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;')
        
        // Копируем все дочерние элементы, исключая временные элементы обводки
        Array.from(svg.children).forEach(child => {
          // Пропускаем временные элементы обводки (они используются только для редактирования)
          if (child.getAttribute && child.getAttribute('data-temp-overlay') === 'true') {
            return
          }
          newSvg.appendChild(child.cloneNode(true))
        })
        
        // Добавляем класс .svg-seat для элементов танцпола, которые имеют data-count но не имеют data-seat и data-row
        // Это нужно для кликабельности танцпола в режиме просмотра
        const dancefloorElements = newSvg.querySelectorAll('[data-count]:not([data-seat]):not([data-row])')
        dancefloorElements.forEach(el => {
          if (!el.classList.contains('svg-seat')) {
            el.classList.add('svg-seat')
          }
        })
        
        // Восстанавливаем pointer-events для мест после удаления временных элементов
        const seats = newSvg.querySelectorAll('.svg-seat')
        seats.forEach(el => {
          // Восстанавливаем pointer-events для мест, чтобы они были кликабельными после сохранения
          el.style.pointerEvents = 'auto'
          
          if (!el.hasAttribute('data-category')) {
            // Если нет категории, назначаем первую доступную или создаем по умолчанию
            const defaultCategory = categories.length > 0 ? categories[0].value : 'cat1'
            el.setAttribute('data-category', defaultCategory)
            
            // Если нет категории в списке, добавляем
            if (!categories.find(c => c.value === defaultCategory)) {
              setCategories(prev => [...prev, { 
                value: defaultCategory, 
                label: defaultCategory, 
                color: el.getAttribute('fill') || '#cccccc',
                icon: null 
              }])
            }
          }
        })
        
        const processedScheme = serializer.serializeToString(newSvg)
        setScheme(processedScheme)
        
        // Обновляем категории если нужно (исключаем сцену)
        const newCategories = getCategories(newSvg)
        if (newCategories && newCategories.length > 0) {
          setCategories(prev => {
            const existing = prev.map(c => c.value)
            // Фильтруем категории, исключая сцену (stage)
            const toAdd = newCategories.filter(c => 
              !existing.includes(c.value) && 
              c.value !== 'stage' && 
              c.value.toLowerCase() !== 'stage'
            )
            return [...prev, ...toAdd]
          })
        }
      }
    } catch (e) {
      console.warn('Failed to process builder scheme:', e)
      // Если не удалось распарсить, пробуем использовать как есть
      setScheme(newScheme)
    }
  }, [categories])

  return (
    <Flex className={s.form} style={mode === MODE_LAYOUT ? { flexDirection: 'column' } : { flexDirection: 'row' }}>
      <div className={mode === MODE_LAYOUT ? s.schemeFullWidth : s.scheme}>
        <div className={labelClass}>Seating plan</div>
        {!scheme && (
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            {mode === MODE_UPLOAD && (
              <Upload
                accept='.svg'
                itemRender={() => null}
                customRequest={e => toText(e.file)
                  .then(transformScheme)
                  .then(scheme => ({ categories: getCategories(scheme), scheme: clearFillAndStringify(scheme) }))
                  .then(({ categories, scheme }) => {
                    setScheme(scheme)
                    setCategories(categories)
                    setCustomProps(defaultCustomProps)
                    setMode(MODE_UPLOAD)
                  })}
              >
                <Button size='large' type='primary' htmlType='button' icon={<UploadOutlined />} block>
                  Загрузить SVG файл
                </Button>
              </Upload>
            )}
            
            {allowCreateScheme && (
              <Button 
                size='large' 
                type={mode === MODE_LAYOUT ? 'primary' : 'default'}
                htmlType='button' 
                icon={<EditOutlined />}
                onClick={() => {
                  // Убеждаемся, что customProps содержит все поля из defaultCustomProps при создании схемы
                  if (!customProps || customProps.length === 0) {
                    setCustomProps(defaultCustomProps)
                  } else {
                    const defaultValues = defaultCustomProps.map(dcp => dcp.value)
                    const hasAllDefaults = defaultValues.every(dv => customProps.some(cp => cp.value === dv))
                    if (!hasAllDefaults) {
                      const merged = [...defaultCustomProps, ...customProps.filter(cp => !defaultValues.includes(cp.value))]
                      setCustomProps(merged)
                    }
                  }
                  setMode(MODE_LAYOUT)
                }}
              >
                Создать схему
              </Button>
            )}
            
            {mode === MODE_LAYOUT && !scheme && (
              <div style={{ padding: '20px', background: '#fafafa', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
                <Typography.Text>
                  Используйте умный редактор для создания схемы зала с автоматической генерацией мест. Добавляйте секции (сцена, танцпол, ряды, балкон) и настраивайте их параметры.
                </Typography.Text>
              </div>
            )}
          </Space>
        )}
        
        {mode === MODE_LAYOUT ? (
          <div style={{ width: '100%' }}>
            <SchemeLayoutBuilder
              onSchemeChange={handleBuilderChange}
              initialScheme={scheme || ''}
              categories={categories}
              initialSections={savedSections}
              onSectionsChange={setSavedSections}
              onCategoriesChange={setCategories}
              onViewMode={() => setMode(MODE_UPLOAD)}
              onBackToSelection={() => {
                // Очищаем все данные и возвращаемся к экрану выбора
                setScheme('')
                setSavedSections(null)
                setCategories([])
                setCustomProps(defaultCustomProps)
                setSelectedSeats([])
                setMode(MODE_UPLOAD)
                // Очищаем SVG ref, чтобы схема не отображалась
                if (svgRef.current) {
                  const svgElement = svgRef.current.querySelector('svg') || svgRef.current
                  if (svgElement) {
                    svgElement.innerHTML = ''
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className={`${s.root} ${mode === MODE_UPLOAD ? s.viewMode : ''}`}>
            {scheme && mode === MODE_UPLOAD && (
              <>
                {/* Кнопка "Редактировать" показывается только для созданных схем, не для загруженных */}
                {savedSections !== null && (
                  <Button
                    size='large'
                    type='default'
                    htmlType='button'
                    icon={<EditOutlined />}
                    onClick={() => {
                      setMode(MODE_LAYOUT)
                    }}
                    style={{
                      zIndex: 100,
                      position: 'absolute',
                      left: 10,
                      top: 10
                    }}
                  >
                    Редактировать
                  </Button>
                )}
                <Button
                  size='large'
                  type='primary'
                  htmlType='button'
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    modal.confirm({
                      title: 'Удалить схему?',
                      content: 'Это действие нельзя отменить.',
                      okText: 'Удалить',
                      okType: 'danger',
                      cancelText: 'Отмена',
                      onOk: () => {
                        setScheme('')
                        setSavedSections(null)
                        setCategories([])
                        setCustomProps([])
                        setMode(MODE_UPLOAD)
                      }
                    })
                  }}
                  style={{
                    zIndex: 100,
                    position: 'absolute',
                    left: savedSections !== null ? 150 : 10,
                    top: 10
                  }}
                  danger
                />
                {scheme && (
                  <SvgScheme
                    categories={categories}
                    src={scheme}
                    ref={svgRef}
                    onSeatClick={toggleSelect}
                    onSeatDoubleClick={toggleSelect}
                    tooltip={data => {
                      const ticket = tickets.find(t => t.section === data.category && t.row === data.row && `${t.seat}` === `${data.seat}`)
                      return (
                        <SvgSchemeSeatPreview
                          className={s.preview}
                          categories={categories}
                          {...data}
                          footer={<div className={s.previewFooter}>
                            {!!ticket &&<div className={s.previewQr}>
                              <b>QR-code</b><br />
                              {ticket.code_qr_base64 ? <img src={ticket?.code_qr_base64} alt='QR-code' /> : 'would generated after next save'}
                            </div>}
                            <div className={s.previewActions}>
                              <div><b>Click</b> to edit seat</div>
                              {selectedSeats.length > 0 && <div><b>{isMac ? '⌘' : 'Ctrl'} + click</b> to add to edit list</div>}
                              <div><b>Double click</b> to edit all seats with the same category</div>
                            </div>
                          </div>}
                        />
                      )
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
      {mode === MODE_UPLOAD && !!scheme && (
        <div className={s.params}>
          {selectedSeats.length > 0 && <>
            <div className={labelClass}>Seating properties</div>
            <SvgSchemeEditSeat
              tickets={tickets}
              key={getSelectionKey(selectedSeats)}
              categories={categories}
              seats={selectedSeats}
              fields={[...defaultCustomProps, ...customProps.filter(cp => !defaultCustomProps.find(dcp => dcp.value === cp.value))]}
              onOk={() => {
                // Просто очищаем выбранные места, не обновляя схему
                // Схема уже сохранена и не должна пропадать
                setSelectedSeats([])
              }}
              onChange={changeSelected}
              hallId={hallId}
              changedPrice={changedPrice}
            />
          </>}
          {!!scheme && mode === MODE_UPLOAD && !selectedSeats.length && <>
            <div className={labelClass}>Available seating settings</div>
            <Space.Compact style={{ display: 'flex' }}>
              <Select
                size='large'
                value={editProp}
                onChange={setEditProp}
                options={propOptions.filter(({ value }) => !['row', 'seat'].includes(value)).map(({ label, value }) => ({ label, value }))}
                disabled={editProp === 'new'}
              />
              <Button
                size='large'
                type='primary'
                style={{ background: '#fff' }}
                onClick={() => {
                  setEditProp('new')
                }}
                disabled={editProp === 'new'}
                ghost
              >
                <PlusOutlined /> Add option
              </Button>
            </Space.Compact>
            {editProp === 'categories' ?
              <Card>
                <Title level={5} className={s.title}>Options</Title>
                <Categories 
                  items={categories.filter(c => c.value !== 'stage' && c.value.toLowerCase() !== 'stage')} 
                  onChange={handleChangeCategory} 
                  reorder={reorderCategories} 
                  deleteCategory={deleteCategory} 
                />
                <Button type='dashed' className={s.addCat} onClick={() => setCategories([...categories, { value: `cat${categories.length + 1}`, label: '', icon: null, color: '#000' }])} block>
                  <PlusOutlined /> Add category
                </Button>
              </Card> :
              <FieldForm
                key={activeProp.value}
                {...activeProp}
                onCreate={values => {
                  setCustomProps(prev => ([ ...prev, values ]))
                  setEditProp(values.value)
                }}
                onCancel={() => setEditProp('categories')}
                onChange={(name, value) => editProp !== 'new' && setCustomProps(prev => {
                  const index = prev.findIndex(({ value }) => value === activeProp.value)
                  if (index > -1) {
                    const newProps = [ ...prev ]
                    newProps[index] = { ...activeProp, [name]: value }
                    return newProps
                  }
                  return prev
                })}
                onDelete={value => {
                  setEditProp('categories')
                  setCustomProps(prev => prev.filter(item => item.value !== value))
                }}
              />
            }
          </>}
        </div>
      )}
    </Flex>
  )
}