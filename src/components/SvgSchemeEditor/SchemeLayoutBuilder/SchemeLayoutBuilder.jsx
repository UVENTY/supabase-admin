import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Select, Space, Tabs, Typography, ColorPicker, Radio, Divider, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { seatClassName } from '../consts'
import { NON_SEAT_ROW } from '../../../consts'
import s from '../scheme-layout-builder.module.scss'
import { SECTION_TYPES, DEFAULT_VIEWBOX } from './constants'
import { createMultilineText, snapToGrid } from './utils'
import SectionModal from './SectionModal'
import Toolbar from './Toolbar'
import Sidebar from './Sidebar'
import SectionActionMenu from './SectionActionMenu'
import { useSectionHandlers } from './hooks/useSectionHandlers'
import { useTableDragging } from './hooks/useTableDragging'

const { TabPane } = Tabs

export default function SchemeLayoutBuilder({ 
  onSchemeChange, 
  initialScheme = '',
  categories = [],
  initialSections = null,
  onSectionsChange = null,
  onCategoriesChange = null,
  onViewMode = null,
  onBackToSelection = null
}) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [sections, setSections] = useState(initialSections || [])
  const [activeSection, setActiveSection] = useState(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [modalSectionId, setModalSectionId] = useState(null)
  const [modalSectionData, setModalSectionData] = useState(null) // Временные данные формы
  const [draggingTableId, setDraggingTableId] = useState(null) // ID перетаскиваемого стола
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }) // Начальная позиция при перетаскивании
  const [dragStartTablePos, setDragStartTablePos] = useState({ x: 0, y: 0 }) // Начальная позиция стола
  const [actionMenuVisible, setActionMenuVisible] = useState(false) // Видимость меню выбора действия
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 }) // Позиция меню
  const [actionMenuSectionId, setActionMenuSectionId] = useState(null) // ID секции для меню
  const [justFinishedDragging, setJustFinishedDragging] = useState(false) // Флаг для предотвращения открытия меню после перетаскивания
  const generateTimeoutRef = useRef(null)
  const notifyChangeTimeoutRef = useRef(null)
  const isInitialMountRef = useRef(true)
  const clickHandlerRef = useRef(null)
  const mouseDownHandlerRef = useRef(null)
  
  // Обновление секции (определяем раньше, чтобы использовать в useEffect)
  const handleUpdateSection = useCallback((id, updates) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) {
        // Если updates - это полный объект секции (из модального окна), используем его
        // Иначе применяем как частичные обновления
        let updatedSection
        if (updates.id && updates.type) {
          // Для столов, рядов, балконов и танцпола сохраняем координаты x и y из исходной секции, если они были заданы
          if (s.type === SECTION_TYPES.TABLE || s.type === SECTION_TYPES.ROWS || s.type === SECTION_TYPES.BALCONY || s.type === SECTION_TYPES.DANCEFLOOR || s.type === SECTION_TYPES.SOFA) {
            updatedSection = {
              ...updates,
              // Сохраняем координаты, если они были заданы в исходной секции
              x: updates.x !== undefined && updates.x !== null ? updates.x : (s.x !== undefined && s.x !== null ? s.x : null),
              y: updates.y !== undefined && updates.y !== null ? updates.y : (s.y !== undefined && s.y !== null ? s.y : null)
            }
          } else {
            updatedSection = updates
          }
        } else {
          updatedSection = { ...s, ...updates }
        }
        
        return updatedSection
      }
      return s
    }))
  }, [])
  
  // Функция для закрытия меню (определяем раньше, чтобы использовать в useTableDragging)
  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false)
    setActionMenuSectionId(null)
  }, [])
  
  // Синхронизируем цвет категории с цветом секции (отдельный useEffect, чтобы избежать setState во время рендеринга)
  useEffect(() => {
    if (onCategoriesChange) {
      sections.forEach(section => {
        if (section.category && section.color) {
          const categoryIndex = categories.findIndex(c => c.value === section.category)
          if (categoryIndex >= 0 && categories[categoryIndex].color !== section.color) {
            // Обновляем цвет категории асинхронно
            setTimeout(() => {
              const updatedCategories = [...categories]
              updatedCategories[categoryIndex] = {
                ...updatedCategories[categoryIndex],
                color: section.color
              }
              onCategoriesChange(updatedCategories)
            }, 0)
          }
        }
      })
    }
  }, [sections, categories, onCategoriesChange])
  
  // Используем хук для перетаскивания столов и баров
  useTableDragging({
    draggingTableId,
    dragStartPos,
    dragStartTablePos,
    sections,
    isModalVisible,
    svgRef,
    handleUpdateSection,
    setDraggingTableId,
    setDragStartPos,
    setDragStartTablePos,
    categories,
    onCategoriesChange,
    closeActionMenu,
    setJustFinishedDragging
  })
  
  // Сохраняем секции при их изменении (с debounce для быстрых изменений)
  useEffect(() => {
    if (onSectionsChange) {
      // Используем небольшую задержку для batch обновлений
      const timeoutId = setTimeout(() => {
        onSectionsChange(sections)
        
        // Очищаем неиспользуемые категории
        if (onCategoriesChange) {
          // Собираем все категории, которые используются в секциях
          const usedCategories = new Set()
          sections.forEach(section => {
            if (section.category) {
              usedCategories.add(section.category)
            }
          })
          
          // Удаляем категории, которые не используются ни в одной секции
          onCategoriesChange(prev => prev.filter(cat => usedCategories.has(cat.value)))
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [sections, onSectionsChange, onCategoriesChange])
  
  // Восстанавливаем секции при изменении initialSections (только при первом монтировании)
  useEffect(() => {
    // Обновляем только при первом монтировании, чтобы избежать конфликтов с локальными изменениями
    if (isInitialMountRef.current) {
      if (initialSections && initialSections.length > 0) {
        setSections(initialSections)
      }
      isInitialMountRef.current = false
    }
  }, []) // Пустой массив зависимостей - только при монтировании

  // Инициализация SVG
  useEffect(() => {
    if (!svgRef.current && containerRef.current) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', DEFAULT_VIEWBOX)
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      svg.setAttribute('style', 'border: 1px solid #d9d9d9; background: #2a2a2a; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;')
      svg.classList.add('svg-scheme-layout-builder')
      
      containerRef.current.appendChild(svg)
      svgRef.current = svg
      
      // Обработчики будут добавляться к элементам при их создании в generateScheme
      
      // Если есть сохраненные секции, они будут отрисованы через generateScheme
      // Если нет секций, но есть initialScheme, загружаем его (для обратной совместимости)
      if (!initialSections && initialScheme) {
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(initialScheme, 'image/svg+xml')
          const existingSvg = doc.querySelector('svg')
          if (existingSvg) {
            const viewBox = existingSvg.getAttribute('viewBox') || DEFAULT_VIEWBOX
            svg.setAttribute('viewBox', viewBox)
            Array.from(existingSvg.children).forEach(child => {
              svg.appendChild(child.cloneNode(true))
            })
            parseExistingScheme(svg)
          }
        } catch (e) {
          console.warn('Failed to parse initial scheme:', e)
        }
      }
      
      // Если есть секции, они будут отрисованы автоматически через generateScheme
      if (sections.length === 0) {
        notifyChange()
      }
    }
  }, [initialSections, sections.length])

  // Парсинг существующей схемы для загрузки секций
  const parseExistingScheme = useCallback((svg) => {
    // Здесь можно добавить логику парсинга существующей схемы
    // Пока просто создаем пустой массив секций
    setSections([])
  }, [])

  // Уведомление об изменении схемы
  const notifyChange = useCallback(() => {
    if (!svgRef.current || !onSchemeChange) return
    try {
      const svg = svgRef.current.cloneNode(true)
      
      // Удаляем все временные элементы обводки перед сохранением
      const tempOverlays = svg.querySelectorAll('[data-temp-overlay="true"]')
      tempOverlays.forEach(el => el.remove())
      
      // Восстанавливаем pointer-events для мест после удаления временных элементов
      const seats = svg.querySelectorAll('.svg-seat')
      seats.forEach(seat => {
        seat.style.pointerEvents = 'auto'
      })
      
      // Убеждаемся, что фон сохраняется в SVG
      if (!svg.getAttribute('style') || !svg.getAttribute('style').includes('background')) {
        svg.setAttribute('style', 'border: 1px solid #d9d9d9; background: #2a2a2a; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;')
      }
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)
      onSchemeChange(svgString)
    } catch (e) {
      console.error('Error notifying scheme change:', e)
    }
  }, [onSchemeChange])

  // Функция для показа меню выбора действия
  const showActionMenu = useCallback((sectionId, position) => {
    // Не открываем меню, если только что закончилось перетаскивание
    if (justFinishedDragging) {
      return
    }
    setActionMenuSectionId(sectionId)
    setActionMenuPosition(position)
    setActionMenuVisible(true)
  }, [justFinishedDragging])

  // Обработчик выбора "Настроить секцию"
  const handleConfigureSection = useCallback(() => {
    if (!actionMenuSectionId) return
    setModalSectionId(actionMenuSectionId)
    setIsModalVisible(true)
  }, [actionMenuSectionId])

  // Обработчик выбора "Перетащить элемент"
  const handleDragSection = useCallback(() => {
    if (!actionMenuSectionId) return
    
    const section = sections.find(s => s.id === actionMenuSectionId)
    if (!section) {
        return
    }
    
    const isTable = section.type === SECTION_TYPES.TABLE
    const isBar = section.type === SECTION_TYPES.BAR
    const isRows = section.type === SECTION_TYPES.ROWS
    const isBalcony = section.type === SECTION_TYPES.BALCONY
    const isDancefloor = section.type === SECTION_TYPES.DANCEFLOOR
    const isSofa = section.type === SECTION_TYPES.SOFA
    
    if (isTable || isBar || isRows || isBalcony || isDancefloor || isSofa) {
      // Начинаем перетаскивание программно
        const svg = svgRef.current
      if (!svg) {
          return
        }
        
      // Получаем текущую позицию элемента
        let currentX, currentY
        if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
          currentX = section.x
          currentY = section.y
      } else if (isRows || isBalcony || isDancefloor) {
        // Для рядов и балконов вычисляем центр всех элементов
        const sectionElements = svg.querySelectorAll(`[data-section-id="${actionMenuSectionId}"]`)
        if (sectionElements.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          sectionElements.forEach(el => {
            if (el.tagName === 'circle') {
              const cx = parseFloat(el.getAttribute('cx') || 0)
              const cy = parseFloat(el.getAttribute('cy') || 0)
              const r = parseFloat(el.getAttribute('r') || 0)
              minX = Math.min(minX, cx - r)
              maxX = Math.max(maxX, cx + r)
              minY = Math.min(minY, cy - r)
              maxY = Math.max(maxY, cy + r)
            } else if (el.tagName === 'text') {
              const x = parseFloat(el.getAttribute('x') || 0)
              const y = parseFloat(el.getAttribute('y') || 0)
              minX = Math.min(minX, x)
              maxX = Math.max(maxX, x)
              minY = Math.min(minY, y)
              maxY = Math.max(maxY, y)
            }
          })
          if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
            currentX = (minX + maxX) / 2
            currentY = (minY + maxY) / 2
        } else {
          const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
          const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
          currentX = vbX + vbWidth / 2
          currentY = vbY + vbHeight / 2
          }
        } else {
          const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
          const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
          currentX = vbX + vbWidth / 2
          currentY = vbY + vbHeight / 2
        }
      } else {
        const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
        const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
        currentX = vbX + vbWidth / 2
        currentY = vbY + vbHeight / 2
      }
      
      // Начинаем перетаскивание сразу
      // Используем текущую позицию элемента как начальную позицию мыши
      // Это позволит начать перетаскивание при следующем движении мыши
      setDragStartTablePos({ x: currentX, y: currentY })
      setDragStartPos({ x: currentX, y: currentY })
      setDraggingTableId(actionMenuSectionId)
    }
  }, [actionMenuSectionId, sections, svgRef])

  // Используем хук для обработчиков секций
  const { addSectionHandlers, removeSectionHandlers } = useSectionHandlers({
    svgRef,
    sections,
    draggingTableId,
    showActionMenu,
    justFinishedDragging
  })
  
  // Генерация SVG схемы из секций
  const generateScheme = useCallback(() => {
    if (!svgRef.current) return
    
    // Проверяем, что SVG все еще существует перед очисткой
    try {
      // Удаляем все обработчики перед очисткой SVG
      const allElements = svgRef.current.querySelectorAll('[data-section-id]')
      allElements.forEach(el => {
        if (el._sectionHandlers) {
          removeSectionHandlers(el)
        }
      })
      
      // Очищаем SVG
      svgRef.current.innerHTML = ''
    } catch (e) {
      console.warn('Error clearing SVG:', e)
      return
    }
    
    const viewBox = svgRef.current.getAttribute('viewBox') || DEFAULT_VIEWBOX
    const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
    
    // Функция для выравнивания по сетке (шаг сетки 10px)
    const snapToGrid = (value) => {
      return Math.round(value / 10) * 10
    }
    
    let currentY = vbY + 10 // Отступ сверху
    // Получаем высоту сцены из секции или используем значение по умолчанию
    const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
    const stageHeight = stageSection?.stageHeight || 80
    const stageWidth = stageSection?.stageWidth || (vbWidth - 100)
    const dancefloorHeight = 200
    const baseRowHeight = 30 // Базовая высота ряда
    const baseSeatSpacing = 5
    let seatSpacing = baseSeatSpacing
    
    // Находим максимальное количество мест в ряду среди всех рядов
    const rowSections = sections.filter(s => s.type === SECTION_TYPES.ROWS)
    let maxSeatsInRow = 0
    let totalRowsCount = 0
    rowSections.forEach(section => {
      const rows = section.rows || []
      totalRowsCount += rows.length
      rows.forEach(row => {
        const seatsCount = row.seatsCount || 10
        if (seatsCount > maxSeatsInRow) {
          maxSeatsInRow = seatsCount
        }
      })
    })
    
    // Если нет рядов, используем дефолтное значение
    if (maxSeatsInRow === 0) {
      maxSeatsInRow = 10
    }
    
    // Рассчитываем размер места так, чтобы максимальный ряд влезал в доступную ширину
    // Учитываем отступы для номера ряда слева (30px) и общие отступы (20px с каждой стороны для центрирования)
    const labelOffset = 30 // Отступ для номера ряда
    const sidePadding = 20 // Отступы с боков
    const availableWidth = vbWidth - labelOffset - sidePadding * 2
    const maxRowWidth = availableWidth
    // Формула: maxRowWidth = maxSeatsInRow * seatWidth + (maxSeatsInRow - 1) * seatSpacing
    // Отсюда: seatWidth = (maxRowWidth - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow
    // Сначала пробуем с базовым расстоянием между местами
    let calculatedSeatWidth = (maxRowWidth - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow
    
    // Если места слишком маленькие, уменьшаем расстояние между местами
    if (calculatedSeatWidth < 3) {
      seatSpacing = Math.max(1, (maxRowWidth - maxSeatsInRow * 3) / Math.max(1, maxSeatsInRow - 1))
      calculatedSeatWidth = Math.max(2, (maxRowWidth - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow)
    }
    
    // Рассчитываем границы боковых балконов для определения доступной ширины
    const balconySectionsForWidth = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    const leftBalconiesForWidth = balconySectionsForWidth.filter(s => s.position === 'left')
    const rightBalconiesForWidth = balconySectionsForWidth.filter(s => s.position === 'right')
    
    let leftBalconyMaxWidthForCalc = 0
    if (leftBalconiesForWidth.length > 0) {
      leftBalconiesForWidth.forEach((section) => {
        // Конвертируем проценты в реальные размеры
        const widthPercent = section.widthPercent || 12
        const balconyWidth = (widthPercent / 100) * vbWidth
        leftBalconyMaxWidthForCalc = Math.max(leftBalconyMaxWidthForCalc, balconyWidth)
      })
    }
    
    let rightBalconyMaxWidthForCalc = 0
    if (rightBalconiesForWidth.length > 0) {
      rightBalconiesForWidth.forEach((section) => {
        // Конвертируем проценты в реальные размеры
        const widthPercent = section.widthPercent || 12
        const balconyWidth = (widthPercent / 100) * vbWidth
        rightBalconyMaxWidthForCalc = Math.max(rightBalconyMaxWidthForCalc, balconyWidth)
      })
    }
    
    // Рассчитываем доступную ширину между балконами
    const leftBalconyEndXForCalc = vbX + 20 + leftBalconyMaxWidthForCalc
    const rightBalconyStartXForCalc = vbX + vbWidth - 20 - rightBalconyMaxWidthForCalc
    const availableStartXForCalc = Math.max(vbX + labelOffset, leftBalconyEndXForCalc + 5)
    const availableEndXForCalc = Math.min(vbX + vbWidth - 10, rightBalconyStartXForCalc - 5)
    const availableRowWidthForCalc = availableEndXForCalc - availableStartXForCalc
    
    // Пересчитываем размер мест с учетом доступной ширины между балконами
    // Формула: availableRowWidthForCalc = maxSeatsInRow * seatWidth + (maxSeatsInRow - 1) * seatSpacing
    let calculatedSeatWidthWithBalconies = (availableRowWidthForCalc - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow
    
    // Если места слишком маленькие, уменьшаем расстояние между местами
    if (calculatedSeatWidthWithBalconies < 3) {
      seatSpacing = Math.max(1, (availableRowWidthForCalc - maxSeatsInRow * 3) / Math.max(1, maxSeatsInRow - 1))
      calculatedSeatWidthWithBalconies = Math.max(2, (availableRowWidthForCalc - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow)
    }
    
    const seatWidth = Math.max(2, Math.min(calculatedSeatWidthWithBalconies, 20)) // Единый размер для всех рядов
    
    // Рассчитываем доступную высоту для рядов
    // Сначала вычисляем, где начинаются ряды (после сцены, если она вверху)
    let rowsStartY = vbY + 10
    // Сцена всегда в начале
    {
      const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (stageSection) {
        rowsStartY = vbY + stageHeight + 20 + 10
      }
    }
    
    // Вычисляем, где заканчиваются ряды (до нижних балконов)
    const balconySectionsForRows = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    const bottomBalconiesForRows = balconySectionsForRows.filter(s => s.position === 'middle')
    let bottomBalconiesHeightForRows = 0
    if (bottomBalconiesForRows.length > 0) {
      bottomBalconiesForRows.forEach((section) => {
        // Конвертируем проценты в реальные размеры
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const bottomPadding = 10
        bottomBalconiesHeightForRows = Math.max(bottomBalconiesHeightForRows, balconyHeight + bottomPadding + 10)
      })
    }
    
    // Вычисляем точную позицию нижних балконов для правильного ограничения рядов
    let bottomBalconiesStartY = vbHeight
    if (bottomBalconiesForRows.length > 0) {
      bottomBalconiesForRows.forEach((section) => {
        // Конвертируем проценты в реальные размеры
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const bottomPadding = 10
        const balconyY = vbHeight - balconyHeight - bottomPadding
        bottomBalconiesStartY = Math.min(bottomBalconiesStartY, balconyY) // Минимальная Y позиция (самый верхний нижний балкон)
      })
    }
    
    // Вычисляем доступную высоту для рядов с учетом нижних балконов
    const rowsEndY = bottomBalconiesStartY - 5 // Отступ перед нижними балконами
    let availableHeightForRows = Math.max(0, rowsEndY - rowsStartY) // Высота с учетом нижних балконов
    
    // Рассчитываем оптимальное расстояние между рядами
    // Ряды должны идти компактно друг под другом
    let rowSpacing = 2 // Минимальное расстояние между рядами (компактно)
    let rowHeight = baseRowHeight
    
    if (totalRowsCount > 1 && availableHeightForRows > 0) {
      // Общая высота всех рядов
      const totalRowsHeight = totalRowsCount * baseRowHeight
      // Оставшееся пространство для отступов между рядами
      const availableSpacing = availableHeightForRows - totalRowsHeight
      
      // Рассчитываем расстояние между рядами так, чтобы все ряды поместились компактно
      if (availableSpacing > 0) {
        // Используем минимальное расстояние, но не больше необходимого
        const calculatedSpacing = availableSpacing / (totalRowsCount - 1)
        rowSpacing = Math.min(calculatedSpacing, 3) // Максимум 3px между рядами для компактности
        rowSpacing = Math.max(0.5, rowSpacing) // Минимум 0.5px
      } else {
        // Если места не хватает, уменьшаем высоту ряда
        const minRowSpacing = 0.5
        const requiredHeight = totalRowsCount * baseRowHeight + (totalRowsCount - 1) * minRowSpacing
        if (requiredHeight > availableHeightForRows) {
          // Уменьшаем высоту ряда, чтобы все ряды поместились
          const maxTotalHeight = availableHeightForRows - (totalRowsCount - 1) * minRowSpacing
          rowHeight = Math.max(5, maxTotalHeight / totalRowsCount) // Минимум 5px высота ряда
          rowSpacing = minRowSpacing
        } else {
          rowSpacing = minRowSpacing
        }
      }
    }
    
    // Вычисляем границы для рядов, чтобы они не заходили под боковые балконы
    let leftBalconyMaxWidth = 0
    let rightBalconyMaxWidth = 0
    const sideBalconiesForRows = balconySectionsForRows.filter(s => s.position === 'left' || s.position === 'right')
    sideBalconiesForRows.forEach(section => {
      // Конвертируем проценты в реальные размеры
      const widthPercent = section.widthPercent || 12
      const balconyWidth = (widthPercent / 100) * vbWidth
      if (section.position === 'left') {
        leftBalconyMaxWidth = Math.max(leftBalconyMaxWidth, balconyWidth)
      } else if (section.position === 'right') {
        rightBalconyMaxWidth = Math.max(rightBalconyMaxWidth, balconyWidth)
      }
    })
    
    // Учитываем отступы балконов (20px с каждой стороны) и отступ для номера ряда (30px)
    const leftMargin = Math.max(leftBalconyMaxWidth + 20 + 10, labelOffset) // Ширина балкона + отступ + запас или отступ для номера
    const rightMargin = rightBalconyMaxWidth + 20 + 10 // Ширина балкона + отступ + запас
    const availableWidthForRows = vbWidth - leftMargin - rightMargin
    
    // 1. Сцена (если в начале)
    // Сцена всегда в начале
    {
      const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (stageSection) {
        // Используем ширину и высоту из настроек секции или значения по умолчанию
        const currentStageWidth = stageSection.stageWidth || (vbWidth - 100)
        const currentStageHeight = stageSection.stageHeight || 80
        
        // Центрируем сцену по ширине SVG
        const stageX = vbX + (vbWidth - currentStageWidth) / 2
        
        const stageRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        stageRect.setAttribute('x', stageX)
        stageRect.setAttribute('y', currentY)
        stageRect.setAttribute('width', currentStageWidth)
        stageRect.setAttribute('height', currentStageHeight)
        stageRect.setAttribute('fill', stageSection.color || '#666666')
        stageRect.setAttribute('stroke', '#000')
        stageRect.setAttribute('stroke-width', '2')
        stageRect.setAttribute('data-section-id', String(stageSection.id))
        stageRect.style.cursor = 'pointer'
        addSectionHandlers(stageRect, String(stageSection.id))
        
        const stageText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        stageText.setAttribute('x', vbX + vbWidth / 2)
        stageText.setAttribute('y', currentY + currentStageHeight / 2)
        stageText.setAttribute('text-anchor', 'middle')
        stageText.setAttribute('dominant-baseline', 'middle')
        stageText.setAttribute('fill', '#fff')
        stageText.setAttribute('font-size', '16')
        stageText.setAttribute('font-weight', 'bold')
        stageText.setAttribute('pointer-events', 'none')
        stageText.textContent = stageSection.label || 'STAGE'
        
        svgRef.current.appendChild(stageRect)
        svgRef.current.appendChild(stageText)
        currentY += currentStageHeight + 20
      }
    }
    
    // 2. Ряды сидячих мест
    let globalRowIndex = 0 // Глобальный индекс ряда для правильного позиционирования и уникальной нумерации
    const rowSectionsOverlays = [] // Массив для хранения информации об обводках рядов
    const balconySeatsOverlays = [] // Массив для хранения информации об обводках мест на балконах
    
    rowSections.forEach((section, sectionIndex) => {
      const rows = section.rows || []
      
      // Если у секции есть координаты x и y, используем их как абсолютные координаты центра секции
      // section.x и section.y - это центр всех элементов секции
      let sectionOffsetX = 0
      let sectionOffsetY = 0
      let baseRowY = rowsStartY
      
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        // Вычисляем центр всех рядов секции в их начальной позиции
        const totalRowsHeight = rows.length * (rowHeight + rowSpacing) - rowSpacing
        const initialCenterY = rowsStartY + totalRowsHeight / 2
        
        // Вычисляем начальный центр по X (середина доступной ширины)
        const initialCenterX = leftMargin + availableWidthForRows / 2
        
        // Вычисляем смещение от начальной позиции
        sectionOffsetX = section.x - initialCenterX
        sectionOffsetY = section.y - initialCenterY
        
        // Вычисляем базовую Y позицию первого ряда с учетом смещения
        baseRowY = rowsStartY + sectionOffsetY
      }
      
      // Собираем информацию о границах всех рядов секции для создания общей обводки
      let sectionMinX = Infinity
      let sectionMaxX = -Infinity
      let sectionMinY = Infinity
      let sectionMaxY = -Infinity
      let sectionSeatRadius = 0
      
      rows.forEach((row, localRowIndex) => {
        // Ряд - используем глобальный индекс для правильного позиционирования
        // Если у секции есть координаты, используем их как смещение
        let rowY = baseRowY + globalRowIndex * (rowHeight + rowSpacing)
        if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
          // Если координаты заданы, позиционируем относительно них
          rowY = baseRowY + localRowIndex * (rowHeight + rowSpacing)
        } else {
          rowY = rowsStartY + globalRowIndex * (rowHeight + rowSpacing)
        }
        
        // Проверяем, что ряд не заходит под нижние балконы
        // Используем строгую проверку - если верхняя граница ряда уже ниже начала нижних балконов, пропускаем
        if (rowY >= rowsEndY) {
          // Пропускаем этот ряд, НЕ увеличиваем globalRowIndex, чтобы следующие ряды не сдвигались
          return
        }
        
        // Если ряд частично заходит под нижний балкон, обрезаем его высоту
        let actualRowHeight = rowHeight
        if (rowY + rowHeight > rowsEndY) {
          actualRowHeight = Math.max(5, rowsEndY - rowY) // Минимум 5px видимой высоты
        }
        
        const seatsCount = row.seatsCount || 10
        const globalRowNumber = globalRowIndex + 1 // Глобальный номер ряда (начинается с 1)
        
        // Определяем границы боковых балконов
        const leftBalconyEndX = vbX + 20 + leftBalconyMaxWidth
        const rightBalconyStartX = vbX + vbWidth - 20 - rightBalconyMaxWidth
        
        // Рассчитываем доступную область для ряда (между балконами)
        const availableStartX = Math.max(vbX + labelOffset, leftBalconyEndX + 5)
        const availableEndX = Math.min(vbX + vbWidth - 10, rightBalconyStartX - 5)
        const availableRowWidth = availableEndX - availableStartX
        
        // Пересчитываем размер мест и расстояние для этого конкретного ряда,
        // чтобы все места поместились в доступную ширину
        let actualSeatWidth = seatWidth
        let actualSeatSpacing = seatSpacing
        
        // Вычисляем требуемую ширину для всех мест с текущими размерами
        const requiredWidth = seatsCount * (actualSeatWidth + actualSeatSpacing) - actualSeatSpacing
        
        // Если места не помещаются, уменьшаем размер и/или расстояние
        if (requiredWidth > availableRowWidth) {
          // Сначала пробуем уменьшить только расстояние между местами
          actualSeatSpacing = Math.max(0.5, (availableRowWidth - seatsCount * actualSeatWidth) / Math.max(1, seatsCount - 1))
          
          // Если все еще не помещается, уменьшаем размер мест
          const newRequiredWidth = seatsCount * (actualSeatWidth + actualSeatSpacing) - actualSeatSpacing
          if (newRequiredWidth > availableRowWidth) {
            // Пересчитываем размер мест так, чтобы все места поместились
            actualSeatWidth = Math.max(2, (availableRowWidth - (seatsCount - 1) * actualSeatSpacing) / seatsCount)
          }
        }
        
        const rowWidth = seatsCount * (actualSeatWidth + actualSeatSpacing) - actualSeatSpacing
        
        // Центрируем ряд в доступной области и применяем смещение по X, если координаты заданы
        const baseStartX = availableStartX + (availableRowWidth - rowWidth) / 2
        const startX = baseStartX + sectionOffsetX
        
        // Вычисляем радиус места
        const seatRadius = Math.max(1, Math.min(actualSeatWidth, actualRowHeight) / 2 - 1) // Минимум 1px, чтобы избежать отрицательных значений
        sectionSeatRadius = Math.max(sectionSeatRadius, seatRadius) // Сохраняем максимальный радиус для обводки
        
        // Генерация мест в ряду (круглые) - показываем ВСЕ места
        for (let seatIndex = 0; seatIndex < seatsCount; seatIndex++) {
          const seatCenterX = startX + seatIndex * (actualSeatWidth + actualSeatSpacing) + actualSeatWidth / 2
          const seatCenterY = rowY + actualRowHeight / 2
          
          // Проверяем, что место не заходит под боковые балконы
          // Теперь все места должны помещаться, но на всякий случай проверяем
          if (seatCenterX < leftBalconyEndX || seatCenterX > rightBalconyStartX) {
            continue // Пропускаем это место только если оно действительно под балконом
          }
          
          // Проверяем, что место не заходит под нижний балкон
          if (seatCenterY + seatRadius > rowsEndY) {
            continue // Пропускаем это место, если оно под нижним балконом
          }
          
          // Определяем цвет: сначала из категории, потом из секции
          const categoryColor = section.category 
            ? categories.find(c => c.value === section.category)?.color 
            : null
          const seatColor = categoryColor || section.color || '#cccccc'
          
          const seat = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seat.setAttribute('cx', seatCenterX)
          seat.setAttribute('cy', seatCenterY)
          seat.setAttribute('r', seatRadius)
          seat.setAttribute('fill', seatColor)
          seat.setAttribute('stroke', '#000')
          seat.setAttribute('stroke-width', '1')
          seat.classList.add(seatClassName)
          seat.setAttribute('data-section-id', String(section.id)) // Добавляем data-section-id для перетаскивания
          seat.setAttribute('data-category', section.category || 'default')
          seat.setAttribute('data-row', String(globalRowNumber))
          seat.setAttribute('data-seat', String(seatIndex + 1))
          seat.style.cursor = 'pointer'
          // Места в рядах не должны перехватывать клики на прозрачный элемент обводки
          seat.style.pointerEvents = 'none' // Отключаем pointer-events для мест, чтобы клики проходили к обводке
          
          svgRef.current.appendChild(seat)
          
          // Обновляем границы секции для создания общей обводки ПОСЛЕ создания каждого места
          // Учитываем каждое место с его радиусом
          sectionMinX = Math.min(sectionMinX, seatCenterX - seatRadius)
          sectionMaxX = Math.max(sectionMaxX, seatCenterX + seatRadius)
          sectionMinY = Math.min(sectionMinY, seatCenterY - seatRadius)
          sectionMaxY = Math.max(sectionMaxY, seatCenterY + seatRadius)
        }
        
        // Также учитываем метки рядов и дополнительный padding
        const labelWidth = 30 // Ширина области для метки ряда
        const extraPadding = 10 // Дополнительный padding для кликабельности
        sectionMinX = Math.min(sectionMinX, startX - labelWidth - extraPadding)
        sectionMaxX = Math.max(sectionMaxX, startX + rowWidth + extraPadding)
        sectionMinY = Math.min(sectionMinY, rowY - seatRadius - extraPadding)
        sectionMaxY = Math.max(sectionMaxY, rowY + actualRowHeight + seatRadius + extraPadding)
        
        // Номер ряда
        const rowLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        rowLabel.setAttribute('data-section-id', String(section.id)) // Добавляем data-section-id для перетаскивания
        
        // Вычисляем позицию метки с учетом смещения
        let labelX = baseStartX - 20 + sectionOffsetX
        // Ограничиваем позицию метки, чтобы она не уходила за левую границу viewBox
        // Оставляем минимум 5px от левой границы для видимости
        const minLabelX = vbX + 5
        labelX = Math.max(minLabelX, labelX)
        
        rowLabel.setAttribute('x', labelX)
        rowLabel.setAttribute('y', rowY + actualRowHeight / 2)
        rowLabel.setAttribute('text-anchor', 'middle')
        rowLabel.setAttribute('dominant-baseline', 'middle')
        rowLabel.setAttribute('fill', '#fff')
        rowLabel.setAttribute('font-size', '12')
        rowLabel.setAttribute('pointer-events', 'none')
        rowLabel.textContent = String(globalRowNumber)
        svgRef.current.appendChild(rowLabel)
        
        // Увеличиваем глобальный индекс только после успешного отображения ряда
        globalRowIndex++
      })
      
      // Сохраняем информацию об обводке для создания в конце
      if (sectionMinX !== Infinity && sectionMaxX !== -Infinity && sectionMinY !== Infinity && sectionMaxY !== -Infinity) {
        rowSectionsOverlays.push({
          sectionId: section.id,
          minX: sectionMinX,
          maxX: sectionMaxX,
          minY: sectionMinY,
          maxY: sectionMaxY
        })
      }
    })
    
    // Обновляем currentY после всех рядов
    if (totalRowsCount > 0) {
      currentY = rowsStartY + totalRowsCount * (rowHeight + rowSpacing) - rowSpacing + 20
    }
    
    // 4. Танцпол
    const dancefloorSections = sections.filter(s => s.type === SECTION_TYPES.DANCEFLOOR)
    
    // Вычисляем доступную высоту для танцпола (от текущей позиции до низа SVG, за вычетом нижних балконов)
    // Сначала определяем, есть ли нижние балконы
    const balconySectionsForDancefloor = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    const bottomBalconiesForDancefloor = balconySectionsForDancefloor.filter(s => s.position === 'middle')
    let bottomBalconiesHeightForDancefloor = 0
    if (bottomBalconiesForDancefloor.length > 0) {
      bottomBalconiesForDancefloor.forEach((section) => {
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        bottomBalconiesHeightForDancefloor = Math.max(bottomBalconiesHeightForDancefloor, balconyHeight + 10) // высота + отступ
      })
    }
    
    // Доступная высота = от currentY до низа SVG минус нижние балконы
    const availableHeightForDancefloor = (vbY + vbHeight) - currentY - bottomBalconiesHeightForDancefloor - 10 // -10 для отступа снизу
    
    dancefloorSections.forEach((section) => {
      // Конвертируем проценты в реальные размеры от доступной высоты
      const heightPercent = section.heightPercent || 25
      const dancefloorHeight = (heightPercent / 100) * availableHeightForDancefloor
      
      // Конвертируем проценты в реальные размеры от ширины SVG
      const widthPercent = section.widthPercent || 100
      const dancefloorWidth = (widthPercent / 100) * vbWidth
      
      // Ограничиваем ширину, чтобы не выходила за пределы видимости SVG
      const maxWidth = vbWidth - 100 // Оставляем отступы по 50px с каждой стороны
      const finalWidth = Math.min(dancefloorWidth, maxWidth)
      
      // Если заданы координаты x и y, используем их (для перетаскивания)
      // Иначе центрируем танцпол по ширине SVG и размещаем после сцены
      let dancefloorX, dancefloorY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        // x и y - это центр танцпола, нужно вычесть половину размера для рендеринга
        dancefloorX = section.x - finalWidth / 2
        dancefloorY = section.y - dancefloorHeight / 2
      } else {
        // Центрируем танцпол по ширине SVG
        dancefloorX = vbX + (vbWidth - finalWidth) / 2
        dancefloorY = currentY
      }
      
      // Определяем цвет: сначала из категории, потом из секции
      const categoryColorForDancefloor = section.category 
        ? categories.find(c => c.value === section.category)?.color 
        : null
      const dancefloorColor = categoryColorForDancefloor || section.color || '#00ff00'
      
      const dancefloorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      dancefloorRect.setAttribute('x', dancefloorX)
      dancefloorRect.setAttribute('y', dancefloorY)
      dancefloorRect.setAttribute('width', finalWidth)
      dancefloorRect.setAttribute('height', dancefloorHeight)
      dancefloorRect.setAttribute('fill', dancefloorColor)
      dancefloorRect.setAttribute('stroke', '#000')
      dancefloorRect.setAttribute('stroke-width', '2')
      // НЕ добавляем seatClassName в режиме редактирования, чтобы избежать конфликта стилей hover
      // Класс будет добавлен при сохранении схемы для кликабельности в режиме просмотра
      dancefloorRect.setAttribute('data-category', section.category || 'dancefloor')
      dancefloorRect.setAttribute('data-count', String(section.count || 0))
      // НЕ устанавливаем data-row и data-seat для танцпола, чтобы он обрабатывался как категория с количеством мест
      dancefloorRect.setAttribute('data-section-id', String(section.id))
      dancefloorRect.style.cursor = 'pointer'
      
      const dancefloorText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      dancefloorText.setAttribute('x', dancefloorX + finalWidth / 2)
      dancefloorText.setAttribute('y', dancefloorY + dancefloorHeight / 2)
      dancefloorText.setAttribute('text-anchor', 'middle')
      dancefloorText.setAttribute('dominant-baseline', 'middle')
      dancefloorText.setAttribute('fill', '#fff')
      dancefloorText.setAttribute('font-size', '16')
      dancefloorText.setAttribute('font-weight', 'bold')
      dancefloorText.setAttribute('pointer-events', 'none')
      dancefloorText.textContent = section.label || 'DANCE FLOOR'
      
      svgRef.current.appendChild(dancefloorRect)
      svgRef.current.appendChild(dancefloorText)
      // Добавляем обработчики после добавления в DOM
      addSectionHandlers(dancefloorRect, String(section.id))
      // Обновляем currentY только если танцпол не перетаскивался (не имеет координат)
      if (section.x === null || section.x === undefined || section.y === null || section.y === undefined) {
      currentY += dancefloorHeight + 20
      }
    })
    
    // 5. Балкон
    const balconySections = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    
    // Вычисляем позицию сцены для правильного размещения балкона
    let stageBottomY = vbY
    let stageLeftX = vbX + 50 // Левая граница сцены (отступ 50px)
    let stageRightX = vbX + vbWidth - 50 // Правая граница сцены
    // Сцена всегда в начале
    {
      const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (stageSection) {
        const currentStageHeight = stageSection.stageHeight || 80
        stageBottomY = vbY + currentStageHeight + 20 // Нижняя граница сцены + отступ
      }
    }
    
    // Разделяем балконы на боковые (left/right), нижние (middle) и без позиции (null)
    const sideBalconies = balconySections.filter(s => s.position === 'left' || s.position === 'right')
    const bottomBalconies = balconySections.filter(s => s.position === 'middle')
    const unpositionedBalconies = balconySections.filter(s => !s.position)
    
    // Вычисляем высоту нижних балконов, чтобы боковые балконы не занимали эту область
    let bottomBalconiesHeight = 0
    if (bottomBalconies.length > 0) {
      bottomBalconies.forEach((section) => {
        // Конвертируем проценты в реальные размеры
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const bottomPadding = 10
        bottomBalconiesHeight = Math.max(bottomBalconiesHeight, balconyHeight + bottomPadding + 10) // Высота + отступ + запас
      })
    }
    
    const verticalPadding = 10 // Отступ сверху и снизу для left/right
    const balconySpacing = 15 // Отступ между балконами
    
    // Группируем боковые балконы по позиции для равномерного распределения
    const leftBalconies = sideBalconies.filter(s => s.position === 'left')
    const rightBalconies = sideBalconies.filter(s => s.position === 'right')
    
    // Вычисляем максимальные ширины для каждой стороны (в процентах)
    let leftMaxWidthPercent = 0
    leftBalconies.forEach(section => {
      const widthPercent = section.widthPercent || 12
      leftMaxWidthPercent = Math.max(leftMaxWidthPercent, widthPercent)
    })
    
    let rightMaxWidthPercent = 0
    rightBalconies.forEach(section => {
      const widthPercent = section.widthPercent || 12
      rightMaxWidthPercent = Math.max(rightMaxWidthPercent, widthPercent)
    })
    
    // Проверяем, чтобы сумма ширин не превышала доступное пространство
    // Учитываем отступы: 20px слева, 20px справа, минимум 20px между балконами для рядов
    // Минимум 40px между балконами (20px с каждой стороны)
    const totalPadding = 40 + 40 // 40px отступов (20px слева + 20px справа)
    const minSpaceBetween = 20 // Минимальное пространство между балконами для рядов
    const availableWidthPercent = 100 - (totalPadding + minSpaceBetween) / vbWidth * 100
    
    // Ограничиваем ширину, чтобы левый и правый балконы не перекрывались
    if (leftMaxWidthPercent + rightMaxWidthPercent > availableWidthPercent) {
      // Распределяем доступное пространство пропорционально
      const scale = availableWidthPercent / (leftMaxWidthPercent + rightMaxWidthPercent)
      leftMaxWidthPercent = Math.min(leftMaxWidthPercent * scale, 50)
      rightMaxWidthPercent = Math.min(rightMaxWidthPercent * scale, 50)
    }
    
    // Функция для отрисовки группы балконов одной позиции
    const renderSideBalconies = (balconyGroup, position) => {
      if (balconyGroup.length === 0) return
      
      const startY = Math.max(stageBottomY, vbY + verticalPadding) // Начинаем от сцены или от верха с отступом
      const endY = vbHeight - verticalPadding - bottomBalconiesHeight
      const totalAvailableHeight = endY - startY // Общая доступная высота
      const totalSpacing = (balconyGroup.length - 1) * balconySpacing // Общий отступ между балконами
      const balconyHeight = (totalAvailableHeight - totalSpacing) / balconyGroup.length // Высота каждого балкона (равномерная)
      
      // Определяем ширину и позицию по X для балконов
      // Используем максимальную ширину для каждой стороны
      let balconyWidth, balconyX
      if (position === 'left') {
        const validatedWidthPercent = Math.min(leftMaxWidthPercent, 50) // Максимум 50%
        balconyWidth = (validatedWidthPercent / 100) * vbWidth
        balconyX = vbX + 20
      } else {
        const validatedWidthPercent = Math.min(rightMaxWidthPercent, 50) // Максимум 50%
        balconyWidth = (validatedWidthPercent / 100) * vbWidth
        balconyX = vbX + vbWidth - balconyWidth - 20
        
        // Дополнительная проверка: убеждаемся, что правый балкон не перекрывается с левым
        if (leftBalconies.length > 0) {
          const leftBalconyMaxWidth = (Math.min(leftMaxWidthPercent, 50) / 100) * vbWidth
          const rightBalconyX = balconyX
          const leftBalconyEndX = vbX + 20 + leftBalconyMaxWidth
          const minSpaceBetween = 20 // Минимальное пространство между балконами
          
          // Если балконы перекрываются или слишком близко, корректируем размеры
          if (rightBalconyX < leftBalconyEndX + minSpaceBetween) {
            // Уменьшаем размеры пропорционально
            const totalWidth = leftBalconyMaxWidth + balconyWidth
            const availableWidth = vbWidth - 40 - minSpaceBetween // 40px отступы + минимум пространства
            const scale = availableWidth / totalWidth
            balconyWidth = balconyWidth * scale
            balconyX = vbX + vbWidth - balconyWidth - 20
          }
        }
      }
      
      // Отрисовываем каждый балкон
      balconyGroup.forEach((section, balconyIndex) => {
        const balconyY = startY + balconyIndex * (balconyHeight + balconySpacing)
        
        const seatsPerRow = section.seatsPerRow || 4
        const rowsCount = section.rowsCount || 5
          
          // Создаем прямоугольник балкона
          const balconyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          balconyRect.setAttribute('x', balconyX)
          balconyRect.setAttribute('y', balconyY)
          balconyRect.setAttribute('width', balconyWidth)
          balconyRect.setAttribute('height', balconyHeight)
          balconyRect.setAttribute('fill', section.color || '#ff8800')
          balconyRect.setAttribute('fill-opacity', '0.3') // Прозрачность для видимости под балконом
          balconyRect.setAttribute('stroke', '#000')
          balconyRect.setAttribute('stroke-width', '2')
          balconyRect.setAttribute('data-section-id', String(section.id))
          balconyRect.style.cursor = 'pointer'
          // Устанавливаем pointer-events для обеспечения кликабельности поверх других элементов
          balconyRect.style.pointerEvents = 'all'
          
          const balconyType = section.balconyType || 'seats'
          
          if (balconyType === 'dancefloor') {
            // Танцпольный балкон
            // НЕ добавляем seatClassName в режиме редактирования, чтобы избежать конфликта стилей hover
            // Класс будет добавлен при сохранении схемы для кликабельности в режиме просмотра
            balconyRect.setAttribute('data-category', section.category || 'balcony')
            balconyRect.setAttribute('data-count', String(section.count || 0))
            // НЕ устанавливаем data-row и data-seat для танцпола, чтобы он обрабатывался как категория с количеством мест
            svgRef.current.appendChild(balconyRect)
            
            // Добавляем текст "DANCE FLOOR" на балконе с переносом слов
            const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
            const balconyNumber = balconyIndex + 1
            // Используем label из секции, если он есть и содержит "DANCE FLOOR", иначе формируем новый
            let textToDisplay = section.label || `BALCONY ${positionLabel} ${balconyNumber} DANCE FLOOR`
            // Если в label уже есть "DANCE FLOOR", не добавляем его снова
            if (!textToDisplay.includes('DANCE FLOOR')) {
              textToDisplay = `${textToDisplay} DANCE FLOOR`
            }
            // Используем createMultilineText для переноса слов
            createMultilineText(
              svgRef.current,
              textToDisplay,
              balconyX + balconyWidth / 2,
              balconyY + balconyHeight / 2,
              balconyWidth - 20, // Максимальная ширина с отступами
              14,
              '#fff',
              'bold'
            )
            
            // Добавляем обработчики после добавления в DOM
            addSectionHandlers(balconyRect, String(section.id))
          } else if (balconyType === 'tables') {
            // Балкон со столом
            svgRef.current.appendChild(balconyRect)
            // Добавляем обработчики после добавления в DOM
            addSectionHandlers(balconyRect, String(section.id))
            
            // Ищем все столы, привязанные к этому балкону
            const balconyTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === section.id)
            
            if (balconyTables.length > 0) {
              // Рендерим все столы внутри балкона
              balconyTables.forEach((balconyTable, tableIndex) => {
                // Рендерим стол: используем координаты стола, если заданы, иначе распределяем по балкону
                let tableX, tableY
                if (balconyTable.x !== null && balconyTable.x !== undefined && 
                    balconyTable.y !== null && balconyTable.y !== undefined) {
                  // Используем сохраненные координаты (относительно SVG)
                  tableX = balconyTable.x
                  tableY = balconyTable.y
                } else {
                  // По умолчанию - распределяем столы равномерно по балкону
                  const tablesCount = balconyTables.length
                  if (tablesCount === 1) {
                    tableX = balconyX + balconyWidth / 2
                    tableY = balconyY + balconyHeight / 2
                  } else {
                    // Распределяем столы в сетке
                    const cols = Math.ceil(Math.sqrt(tablesCount))
                    const rows = Math.ceil(tablesCount / cols)
                    const col = tableIndex % cols
                    const row = Math.floor(tableIndex / cols)
                    const spacingX = balconyWidth / (cols + 1)
                    const spacingY = balconyHeight / (rows + 1)
                    tableX = balconyX + spacingX * (col + 1)
                    tableY = balconyY + spacingY * (row + 1)
                  }
                }
                const tableSize = balconyTable.tableSize || 60
                const tableHeight = balconyTable.tableHeight || 40
                const shape = balconyTable.shape || 'round'
                
                // Получаем количество мест с каждой стороны
                const seatsTop = balconyTable.seatsTop || 0
                const seatsRight = balconyTable.seatsRight || 0
                const seatsBottom = balconyTable.seatsBottom || 0
                const seatsLeft = balconyTable.seatsLeft || 0
                const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
              
                // Вычисляем размер места
                const seatDistanceFromEdge = 10
                let seatRadius = 4
                
                if (shape === 'round' && totalSeats > 0) {
                  const circumference = 2 * Math.PI * (tableSize / 2 + seatDistanceFromEdge)
                  const minDistanceBetweenSeats = circumference / totalSeats
                  seatRadius = Math.min(minDistanceBetweenSeats / 2, 6)
                } else if ((shape === 'square' || shape === 'rectangular') && totalSeats > 0) {
                  const maxSeatsOnSide = Math.max(seatsTop, seatsRight, seatsBottom, seatsLeft)
                  if (maxSeatsOnSide > 0) {
                    const sideLength = shape === 'rectangular' ? Math.max(tableSize, tableHeight) : tableSize
                    const minDistanceBetweenSeats = sideLength / (maxSeatsOnSide + 1)
                    seatRadius = Math.min(minDistanceBetweenSeats / 2, 6)
                  }
                }
                
                seatRadius = Math.max(2, Math.min(seatRadius, 6))
                
                // Рендерим стол
                let tableElement
                if (shape === 'round') {
                  tableElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  tableElement.setAttribute('cx', tableX)
                  tableElement.setAttribute('cy', tableY)
                  tableElement.setAttribute('r', tableSize / 2)
                  tableElement.setAttribute('fill', balconyTable.color || '#8B4513')
                  tableElement.setAttribute('stroke', '#000')
                  tableElement.setAttribute('stroke-width', '2')
                } else {
                  tableElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                  tableElement.setAttribute('x', tableX - tableSize / 2)
                  tableElement.setAttribute('y', tableY - (tableHeight / 2))
                  tableElement.setAttribute('width', tableSize)
                  tableElement.setAttribute('height', tableHeight)
                  tableElement.setAttribute('fill', balconyTable.color || '#8B4513')
                  tableElement.setAttribute('stroke', '#000')
                  tableElement.setAttribute('stroke-width', '2')
                  tableElement.setAttribute('rx', '5')
                }
                
                // Добавляем атрибуты для идентификации стола (отдельная секция)
                tableElement.setAttribute('data-section-id', String(balconyTable.id))
                tableElement.style.cursor = 'pointer'
                tableElement.style.pointerEvents = 'all'
                svgRef.current.appendChild(tableElement)
                
                // Добавляем обработчики для стола (отдельная секция)
                addSectionHandlers(tableElement, String(balconyTable.id))
                
                // Рендерим места вокруг стола (аналогично обычным столам)
                if (totalSeats > 0) {
                  const categoryColor = categories.find(c => c.value === balconyTable.category)?.color || balconyTable.seatColor || '#ffaa00'
                  let seatIndex = 0
              
              if (shape === 'round') {
                const circleRadius = tableSize / 2 + seatDistanceFromEdge
                const halfSize = tableSize / 2
                
                const checkOverlap = (seatsCount) => {
                  if (seatsCount <= 1) return false
                  const spacing = tableSize / (seatsCount + 1)
                  return spacing < 2 * seatRadius
                }
                
                const hasOverlap = checkOverlap(seatsTop) || checkOverlap(seatsRight) || 
                                  checkOverlap(seatsBottom) || checkOverlap(seatsLeft)
                
                if (hasOverlap) {
                  for (let i = 0; i < totalSeats; i++) {
                    const angle = (2 * Math.PI * i) / totalSeats - Math.PI / 2
                    const seatX = tableX + circleRadius * Math.cos(angle)
                    const seatY = tableY + circleRadius * Math.sin(angle)
                    
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                } else {
                  for (let i = 0; i < seatsTop; i++) {
                    const spacing = tableSize / (seatsTop + 1)
                    const seatX = tableX - halfSize + spacing * (i + 1)
                    const seatY = tableY - circleRadius
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                  
                  for (let i = 0; i < seatsRight; i++) {
                    const spacing = tableSize / (seatsRight + 1)
                    const seatX = tableX + circleRadius
                    const seatY = tableY - halfSize + spacing * (i + 1)
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                  
                  for (let i = 0; i < seatsBottom; i++) {
                    const spacing = tableSize / (seatsBottom + 1)
                    const seatX = tableX + halfSize - spacing * (i + 1)
                    const seatY = tableY + circleRadius
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                  
                  for (let i = 0; i < seatsLeft; i++) {
                    const spacing = tableSize / (seatsLeft + 1)
                    const seatX = tableX - circleRadius
                    const seatY = tableY + halfSize - spacing * (i + 1)
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                }
              } else if (shape === 'square') {
                const halfSize = tableSize / 2
                const radius = halfSize + seatDistanceFromEdge
                
                for (let i = 0; i < seatsTop; i++) {
                  const spacing = tableSize / (seatsTop + 1)
                  const seatX = tableX - halfSize + spacing * (i + 1)
                  const seatY = tableY - radius
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                
                for (let i = 0; i < seatsRight; i++) {
                  const spacing = tableSize / (seatsRight + 1)
                  const seatX = tableX + radius
                  const seatY = tableY - halfSize + spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                
                for (let i = 0; i < seatsBottom; i++) {
                  const spacing = tableSize / (seatsBottom + 1)
                  const seatX = tableX + halfSize - spacing * (i + 1)
                  const seatY = tableY + radius
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                
                for (let i = 0; i < seatsLeft; i++) {
                  const spacing = tableSize / (seatsLeft + 1)
                  const seatX = tableX - radius
                  const seatY = tableY + halfSize - spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
              } else if (shape === 'rectangular') {
                const widthDist = tableSize / 2 + seatDistanceFromEdge
                const heightDist = tableHeight / 2 + seatDistanceFromEdge
                
                for (let i = 0; i < seatsTop; i++) {
                  const spacing = tableSize / (seatsTop + 1)
                  const seatX = tableX - tableSize / 2 + spacing * (i + 1)
                  const seatY = tableY - heightDist
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                
                for (let i = 0; i < seatsRight; i++) {
                  const spacing = tableHeight / (seatsRight + 1)
                  const seatX = tableX + widthDist
                  const seatY = tableY - tableHeight / 2 + spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                
                for (let i = 0; i < seatsBottom; i++) {
                  const spacing = tableSize / (seatsBottom + 1)
                  const seatX = tableX + tableSize / 2 - spacing * (i + 1)
                  const seatY = tableY + heightDist
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                
                for (let i = 0; i < seatsLeft; i++) {
                  const spacing = tableHeight / (seatsLeft + 1)
                  const seatX = tableX - widthDist
                  const seatY = tableY + tableHeight / 2 - spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
              }
                }
              })
            }
          } else if (balconyType === 'sofas') {
            // Балкон с диванами
            svgRef.current.appendChild(balconyRect)
            // Добавляем обработчики после добавления в DOM
            addSectionHandlers(balconyRect, String(section.id))
            
            // Ищем все диваны, привязанные к этому балкону
            const balconySofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === section.id)
            
            if (balconySofas.length > 0) {
              // Рендерим все диваны внутри балкона
              balconySofas.forEach((balconySofa, sofaIndex) => {
                // Рендерим диван: используем координаты дивана, если заданы, иначе распределяем по балкону
                let sofaX, sofaY
                if (balconySofa.x !== null && balconySofa.x !== undefined && 
                    balconySofa.y !== null && balconySofa.y !== undefined) {
                  // Используем сохраненные координаты (относительно SVG)
                  sofaX = balconySofa.x
                  sofaY = balconySofa.y
                } else {
                  // По умолчанию - распределяем диваны равномерно по балкону
                  const sofasCount = balconySofas.length
                  if (sofasCount === 1) {
                    sofaX = balconyX + balconyWidth / 2
                    sofaY = balconyY + balconyHeight / 2
                  } else {
                    // Распределяем диваны в сетке
                    const cols = Math.ceil(Math.sqrt(sofasCount))
                    const rows = Math.ceil(sofasCount / cols)
                    const col = sofaIndex % cols
                    const row = Math.floor(sofaIndex / cols)
                    const spacingX = balconyWidth / (cols + 1)
                    const spacingY = balconyHeight / (rows + 1)
                    sofaX = balconyX + spacingX * (col + 1)
                    sofaY = balconyY + spacingY * (row + 1)
                  }
                }
                
                const sofaWidth = balconySofa.sofaWidth || 120
                const sofaHeight = balconySofa.sofaHeight || 60
                const seatsCount = balconySofa.seatsCount || 0
                const sofaColor = balconySofa.color || '#8B4513'
                
                // Ограничиваем позицию дивана границами балкона
                const halfWidth = sofaWidth / 2
                const halfHeight = sofaHeight / 2
                sofaX = Math.max(balconyX + halfWidth, Math.min(balconyX + balconyWidth - halfWidth, sofaX))
                sofaY = Math.max(balconyY + halfHeight, Math.min(balconyY + balconyHeight - halfHeight, sofaY))
                
                const renderX = sofaX - halfWidth
                const renderY = sofaY - halfHeight
                
                // Создаем прямоугольник дивана
                const sofaRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                sofaRect.setAttribute('x', renderX)
                sofaRect.setAttribute('y', renderY)
                sofaRect.setAttribute('width', sofaWidth)
                sofaRect.setAttribute('height', sofaHeight)
                sofaRect.setAttribute('fill', sofaColor)
                sofaRect.setAttribute('stroke', '#000')
                sofaRect.setAttribute('stroke-width', '2')
                sofaRect.setAttribute('data-section-id', String(balconySofa.id))
                sofaRect.style.cursor = 'pointer'
                sofaRect.style.pointerEvents = 'all'
                svgRef.current.appendChild(sofaRect)
                
                // Добавляем обработчики для дивана (отдельная секция)
                addSectionHandlers(sofaRect, String(balconySofa.id))
                
                // Определяем цвет из категории
                const categoryColorForSofa = balconySofa.category 
                  ? categories.find(c => c.value === balconySofa.category)?.color 
                  : null
                const sofaSeatColor = categoryColorForSofa || balconySofa.seatColor || '#ffaa00'
                
                const padding = 5
                const fontSize = 14
                const textTopPadding = 3
                const textBottomPadding = 8
                
                // Определяем, вертикальный ли диван (ширина < высоты)
                const isVertical = sofaWidth < sofaHeight
                
                // Текст названия дивана (сверху внутри дивана)
                const textY = sofaY - halfHeight + padding + textTopPadding
                if (balconySofa.label) {
                  const sofaText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
                  sofaText.setAttribute('x', sofaX)
                  sofaText.setAttribute('y', textY)
                  sofaText.setAttribute('text-anchor', 'middle')
                  sofaText.setAttribute('dominant-baseline', 'hanging')
                  sofaText.setAttribute('fill', '#fff')
                  sofaText.setAttribute('font-size', String(fontSize))
                  sofaText.setAttribute('font-weight', 'bold')
                  sofaText.setAttribute('pointer-events', 'none')
                  sofaText.textContent = balconySofa.label
                  svgRef.current.appendChild(sofaText)
                }
                
                // Распределяем места внутри дивана
                if (seatsCount > 0) {
                  const availableWidth = sofaWidth - padding * 2
                  const availableHeight = sofaHeight - padding * 2
                  
                  let seatRadius
                  let spacing
                  let startX, startY
                  
                  if (isVertical) {
                    const textBottomY = textY + fontSize
                    const seatsAreaTop = textBottomY + textBottomPadding
                    const seatsAreaBottom = sofaY + halfHeight - padding
                    const seatsAvailableHeight = Math.max(0, seatsAreaBottom - seatsAreaTop)
                    
                    seatRadius = Math.min(availableWidth / 2, seatsAvailableHeight / seatsCount / 2, 5)
                    seatRadius = Math.max(2, seatRadius)
                    
                    if (seatsCount > 1) {
                      const totalSeatsHeight = seatRadius * 2 * seatsCount
                      const remainingSpace = seatsAvailableHeight - totalSeatsHeight
                      spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
                    } else {
                      spacing = 0
                    }
                    
                    startX = sofaX
                    startY = seatsAreaTop + seatRadius
                    
                    const lastSeatY = startY + (seatsCount - 1) * (seatRadius * 2 + spacing)
                    if (lastSeatY + seatRadius > seatsAreaBottom) {
                      const maxRadius = (seatsAreaBottom - seatsAreaTop) / (seatsCount * 2)
                      seatRadius = Math.min(maxRadius, availableWidth / 2, 5)
                      seatRadius = Math.max(2, seatRadius)
                      if (seatsCount > 1) {
                        const totalSeatsHeight = seatRadius * 2 * seatsCount
                        const remainingSpace = seatsAvailableHeight - totalSeatsHeight
                        spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
                      }
                      startY = seatsAreaTop + seatRadius
                    }
                    
                    for (let i = 0; i < seatsCount; i++) {
                      const seatX = startX
                      const seatY = startY + i * (seatRadius * 2 + spacing)
                      
                      if (seatY + seatRadius <= seatsAreaBottom && seatY - seatRadius >= seatsAreaTop) {
                        const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                        seatCircle.setAttribute('cx', seatX)
                        seatCircle.setAttribute('cy', seatY)
                        seatCircle.setAttribute('r', seatRadius)
                        seatCircle.setAttribute('fill', sofaSeatColor)
                        seatCircle.setAttribute('stroke', '#000')
                        seatCircle.setAttribute('stroke-width', '1')
                        seatCircle.classList.add(seatClassName)
                        seatCircle.setAttribute('data-category', balconySofa.category || 'sofa')
                        seatCircle.setAttribute('data-row', balconySofa.category || 'sofa')
                        seatCircle.setAttribute('data-seat', String(i + 1))
                        seatCircle.setAttribute('data-sofa-id', String(balconySofa.id))
                        seatCircle.style.cursor = 'pointer'
                        svgRef.current.appendChild(seatCircle)
                      }
                    }
                  } else {
                    const textBottomY = textY + fontSize
                    const minSeatsY = textBottomY + textBottomPadding
                    const centerY = sofaY
                    const seatsY = Math.max(minSeatsY, centerY)
                    
                    seatRadius = Math.min(availableWidth / seatsCount / 2, availableHeight / 2, 6)
                    seatRadius = Math.max(3, seatRadius)
                    spacing = seatsCount > 1 ? (availableWidth - seatRadius * 2 * seatsCount) / (seatsCount - 1) : 0
                    
                    startX = sofaX - halfWidth + padding + seatRadius
                    startY = seatsY
                    
                    for (let i = 0; i < seatsCount; i++) {
                      const seatX = startX + i * (seatRadius * 2 + spacing)
                      const seatY = startY
                      
                      const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                      seatCircle.setAttribute('cx', seatX)
                      seatCircle.setAttribute('cy', seatY)
                      seatCircle.setAttribute('r', seatRadius)
                      seatCircle.setAttribute('fill', sofaSeatColor)
                      seatCircle.setAttribute('stroke', '#000')
                      seatCircle.setAttribute('stroke-width', '1')
                      seatCircle.classList.add(seatClassName)
                      seatCircle.setAttribute('data-category', balconySofa.category || 'sofa')
                      seatCircle.setAttribute('data-row', balconySofa.category || 'sofa')
                      seatCircle.setAttribute('data-seat', String(i + 1))
                      seatCircle.setAttribute('data-sofa-id', String(balconySofa.id))
                      seatCircle.style.cursor = 'pointer'
                      svgRef.current.appendChild(seatCircle)
                    }
                  }
                }
              })
            }
          } else {
            // Балкон с местами
            // Проверяем, есть ли места для рендеринга
            const rowsCount = section.rowsCount || 0
            const seatsPerRow = section.seatsPerRow || 0
            
            if (rowsCount > 0 && seatsPerRow > 0) {
              // Сначала генерируем места, потом добавляем балкон поверх них, чтобы балкон получал клики на пустые места
            // Генерация мест на балконе
            // Для боковых балконов: ряды идут горизонтально (слева направо), места в ряду вертикально (сверху вниз, смотрят на сцену)
            const padding = 15
            const availableWidth = balconyWidth - padding * 2
            const availableHeight = balconyHeight - padding * 2 - 25
            
            // rowsCount - количество горизонтальных рядов (слева направо)
            // seatsPerRow - количество мест в вертикальном ряду (сверху вниз)
            const maxSeatWidth = availableWidth / rowsCount
            const maxSeatHeight = availableHeight / seatsPerRow
            const seatSize = Math.min(maxSeatWidth * 0.8, maxSeatHeight * 0.8, 15)
            const seatRadius = Math.max(1, seatSize / 2 - 0.5) // Минимум 1px
            
            // Горизонтальное расстояние между рядами
            const totalRowsWidth = rowsCount * seatSize
            const horizontalSpacing = rowsCount > 1 ? (availableWidth - totalRowsWidth) / (rowsCount - 1) : 0
            
            // Вертикальное расстояние между местами в ряду
            const totalSeatsHeight = seatsPerRow * seatSize
            const verticalSpacing = seatsPerRow > 1 ? (availableHeight - totalSeatsHeight) / (seatsPerRow - 1) : 0
            
            // Начальная позиция: центрируем по высоте
            const startX = balconyX + padding + (availableWidth - totalRowsWidth - horizontalSpacing * (rowsCount - 1)) / 2
            const startSeatY = balconyY + padding + 25 + (availableHeight - totalSeatsHeight - verticalSpacing * (seatsPerRow - 1)) / 2
              
              // Собираем границы всех мест для создания невидимого элемента
              let balconySeatsMinX = Infinity
              let balconySeatsMaxX = -Infinity
              let balconySeatsMinY = Infinity
              let balconySeatsMaxY = -Infinity
            
            // Генерируем места: ряды горизонтально, места вертикально
            for (let row = 0; row < rowsCount; row++) {
              for (let seat = 0; seat < seatsPerRow; seat++) {
                const seatCenterX = startX + row * (seatSize + horizontalSpacing) + seatSize / 2
                const seatCenterY = startSeatY + seat * (seatSize + verticalSpacing) + seatSize / 2
                  
                  // Обновляем границы для создания невидимого элемента
                  balconySeatsMinX = Math.min(balconySeatsMinX, seatCenterX - seatRadius)
                  balconySeatsMaxX = Math.max(balconySeatsMaxX, seatCenterX + seatRadius)
                  balconySeatsMinY = Math.min(balconySeatsMinY, seatCenterY - seatRadius)
                  balconySeatsMaxY = Math.max(balconySeatsMaxY, seatCenterY + seatRadius)
                
                // Определяем цвет из категории
                const categoryColorForBalcony = section.category 
                  ? categories.find(c => c.value === section.category)?.color 
                  : null
                const balconySeatColor = categoryColorForBalcony || '#ffaa00'
                
                const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                seatCircle.setAttribute('cx', seatCenterX)
                seatCircle.setAttribute('cy', seatCenterY)
                seatCircle.setAttribute('r', seatRadius)
                seatCircle.setAttribute('fill', balconySeatColor)
                seatCircle.setAttribute('stroke', '#000')
                seatCircle.setAttribute('stroke-width', '1')
                seatCircle.classList.add(seatClassName)
                seatCircle.setAttribute('data-category', section.category || 'balcony')
                seatCircle.setAttribute('data-row', String(row + 1))
                seatCircle.setAttribute('data-seat', String(seat + 1))
                seatCircle.setAttribute('data-section-id', String(section.id))
                seatCircle.style.cursor = 'pointer'
                  // Места не должны перехватывать клики на прозрачный элемент обводки
                  seatCircle.style.pointerEvents = 'none' // Отключаем pointer-events для мест, чтобы клики проходили к обводке
                
                svgRef.current.appendChild(seatCircle)
              }
            }
              
              // Сохраняем информацию о невидимом элементе для создания в конце
              // Невидимый элемент должен покрывать весь балкон, а не только места
              if (balconySeatsMinX !== Infinity && balconySeatsMaxX !== -Infinity && 
                  balconySeatsMinY !== Infinity && balconySeatsMaxY !== -Infinity) {
                balconySeatsOverlays.push({
                  sectionId: section.id,
                  minX: balconyX, // Весь балкон
                  maxX: balconyX + balconyWidth, // Весь балкон
                  minY: balconyY, // Весь балкон
                  maxY: balconyY + balconyHeight // Весь балкон
                })
              }
            }
            
            // Добавляем балкон после мест
            svgRef.current.appendChild(balconyRect)
            // Если на балконе есть места, не добавляем обработчики к балкону - они будут на невидимом элементе
            if (rowsCount === 0 || seatsPerRow === 0) {
              // Добавляем обработчики только если нет мест
              addSectionHandlers(balconyRect, String(section.id))
            } else {
              // Если есть места, отключаем pointer-events для балкона, чтобы клики проходили к невидимому элементу
              balconyRect.style.pointerEvents = 'none'
            }
          }
          
        // Текст названия балкона с переносом, если не влезает (только для балконов без танцпола)
        // Для балконов с танцполом текст уже добавлен по центру выше
        if (balconyType !== 'dancefloor') {
        const labelText = section.label || `BALCONY ${position === 'left' ? 'L' : 'R'}`
        const textX = balconyX + balconyWidth / 2
        const textY = balconyY + 18
        const maxTextWidth = balconyWidth - 20 // Оставляем отступы по 10px с каждой стороны
        createMultilineText(svgRef.current, labelText, textX, textY, maxTextWidth, 14, '#fff', 'bold')
        }
      })
    }
    
    // Отрисовываем левые и правые балконы
    renderSideBalconies(leftBalconies, 'left')
    renderSideBalconies(rightBalconies, 'right')
    
    // Отрисовываем балконы без позиции в центре схемы
    unpositionedBalconies.forEach((section) => {
      // Размещаем балкон в центре схемы
      const centerX = vbX + vbWidth / 2
      const centerY = vbY + vbHeight / 2
      const balconyWidth = 300 // Прямоугольная ширина для отображения
      const balconyHeight = 150 // Высота для отображения
      
      const balconyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      balconyRect.setAttribute('x', centerX - balconyWidth / 2)
      balconyRect.setAttribute('y', centerY - balconyHeight / 2)
      balconyRect.setAttribute('width', balconyWidth)
      balconyRect.setAttribute('height', balconyHeight)
      balconyRect.setAttribute('fill', section.color || '#ff8800')
      balconyRect.setAttribute('fill-opacity', '0.3')
      balconyRect.setAttribute('stroke', '#000')
      balconyRect.setAttribute('stroke-width', '2')
      balconyRect.setAttribute('stroke-dasharray', '5,5') // Пунктирная обводка для балконов без позиции
      balconyRect.setAttribute('data-section-id', String(section.id))
      balconyRect.style.cursor = 'pointer'
      balconyRect.style.pointerEvents = 'all'
      
      // Добавляем текст "Перетащите балкон"
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      labelText.setAttribute('x', centerX)
      labelText.setAttribute('y', centerY)
      labelText.setAttribute('text-anchor', 'middle')
      labelText.setAttribute('dominant-baseline', 'middle')
      labelText.setAttribute('fill', '#000')
      labelText.setAttribute('font-size', '14')
      labelText.setAttribute('font-weight', 'bold')
      labelText.textContent = 'Перетащите балкон'
      labelText.setAttribute('pointer-events', 'none')
      
      svgRef.current.appendChild(balconyRect)
      svgRef.current.appendChild(labelText)
      addSectionHandlers(balconyRect, String(section.id))
    })
    
    // Затем отрисовываем нижние балконы (middle)
    if (bottomBalconies.length > 0) {
      const horizontalPadding = 20 // Отступ слева и справа для middle
      const bottomPadding = 10 // Отступ снизу
      const totalSpacing = (bottomBalconies.length - 1) * balconySpacing // Общий отступ между балконами
      const balconyWidth = (vbWidth - horizontalPadding * 2 - totalSpacing) / bottomBalconies.length // Ширина каждого балкона
      
      // Отрисовываем каждый нижний балкон
      bottomBalconies.forEach((section, balconyIndex) => {
        const seatsPerRow = section.seatsPerRow || 4
        const rowsCount = section.rowsCount || 5
        // Конвертируем проценты в реальные размеры
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const balconyX = vbX + horizontalPadding + balconyIndex * (balconyWidth + balconySpacing)
        const balconyY = vbHeight - balconyHeight - bottomPadding
        
        // Создаем прямоугольник балкона
        const balconyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        balconyRect.setAttribute('x', balconyX)
        balconyRect.setAttribute('y', balconyY)
        balconyRect.setAttribute('width', balconyWidth)
        balconyRect.setAttribute('height', balconyHeight)
        balconyRect.setAttribute('fill', section.color || '#ff8800')
        balconyRect.setAttribute('fill-opacity', '0.3') // Прозрачность для видимости под балконом
        balconyRect.setAttribute('stroke', '#000')
        balconyRect.setAttribute('stroke-width', '2')
        balconyRect.setAttribute('data-section-id', String(section.id))
        balconyRect.style.cursor = 'pointer'
        // Устанавливаем pointer-events для обеспечения кликабельности поверх других элементов
        balconyRect.style.pointerEvents = 'all'
        
        const balconyType = section.balconyType || 'seats'
        
        if (balconyType === 'dancefloor') {
          // Танцпольный балкон
          // НЕ добавляем seatClassName в режиме редактирования, чтобы избежать конфликта стилей hover
          // Класс будет добавлен при сохранении схемы для кликабельности в режиме просмотра
          balconyRect.setAttribute('data-category', section.category || 'balcony')
          balconyRect.setAttribute('data-count', String(section.count || 0))
          // НЕ устанавливаем data-row и data-seat для танцпола, чтобы он обрабатывался как категория с количеством мест
          svgRef.current.appendChild(balconyRect)
          
          // Добавляем текст "DANCE FLOOR" на балконе с переносом слов
          const positionLabel = 'M' // Для нижних балконов всегда 'M'
          const balconyNumber = balconyIndex + 1
          // Используем label из секции, если он есть и содержит "DANCE FLOOR", иначе формируем новый
          let textToDisplay = section.label || `BALCONY ${positionLabel} ${balconyNumber} DANCE FLOOR`
          // Если в label уже есть "DANCE FLOOR", не добавляем его снова
          if (!textToDisplay.includes('DANCE FLOOR')) {
            textToDisplay = `${textToDisplay} DANCE FLOOR`
          }
          // Используем createMultilineText для переноса слов
          createMultilineText(
            svgRef.current,
            textToDisplay,
            balconyX + balconyWidth / 2,
            balconyY + balconyHeight / 2,
            balconyWidth - 20, // Максимальная ширина с отступами
            14,
            '#fff',
            'bold'
          )
          
          // Добавляем обработчики после добавления в DOM
          addSectionHandlers(balconyRect, String(section.id))
        } else if (balconyType === 'tables') {
          // Балкон со столом (нижний балкон)
          svgRef.current.appendChild(balconyRect)
          // Добавляем обработчики после добавления в DOM
          addSectionHandlers(balconyRect, String(section.id))
          
          // Ищем все столы, привязанные к этому балкону
          const balconyTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === section.id)
          
          if (balconyTables.length > 0) {
            // Рендерим все столы внутри балкона
            balconyTables.forEach((balconyTable, tableIndex) => {
              // Рендерим стол: используем координаты стола, если заданы, иначе распределяем по балкону
              let tableX, tableY
              if (balconyTable.x !== null && balconyTable.x !== undefined && 
                  balconyTable.y !== null && balconyTable.y !== undefined) {
                // Используем сохраненные координаты (относительно SVG)
                tableX = balconyTable.x
                tableY = balconyTable.y
              } else {
                // По умолчанию - распределяем столы равномерно по балкону
                const tablesCount = balconyTables.length
                if (tablesCount === 1) {
                  tableX = balconyX + balconyWidth / 2
                  tableY = balconyY + balconyHeight / 2
                } else {
                  // Распределяем столы в сетке
                  const cols = Math.ceil(Math.sqrt(tablesCount))
                  const rows = Math.ceil(tablesCount / cols)
                  const col = tableIndex % cols
                  const row = Math.floor(tableIndex / cols)
                  const spacingX = balconyWidth / (cols + 1)
                  const spacingY = balconyHeight / (rows + 1)
                  tableX = balconyX + spacingX * (col + 1)
                  tableY = balconyY + spacingY * (row + 1)
                }
              }
            const tableSize = balconyTable.tableSize || 60
            const tableHeight = balconyTable.tableHeight || 40
            const shape = balconyTable.shape || 'round'
            
            const seatsTop = balconyTable.seatsTop || 0
            const seatsRight = balconyTable.seatsRight || 0
            const seatsBottom = balconyTable.seatsBottom || 0
            const seatsLeft = balconyTable.seatsLeft || 0
            const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
            
            const seatDistanceFromEdge = 10
            let seatRadius = 4
            
            if (shape === 'round' && totalSeats > 0) {
              const circumference = 2 * Math.PI * (tableSize / 2 + seatDistanceFromEdge)
              const minDistanceBetweenSeats = circumference / totalSeats
              seatRadius = Math.min(minDistanceBetweenSeats / 2, 6)
            } else if ((shape === 'square' || shape === 'rectangular') && totalSeats > 0) {
              const maxSeatsOnSide = Math.max(seatsTop, seatsRight, seatsBottom, seatsLeft)
              if (maxSeatsOnSide > 0) {
                const sideLength = shape === 'rectangular' ? Math.max(tableSize, tableHeight) : tableSize
                const minDistanceBetweenSeats = sideLength / (maxSeatsOnSide + 1)
                seatRadius = Math.min(minDistanceBetweenSeats / 2, 6)
              }
            }
            
            seatRadius = Math.max(2, Math.min(seatRadius, 6))
            
            let tableElement
            if (shape === 'round') {
              tableElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
              tableElement.setAttribute('cx', tableX)
              tableElement.setAttribute('cy', tableY)
              tableElement.setAttribute('r', tableSize / 2)
              tableElement.setAttribute('fill', balconyTable.color || '#8B4513')
              tableElement.setAttribute('stroke', '#000')
              tableElement.setAttribute('stroke-width', '2')
            } else {
              tableElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
              tableElement.setAttribute('x', tableX - tableSize / 2)
              tableElement.setAttribute('y', tableY - (tableHeight / 2))
              tableElement.setAttribute('width', tableSize)
              tableElement.setAttribute('height', tableHeight)
              tableElement.setAttribute('fill', balconyTable.color || '#8B4513')
              tableElement.setAttribute('stroke', '#000')
              tableElement.setAttribute('stroke-width', '2')
              tableElement.setAttribute('rx', '5')
            }
            
            tableElement.setAttribute('data-section-id', String(balconyTable.id))
            tableElement.style.cursor = 'pointer'
            tableElement.style.pointerEvents = 'all'
            svgRef.current.appendChild(tableElement)
            
            addSectionHandlers(tableElement, String(balconyTable.id))
            
            // Рендерим места (код аналогичен боковым балконам, но для нижних)
            if (totalSeats > 0) {
              const categoryColor = categories.find(c => c.value === balconyTable.category)?.color || balconyTable.seatColor || '#ffaa00'
              let seatIndex = 0
              
              if (shape === 'round') {
                const circleRadius = tableSize / 2 + seatDistanceFromEdge
                const halfSize = tableSize / 2
                
                const checkOverlap = (seatsCount) => {
                  if (seatsCount <= 1) return false
                  const spacing = tableSize / (seatsCount + 1)
                  return spacing < 2 * seatRadius
                }
                
                const hasOverlap = checkOverlap(seatsTop) || checkOverlap(seatsRight) || 
                                  checkOverlap(seatsBottom) || checkOverlap(seatsLeft)
                
                if (hasOverlap) {
                  for (let i = 0; i < totalSeats; i++) {
                    const angle = (2 * Math.PI * i) / totalSeats - Math.PI / 2
                    const seatX = tableX + circleRadius * Math.cos(angle)
                    const seatY = tableY + circleRadius * Math.sin(angle)
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                } else {
                  for (let i = 0; i < seatsTop; i++) {
                    const spacing = tableSize / (seatsTop + 1)
                    const seatX = tableX - halfSize + spacing * (i + 1)
                    const seatY = tableY - circleRadius
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                  for (let i = 0; i < seatsRight; i++) {
                    const spacing = tableSize / (seatsRight + 1)
                    const seatX = tableX + circleRadius
                    const seatY = tableY - halfSize + spacing * (i + 1)
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                  for (let i = 0; i < seatsBottom; i++) {
                    const spacing = tableSize / (seatsBottom + 1)
                    const seatX = tableX + halfSize - spacing * (i + 1)
                    const seatY = tableY + circleRadius
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                  for (let i = 0; i < seatsLeft; i++) {
                    const spacing = tableSize / (seatsLeft + 1)
                    const seatX = tableX - circleRadius
                    const seatY = tableY + halfSize - spacing * (i + 1)
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', categoryColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                    seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                    seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                    seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                    seatCircle.style.cursor = 'pointer'
                    addSectionHandlers(seatCircle, String(balconyTable.id))
                    svgRef.current.appendChild(seatCircle)
                    seatIndex++
                  }
                }
              } else if (shape === 'square') {
                const halfSize = tableSize / 2
                const radius = halfSize + seatDistanceFromEdge
                
                for (let i = 0; i < seatsTop; i++) {
                  const spacing = tableSize / (seatsTop + 1)
                  const seatX = tableX - halfSize + spacing * (i + 1)
                  const seatY = tableY - radius
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                for (let i = 0; i < seatsRight; i++) {
                  const spacing = tableSize / (seatsRight + 1)
                  const seatX = tableX + radius
                  const seatY = tableY - halfSize + spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                for (let i = 0; i < seatsBottom; i++) {
                  const spacing = tableSize / (seatsBottom + 1)
                  const seatX = tableX + halfSize - spacing * (i + 1)
                  const seatY = tableY + radius
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                for (let i = 0; i < seatsLeft; i++) {
                  const spacing = tableSize / (seatsLeft + 1)
                  const seatX = tableX - radius
                  const seatY = tableY + halfSize - spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
              } else if (shape === 'rectangular') {
                const widthDist = tableSize / 2 + seatDistanceFromEdge
                const heightDist = tableHeight / 2 + seatDistanceFromEdge
                
                for (let i = 0; i < seatsTop; i++) {
                  const spacing = tableSize / (seatsTop + 1)
                  const seatX = tableX - tableSize / 2 + spacing * (i + 1)
                  const seatY = tableY - heightDist
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                for (let i = 0; i < seatsRight; i++) {
                  const spacing = tableHeight / (seatsRight + 1)
                  const seatX = tableX + widthDist
                  const seatY = tableY - tableHeight / 2 + spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                for (let i = 0; i < seatsBottom; i++) {
                  const spacing = tableSize / (seatsBottom + 1)
                  const seatX = tableX + tableSize / 2 - spacing * (i + 1)
                  const seatY = tableY + heightDist
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
                for (let i = 0; i < seatsLeft; i++) {
                  const spacing = tableHeight / (seatsLeft + 1)
                  const seatX = tableX - widthDist
                  const seatY = tableY + tableHeight / 2 - spacing * (i + 1)
                  const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                  seatCircle.setAttribute('cx', seatX)
                  seatCircle.setAttribute('cy', seatY)
                  seatCircle.setAttribute('r', seatRadius)
                  seatCircle.setAttribute('fill', categoryColor)
                  seatCircle.setAttribute('stroke', '#000')
                  seatCircle.setAttribute('stroke-width', '1')
                  seatCircle.classList.add(seatClassName)
                  seatCircle.setAttribute('data-category', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-row', balconyTable.category || 'table')
                  seatCircle.setAttribute('data-seat', String(seatIndex + 1))
                  seatCircle.setAttribute('data-section-id', String(balconyTable.id))
                  seatCircle.setAttribute('data-table-id', String(balconyTable.id))
                  seatCircle.style.cursor = 'pointer'
                  addSectionHandlers(seatCircle, String(balconyTable.id))
                  svgRef.current.appendChild(seatCircle)
                  seatIndex++
                }
              }
            }
            })
          }
        } else if (balconyType === 'sofas') {
          // Балкон с диванами (нижний балкон) - аналогично боковым балконам
          svgRef.current.appendChild(balconyRect)
          addSectionHandlers(balconyRect, String(section.id))
          
          const balconySofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === section.id)
          
          if (balconySofas.length > 0) {
            balconySofas.forEach((balconySofa, sofaIndex) => {
              let sofaX, sofaY
              if (balconySofa.x !== null && balconySofa.x !== undefined && 
                  balconySofa.y !== null && balconySofa.y !== undefined) {
                sofaX = balconySofa.x
                sofaY = balconySofa.y
              } else {
                const sofasCount = balconySofas.length
                if (sofasCount === 1) {
                  sofaX = balconyX + balconyWidth / 2
                  sofaY = balconyY + balconyHeight / 2
                } else {
                  const cols = Math.ceil(Math.sqrt(sofasCount))
                  const rows = Math.ceil(sofasCount / cols)
                  const col = sofaIndex % cols
                  const row = Math.floor(sofaIndex / cols)
                  const spacingX = balconyWidth / (cols + 1)
                  const spacingY = balconyHeight / (rows + 1)
                  sofaX = balconyX + spacingX * (col + 1)
                  sofaY = balconyY + spacingY * (row + 1)
                }
              }
              
              const sofaWidth = balconySofa.sofaWidth || 120
              const sofaHeight = balconySofa.sofaHeight || 60
              const seatsCount = balconySofa.seatsCount || 0
              const sofaColor = balconySofa.color || '#8B4513'
              
              const halfWidth = sofaWidth / 2
              const halfHeight = sofaHeight / 2
              sofaX = Math.max(balconyX + halfWidth, Math.min(balconyX + balconyWidth - halfWidth, sofaX))
              sofaY = Math.max(balconyY + halfHeight, Math.min(balconyY + balconyHeight - halfHeight, sofaY))
              
              const renderX = sofaX - halfWidth
              const renderY = sofaY - halfHeight
              
              const sofaRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
              sofaRect.setAttribute('x', renderX)
              sofaRect.setAttribute('y', renderY)
              sofaRect.setAttribute('width', sofaWidth)
              sofaRect.setAttribute('height', sofaHeight)
              sofaRect.setAttribute('fill', sofaColor)
              sofaRect.setAttribute('stroke', '#000')
              sofaRect.setAttribute('stroke-width', '2')
              sofaRect.setAttribute('data-section-id', String(balconySofa.id))
              sofaRect.style.cursor = 'pointer'
              sofaRect.style.pointerEvents = 'all'
              svgRef.current.appendChild(sofaRect)
              
              addSectionHandlers(sofaRect, String(balconySofa.id))
              
              // Рендерим название и места (используем ту же логику, что и для боковых балконов)
              const categoryColorForSofa = balconySofa.category 
                ? categories.find(c => c.value === balconySofa.category)?.color 
                : null
              const sofaSeatColor = categoryColorForSofa || balconySofa.seatColor || '#ffaa00'
              
              const padding = 5
              const fontSize = 14
              const textTopPadding = 3
              const textBottomPadding = 8
              
              const isVertical = sofaWidth < sofaHeight
              const textY = sofaY - halfHeight + padding + textTopPadding
              
              if (balconySofa.label) {
                const sofaText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
                sofaText.setAttribute('x', sofaX)
                sofaText.setAttribute('y', textY)
                sofaText.setAttribute('text-anchor', 'middle')
                sofaText.setAttribute('dominant-baseline', 'hanging')
                sofaText.setAttribute('fill', '#fff')
                sofaText.setAttribute('font-size', String(fontSize))
                sofaText.setAttribute('font-weight', 'bold')
                sofaText.setAttribute('pointer-events', 'none')
                sofaText.textContent = balconySofa.label
                svgRef.current.appendChild(sofaText)
              }
              
              if (seatsCount > 0) {
                const availableWidth = sofaWidth - padding * 2
                const availableHeight = sofaHeight - padding * 2
                
                let seatRadius, spacing, startX, startY
                
                if (isVertical) {
                  const textBottomY = textY + fontSize
                  const seatsAreaTop = textBottomY + textBottomPadding
                  const seatsAreaBottom = sofaY + halfHeight - padding
                  const seatsAvailableHeight = Math.max(0, seatsAreaBottom - seatsAreaTop)
                  
                  seatRadius = Math.min(availableWidth / 2, seatsAvailableHeight / seatsCount / 2, 5)
                  seatRadius = Math.max(2, seatRadius)
                  
                  if (seatsCount > 1) {
                    const totalSeatsHeight = seatRadius * 2 * seatsCount
                    const remainingSpace = seatsAvailableHeight - totalSeatsHeight
                    spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
                  } else {
                    spacing = 0
                  }
                  
                  startX = sofaX
                  startY = seatsAreaTop + seatRadius
                  
                  const lastSeatY = startY + (seatsCount - 1) * (seatRadius * 2 + spacing)
                  if (lastSeatY + seatRadius > seatsAreaBottom) {
                    const maxRadius = (seatsAreaBottom - seatsAreaTop) / (seatsCount * 2)
                    seatRadius = Math.min(maxRadius, availableWidth / 2, 5)
                    seatRadius = Math.max(2, seatRadius)
                    if (seatsCount > 1) {
                      const totalSeatsHeight = seatRadius * 2 * seatsCount
                      const remainingSpace = seatsAvailableHeight - totalSeatsHeight
                      spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
                    }
                    startY = seatsAreaTop + seatRadius
                  }
                  
                  for (let i = 0; i < seatsCount; i++) {
                    const seatX = startX
                    const seatY = startY + i * (seatRadius * 2 + spacing)
                    
                    if (seatY + seatRadius <= seatsAreaBottom && seatY - seatRadius >= seatsAreaTop) {
                      const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                      seatCircle.setAttribute('cx', seatX)
                      seatCircle.setAttribute('cy', seatY)
                      seatCircle.setAttribute('r', seatRadius)
                      seatCircle.setAttribute('fill', sofaSeatColor)
                      seatCircle.setAttribute('stroke', '#000')
                      seatCircle.setAttribute('stroke-width', '1')
                      seatCircle.classList.add(seatClassName)
                      seatCircle.setAttribute('data-category', balconySofa.category || 'sofa')
                      seatCircle.setAttribute('data-row', balconySofa.category || 'sofa')
                      seatCircle.setAttribute('data-seat', String(i + 1))
                      seatCircle.setAttribute('data-sofa-id', String(balconySofa.id))
                      seatCircle.style.cursor = 'pointer'
                      svgRef.current.appendChild(seatCircle)
                    }
                  }
                } else {
                  const textBottomY = textY + fontSize
                  const minSeatsY = textBottomY + textBottomPadding
                  const centerY = sofaY
                  const seatsY = Math.max(minSeatsY, centerY)
                  
                  seatRadius = Math.min(availableWidth / seatsCount / 2, availableHeight / 2, 6)
                  seatRadius = Math.max(3, seatRadius)
                  spacing = seatsCount > 1 ? (availableWidth - seatRadius * 2 * seatsCount) / (seatsCount - 1) : 0
                  
                  startX = sofaX - halfWidth + padding + seatRadius
                  startY = seatsY
                  
                  for (let i = 0; i < seatsCount; i++) {
                    const seatX = startX + i * (seatRadius * 2 + spacing)
                    const seatY = startY
                    
                    const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    seatCircle.setAttribute('cx', seatX)
                    seatCircle.setAttribute('cy', seatY)
                    seatCircle.setAttribute('r', seatRadius)
                    seatCircle.setAttribute('fill', sofaSeatColor)
                    seatCircle.setAttribute('stroke', '#000')
                    seatCircle.setAttribute('stroke-width', '1')
                    seatCircle.classList.add(seatClassName)
                    seatCircle.setAttribute('data-category', balconySofa.category || 'sofa')
                    seatCircle.setAttribute('data-row', balconySofa.category || 'sofa')
                    seatCircle.setAttribute('data-seat', String(i + 1))
                    seatCircle.setAttribute('data-sofa-id', String(balconySofa.id))
                    seatCircle.style.cursor = 'pointer'
                    svgRef.current.appendChild(seatCircle)
                  }
                }
              }
            })
          }
        } else {
          // Балкон с местами (нижний балкон)
          // Проверяем, есть ли места для рендеринга
          const rowsCount = section.rowsCount || 0
          const seatsPerRow = section.seatsPerRow || 0
          
          if (rowsCount > 0 && seatsPerRow > 0) {
            // Сначала генерируем места, потом добавляем балкон поверх них, чтобы балкон получал клики на пустые места
          // Генерация мест на нижнем балконе
          // Для нижнего балкона: ряды идут вертикально (сверху вниз), места в ряду горизонтально (слева направо, смотрят на сцену)
          const padding = 15
          const availableWidth = balconyWidth - padding * 2
          const availableHeight = balconyHeight - padding * 2 - 25
          
          // rowsCount - количество вертикальных рядов (сверху вниз)
          // seatsPerRow - количество мест в горизонтальном ряду (слева направо)
          const maxSeatWidth = availableWidth / seatsPerRow
          const maxSeatHeight = availableHeight / rowsCount
          const seatSize = Math.min(maxSeatWidth * 0.8, maxSeatHeight * 0.8, 15)
          const seatRadius = Math.max(1, seatSize / 2 - 0.5) // Минимум 1px
          
          // Горизонтальное расстояние между местами в ряду
          const totalSeatsWidth = seatsPerRow * seatSize
          const horizontalSpacing = seatsPerRow > 1 ? (availableWidth - totalSeatsWidth) / (seatsPerRow - 1) : 0
          
          // Вертикальное расстояние между рядами
          const totalSeatsHeight = rowsCount * seatSize
          const verticalSpacing = rowsCount > 1 ? (availableHeight - totalSeatsHeight) / (rowsCount - 1) : 0
          
          // Начальная позиция: центрируем по ширине
          const startX = balconyX + padding + (availableWidth - totalSeatsWidth - horizontalSpacing * (seatsPerRow - 1)) / 2
          const startSeatY = balconyY + padding + 25
            
            // Собираем границы всех мест для создания невидимого элемента
            let bottomBalconySeatsMinX = Infinity
            let bottomBalconySeatsMaxX = -Infinity
            let bottomBalconySeatsMinY = Infinity
            let bottomBalconySeatsMaxY = -Infinity
          
          // Генерируем места: ряды вертикально, места горизонтально
          for (let row = 0; row < rowsCount; row++) {
            for (let seat = 0; seat < seatsPerRow; seat++) {
              const seatCenterX = startX + seat * (seatSize + horizontalSpacing) + seatSize / 2
              const seatCenterY = startSeatY + row * (seatSize + verticalSpacing) + seatSize / 2
                
                // Обновляем границы для создания невидимого элемента
                bottomBalconySeatsMinX = Math.min(bottomBalconySeatsMinX, seatCenterX - seatRadius)
                bottomBalconySeatsMaxX = Math.max(bottomBalconySeatsMaxX, seatCenterX + seatRadius)
                bottomBalconySeatsMinY = Math.min(bottomBalconySeatsMinY, seatCenterY - seatRadius)
                bottomBalconySeatsMaxY = Math.max(bottomBalconySeatsMaxY, seatCenterY + seatRadius)
              
              // Определяем цвет из категории
              const categoryColorForBottomBalcony = section.category 
                ? categories.find(c => c.value === section.category)?.color 
                : null
              const bottomBalconySeatColor = categoryColorForBottomBalcony || '#ffaa00'
              
              const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
              seatCircle.setAttribute('cx', seatCenterX)
              seatCircle.setAttribute('cy', seatCenterY)
              seatCircle.setAttribute('r', seatRadius)
              seatCircle.setAttribute('fill', bottomBalconySeatColor)
              seatCircle.setAttribute('stroke', '#000')
              seatCircle.setAttribute('stroke-width', '1')
              seatCircle.classList.add(seatClassName)
              seatCircle.setAttribute('data-category', section.category || 'balcony')
              seatCircle.setAttribute('data-row', String(row + 1))
              seatCircle.setAttribute('data-seat', String(seat + 1))
              seatCircle.setAttribute('data-section-id', String(section.id))
              seatCircle.style.cursor = 'pointer'
                // Места не должны перехватывать клики на невидимый элемент
                seatCircle.style.pointerEvents = 'none' // Отключаем pointer-events для мест, чтобы клики проходили к невидимому элементу
              
              svgRef.current.appendChild(seatCircle)
              }
            }
            
            // Сохраняем информацию о невидимом элементе для создания в конце
            // Невидимый элемент должен покрывать весь балкон, а не только места
            if (bottomBalconySeatsMinX !== Infinity && bottomBalconySeatsMaxX !== -Infinity && 
                bottomBalconySeatsMinY !== Infinity && bottomBalconySeatsMaxY !== -Infinity) {
              balconySeatsOverlays.push({
                sectionId: section.id,
                minX: balconyX, // Весь балкон
                maxX: balconyX + balconyWidth, // Весь балкон
                minY: balconyY, // Весь балкон
                maxY: balconyY + balconyHeight // Весь балкон
              })
            }
          }
          
          // Добавляем балкон после мест
          svgRef.current.appendChild(balconyRect)
          // Если на балконе есть места, не добавляем обработчики к балкону - они будут на невидимом элементе
          if (rowsCount === 0 || seatsPerRow === 0) {
            // Добавляем обработчики только если нет мест
            addSectionHandlers(balconyRect, String(section.id))
          } else {
            // Если есть места, отключаем pointer-events для балкона, чтобы клики проходили к невидимому элементу
            balconyRect.style.pointerEvents = 'none'
          }
        }
        
        // Текст названия балкона с переносом, если не влезает (только для балконов без танцпола)
        // Для балконов с танцполом текст уже добавлен по центру выше
        if (balconyType !== 'dancefloor') {
        const labelText = section.label || 'BALCONY M'
        const textX = balconyX + balconyWidth / 2
        const textY = balconyY + 18
        const maxTextWidth = balconyWidth - 20 // Оставляем отступы по 10px с каждой стороны
        createMultilineText(svgRef.current, labelText, textX, textY, maxTextWidth, 14, '#fff', 'bold')
        }
      })
    }
    
    // 6. Балкон (рендерится перед барами и столами, чтобы они были поверх)
    // Балконы уже отрендерены выше, этот комментарий для ясности
    
    // 7. Бар (рендерится после всех секций, чтобы был поверх)
    const barSections = sections.filter(s => s.type === SECTION_TYPES.BAR)
    barSections.forEach((section) => {
      // Определяем позицию бара: если x, y заданы - используем их, иначе центр схемы
      let barX, barY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        barX = section.x
        barY = section.y
      } else {
        // По умолчанию - центр схемы
        barX = vbX + vbWidth / 2
        barY = vbY + vbHeight / 2
      }
      
      // Выравниваем по сетке
      barX = snapToGrid(barX)
      barY = snapToGrid(barY)
      
      const barWidth = section.width || 100
      const barHeight = section.height || 80
      
      // Центрируем бар относительно его размеров
      barX = barX - barWidth / 2
      barY = barY - barHeight / 2
      
      const barRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      barRect.setAttribute('x', barX)
      barRect.setAttribute('y', barY)
      barRect.setAttribute('width', barWidth)
      barRect.setAttribute('height', barHeight)
      barRect.setAttribute('fill', section.color || '#555555')
      barRect.setAttribute('stroke', '#000')
      barRect.setAttribute('stroke-width', '2')
      barRect.setAttribute('rx', '10')
      barRect.setAttribute('data-section-id', String(section.id))
      // Устанавливаем pointer-events для обеспечения кликабельности поверх других элементов
      barRect.style.pointerEvents = 'all'
      addSectionHandlers(barRect, String(section.id))
      
      const barText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      barText.setAttribute('x', barX + barWidth / 2)
      barText.setAttribute('y', barY + barHeight / 2)
      barText.setAttribute('text-anchor', 'middle')
      barText.setAttribute('dominant-baseline', 'middle')
      barText.setAttribute('fill', '#fff')
      barText.setAttribute('font-size', '16')
      barText.setAttribute('font-weight', 'bold')
      barText.setAttribute('pointer-events', 'none')
      barText.textContent = section.label || 'BAR'
      
      svgRef.current.appendChild(barRect)
      svgRef.current.appendChild(barText)
    })
    
    // 7. Стол (исключаем столы внутри балконов, они рендерятся вместе с балконами)
    const tableSections = sections.filter(s => s.type === SECTION_TYPES.TABLE && !s.balconyId)
    
    // Находим максимальное количество мест среди всех столов и минимальные размеры для расчета
    let maxSeatsAtTable = 0 // Максимальное общее количество мест на столе
    let maxSeatsOnSide = 0 // Максимальное количество мест на одной стороне (для квадратных/прямоугольных)
    let minCircleRadius = Infinity // Для круглых столов
    let minSideLength = Infinity // Для квадратных и прямоугольных столов (минимальная длина стороны с местами)
    
    tableSections.forEach(section => {
      const seatsTop = section.seatsTop || 0
      const seatsRight = section.seatsRight || 0
      const seatsBottom = section.seatsBottom || 0
      const seatsLeft = section.seatsLeft || 0
      const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
      
      if (totalSeats > maxSeatsAtTable) {
        maxSeatsAtTable = totalSeats
      }
      
      const shape = section.shape || 'round'
      const tableSize = section.tableSize || 60
      const tableHeight = section.tableHeight || 40
      const seatDistanceFromEdge = 10 // Фиксированное расстояние от края стола до мест
      
      if (shape === 'round') {
        // Для круглых столов - радиус окружности
        const circleRadius = tableSize / 2 + seatDistanceFromEdge
        if (circleRadius < minCircleRadius) {
          minCircleRadius = circleRadius
        }
      } else if (shape === 'square') {
        // Для квадратных столов - находим максимальное количество мест на одной стороне
        const maxSeatsOnThisSide = Math.max(seatsTop, seatsRight, seatsBottom, seatsLeft)
        if (maxSeatsOnThisSide > maxSeatsOnSide) {
          maxSeatsOnSide = maxSeatsOnThisSide
        }
        // Длина стороны стола
        if (tableSize < minSideLength) {
          minSideLength = tableSize
        }
      } else { // rectangular
        // Для прямоугольных столов - находим максимальное количество мест на одной стороне
        const maxSeatsOnThisSide = Math.max(seatsTop, seatsRight, seatsBottom, seatsLeft)
        if (maxSeatsOnThisSide > maxSeatsOnSide) {
          maxSeatsOnSide = maxSeatsOnThisSide
        }
        // Длина стороны зависит от того, где больше мест
        let sideLength
        if (Math.max(seatsTop, seatsBottom) >= Math.max(seatsLeft, seatsRight)) {
          // Больше мест сверху/снизу - используем ширину (tableSize)
          sideLength = tableSize
        } else {
          // Больше мест слева/справа - используем высоту (tableHeight)
          sideLength = tableHeight
        }
        if (sideLength < minSideLength) {
          minSideLength = sideLength
        }
      }
    })
    
    // Если нет столов, используем дефолтные значения
    if (maxSeatsAtTable === 0) {
      maxSeatsAtTable = 4
    }
    if (minCircleRadius === Infinity) {
      minCircleRadius = 50
    }
    if (minSideLength === Infinity) {
      minSideLength = 60
    }
    if (maxSeatsOnSide === 0) {
      maxSeatsOnSide = 4
    }
    
    // Рассчитываем размер места на основе двух сценариев:
    // 1. Для круглых столов - на основе окружности
    // 2. Для квадратных/прямоугольных - на основе длины стороны
    // Берем минимальный размер из обоих расчетов
    
    // Расчет для круглых столов
    // Длина окружности = 2 * π * radius
    // Для N мест: расстояние между центрами = 2 * π * radius / N
    // Чтобы места не перекрывались: 2 * seatRadius <= расстояние между центрами
    // Отсюда: seatRadius <= (π * radius) / N
    const circumference = 2 * Math.PI * minCircleRadius
    const minDistanceBetweenSeatsCircle = circumference / maxSeatsAtTable
    const calculatedSeatRadiusCircle = minDistanceBetweenSeatsCircle / 2
    
    // Расчет для квадратных/прямоугольных столов
    // Для N мест на стороне длиной L: места распределяются равномерно
    // Расстояние между центрами = L / (N + 1)
    // Чтобы места не перекрывались: 2 * seatRadius <= L / (N + 1)
    // Отсюда: seatRadius <= L / (2 * (N + 1))
    const calculatedSeatRadiusSquare = minSideLength / (2 * (maxSeatsOnSide + 1))
    
    // Берем минимальный размер из обоих расчетов
    const calculatedSeatRadius = Math.min(calculatedSeatRadiusCircle, calculatedSeatRadiusSquare, 8) // Максимум 8px
    
    // Если места слишком маленькие, устанавливаем минимум
    let finalSeatRadius = Math.max(2, calculatedSeatRadius) // Минимум 2px
    
    // Функция для отрисовки одного стола
    const renderTable = (section) => {
      // Определяем позицию стола: если x, y заданы - используем их, иначе центр схемы
      let tableX, tableY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        tableX = section.x
        tableY = section.y
      } else {
        // По умолчанию - центр схемы
        tableX = vbX + vbWidth / 2
        tableY = vbY + vbHeight / 2
      }
      
      // Выравниваем по сетке
      tableX = snapToGrid(tableX)
      tableY = snapToGrid(tableY)
      const shape = section.shape || 'round'
      const tableSize = section.tableSize || 60
      const tableHeight = section.tableHeight || 40
      const seatRadius = finalSeatRadius // Используем единый размер для всех столов
      const seatDistanceFromEdge = 10 // Фиксированное расстояние от края стола до мест (в пикселях)
      
      // Вычисляем максимальный радиус стола с местами для ограничения границ
      let maxRadius = 0
      if (shape === 'round') {
        maxRadius = tableSize / 2 + seatDistanceFromEdge + seatRadius
      } else if (shape === 'square') {
        const halfSize = tableSize / 2
        const diagonalRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize)
        maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
      } else { // rectangular
        const halfWidth = tableSize / 2
        const halfHeight = tableHeight / 2
        const diagonalRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
        maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
      }
      
      // Ограничиваем позицию стола границами viewBox
      tableX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, tableX))
      tableY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, tableY))
      
      // Создаем стол в зависимости от формы
      if (shape === 'round') {
        // Круглый стол
        const tableCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        tableCircle.setAttribute('cx', tableX)
        tableCircle.setAttribute('cy', tableY)
        tableCircle.setAttribute('r', tableSize / 2)
        tableCircle.setAttribute('fill', section.color || '#8B4513')
        tableCircle.setAttribute('stroke', '#000')
        tableCircle.setAttribute('stroke-width', '2')
        tableCircle.setAttribute('data-section-id', String(section.id))
        tableCircle.style.cursor = 'pointer'
        tableCircle.style.pointerEvents = 'all'
        svgRef.current.appendChild(tableCircle)
        // Добавляем обработчики после добавления в DOM
        addSectionHandlers(tableCircle, String(section.id))
        
        // Распределяем места по сторонам круглого стола
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
        
        // Для круглого стола расстояние от центра до мест = радиус стола + расстояние от края
        const circleRadius = tableSize / 2 + seatDistanceFromEdge
        const halfSize = tableSize / 2
        
        // Определяем цвет из категории
        const categoryColorForTable = section.category 
          ? categories.find(c => c.value === section.category)?.color 
          : null
        const tableSeatColor = categoryColorForTable || '#ffaa00'
        
        // Проверяем, будут ли места перекрываться при размещении на сторонах
        // Если расстояние между соседними местами меньше 2 * seatRadius, то места перекрываются
        const checkOverlap = (seatsCount) => {
          if (seatsCount <= 1) return false
          const spacing = tableSize / (seatsCount + 1)
          return spacing < 2 * seatRadius
        }
        
        const hasOverlap = checkOverlap(seatsTop) || checkOverlap(seatsRight) || 
                          checkOverlap(seatsBottom) || checkOverlap(seatsLeft)
        
        let seatIndex = 0
        
        if (hasOverlap) {
          // Если места перекрываются, распределяем их равномерно по кругу
          for (let i = 0; i < totalSeats; i++) {
            // Угол для каждого места, начиная сверху (-90°)
            const angle = (2 * Math.PI * i) / totalSeats - Math.PI / 2
            const seatX = tableX + circleRadius * Math.cos(angle)
            const seatY = tableY + circleRadius * Math.sin(angle)
            
            const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            seatCircle.setAttribute('cx', seatX)
            seatCircle.setAttribute('cy', seatY)
            seatCircle.setAttribute('r', seatRadius)
            seatCircle.setAttribute('fill', tableSeatColor)
            seatCircle.setAttribute('stroke', '#000')
            seatCircle.setAttribute('stroke-width', '1')
            seatCircle.classList.add(seatClassName)
            seatCircle.setAttribute('data-category', section.category || 'table')
            seatCircle.setAttribute('data-row', section.category || 'table')
            seatCircle.setAttribute('data-seat', String(seatIndex + 1))
            seatCircle.setAttribute('data-table-id', String(section.id))
            seatCircle.style.cursor = 'pointer'
            svgRef.current.appendChild(seatCircle)
            seatIndex++
          }
        } else {
          // Если места не перекрываются, размещаем их на указанных сторонах
          // Верхняя сторона
          for (let i = 0; i < seatsTop; i++) {
            const spacing = tableSize / (seatsTop + 1)
            const seatX = tableX - halfSize + spacing * (i + 1)
            const seatY = tableY - circleRadius
            
            const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            seatCircle.setAttribute('cx', seatX)
            seatCircle.setAttribute('cy', seatY)
            seatCircle.setAttribute('r', seatRadius)
            seatCircle.setAttribute('fill', tableSeatColor)
            seatCircle.setAttribute('stroke', '#000')
            seatCircle.setAttribute('stroke-width', '1')
            seatCircle.classList.add(seatClassName)
            seatCircle.setAttribute('data-category', section.category || 'table')
            seatCircle.setAttribute('data-row', section.category || 'table')
            seatCircle.setAttribute('data-seat', String(seatIndex + 1))
            seatCircle.setAttribute('data-table-id', String(section.id))
            seatCircle.style.cursor = 'pointer'
            svgRef.current.appendChild(seatCircle)
            seatIndex++
          }
          
          // Правая сторона
          for (let i = 0; i < seatsRight; i++) {
            const spacing = tableSize / (seatsRight + 1)
            const seatX = tableX + circleRadius
            const seatY = tableY - halfSize + spacing * (i + 1)
            
            const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            seatCircle.setAttribute('cx', seatX)
            seatCircle.setAttribute('cy', seatY)
            seatCircle.setAttribute('r', seatRadius)
            seatCircle.setAttribute('fill', tableSeatColor)
            seatCircle.setAttribute('stroke', '#000')
            seatCircle.setAttribute('stroke-width', '1')
            seatCircle.classList.add(seatClassName)
            seatCircle.setAttribute('data-category', section.category || 'table')
            seatCircle.setAttribute('data-row', section.category || 'table')
            seatCircle.setAttribute('data-seat', String(seatIndex + 1))
            seatCircle.setAttribute('data-table-id', String(section.id))
            seatCircle.style.cursor = 'pointer'
            svgRef.current.appendChild(seatCircle)
            seatIndex++
          }
          
          // Нижняя сторона
          for (let i = 0; i < seatsBottom; i++) {
            const spacing = tableSize / (seatsBottom + 1)
            const seatX = tableX + halfSize - spacing * (i + 1)
            const seatY = tableY + circleRadius
            
            const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            seatCircle.setAttribute('cx', seatX)
            seatCircle.setAttribute('cy', seatY)
            seatCircle.setAttribute('r', seatRadius)
            seatCircle.setAttribute('fill', tableSeatColor)
            seatCircle.setAttribute('stroke', '#000')
            seatCircle.setAttribute('stroke-width', '1')
            seatCircle.classList.add(seatClassName)
            seatCircle.setAttribute('data-category', section.category || 'table')
            seatCircle.setAttribute('data-row', section.category || 'table')
            seatCircle.setAttribute('data-seat', String(seatIndex + 1))
            seatCircle.setAttribute('data-table-id', String(section.id))
            seatCircle.style.cursor = 'pointer'
            svgRef.current.appendChild(seatCircle)
            seatIndex++
          }
          
          // Левая сторона
          for (let i = 0; i < seatsLeft; i++) {
            const spacing = tableSize / (seatsLeft + 1)
            const seatX = tableX - circleRadius
            const seatY = tableY + halfSize - spacing * (i + 1)
            
            const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            seatCircle.setAttribute('cx', seatX)
            seatCircle.setAttribute('cy', seatY)
            seatCircle.setAttribute('r', seatRadius)
            seatCircle.setAttribute('fill', tableSeatColor)
            seatCircle.setAttribute('stroke', '#000')
            seatCircle.setAttribute('stroke-width', '1')
            seatCircle.classList.add(seatClassName)
            seatCircle.setAttribute('data-category', section.category || 'table')
            seatCircle.setAttribute('data-row', section.category || 'table')
            seatCircle.setAttribute('data-seat', String(seatIndex + 1))
            seatCircle.setAttribute('data-table-id', String(section.id))
            seatCircle.style.cursor = 'pointer'
            svgRef.current.appendChild(seatCircle)
            seatIndex++
          }
        }
      } else if (shape === 'square') {
        // Квадратный стол
        const tableRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        tableRect.setAttribute('x', tableX - tableSize / 2)
        tableRect.setAttribute('y', tableY - tableSize / 2)
        tableRect.setAttribute('width', tableSize)
        tableRect.setAttribute('height', tableSize)
        tableRect.setAttribute('fill', section.color || '#8B4513')
        tableRect.setAttribute('stroke', '#000')
        tableRect.setAttribute('stroke-width', '2')
        tableRect.setAttribute('rx', '5')
        tableRect.setAttribute('data-section-id', String(section.id))
        tableRect.style.cursor = 'pointer'
        tableRect.style.pointerEvents = 'all'
        svgRef.current.appendChild(tableRect)
        // Добавляем обработчики после добавления в DOM
        addSectionHandlers(tableRect, String(section.id))
        
        // Распределяем места по сторонам квадратного стола
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        
        const halfSize = tableSize / 2
        const radius = halfSize + seatDistanceFromEdge
        
        // Определяем цвет из категории
        const categoryColorForTable = section.category 
          ? categories.find(c => c.value === section.category)?.color 
          : null
        const tableSeatColor = categoryColorForTable || '#ffaa00'
        
        let seatIndex = 0
        
        // Верхняя сторона
        for (let i = 0; i < seatsTop; i++) {
          const spacing = tableSize / (seatsTop + 1)
          const seatX = tableX - halfSize + spacing * (i + 1)
          const seatY = tableY - radius
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
        
        // Правая сторона
        for (let i = 0; i < seatsRight; i++) {
          const spacing = tableSize / (seatsRight + 1)
          const seatX = tableX + radius
          const seatY = tableY - halfSize + spacing * (i + 1)
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
        
        // Нижняя сторона
        for (let i = 0; i < seatsBottom; i++) {
          const spacing = tableSize / (seatsBottom + 1)
          const seatX = tableX + halfSize - spacing * (i + 1)
          const seatY = tableY + radius
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
        
        // Левая сторона
        for (let i = 0; i < seatsLeft; i++) {
          const spacing = tableSize / (seatsLeft + 1)
          const seatX = tableX - radius
          const seatY = tableY + halfSize - spacing * (i + 1)
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
      } else if (shape === 'rectangular') {
        // Прямоугольный стол
        const tableRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        tableRect.setAttribute('x', tableX - tableSize / 2)
        tableRect.setAttribute('y', tableY - tableHeight / 2)
        tableRect.setAttribute('width', tableSize)
        tableRect.setAttribute('height', tableHeight)
        tableRect.setAttribute('fill', section.color || '#8B4513')
        tableRect.setAttribute('stroke', '#000')
        tableRect.setAttribute('stroke-width', '2')
        tableRect.setAttribute('rx', '5')
        tableRect.setAttribute('data-section-id', String(section.id))
        tableRect.style.cursor = 'pointer'
        tableRect.style.pointerEvents = 'all'
        svgRef.current.appendChild(tableRect)
        // Добавляем обработчики после добавления в DOM
        addSectionHandlers(tableRect, String(section.id))
        
        // Распределяем места по сторонам прямоугольного стола
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        
        const widthDist = tableSize / 2 + seatDistanceFromEdge
        const heightDist = tableHeight / 2 + seatDistanceFromEdge
        
        // Определяем цвет из категории
        const categoryColorForTable = section.category 
          ? categories.find(c => c.value === section.category)?.color 
          : null
        const tableSeatColor = categoryColorForTable || '#ffaa00'
        
        let seatIndex = 0
        
        // Верхняя сторона
        for (let i = 0; i < seatsTop; i++) {
          const spacing = tableSize / (seatsTop + 1)
          const seatX = tableX - tableSize / 2 + spacing * (i + 1)
          const seatY = tableY - heightDist
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
        
        // Правая сторона
        for (let i = 0; i < seatsRight; i++) {
          const spacing = tableHeight / (seatsRight + 1)
          const seatX = tableX + widthDist
          const seatY = tableY - tableHeight / 2 + spacing * (i + 1)
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
        
        // Нижняя сторона
        for (let i = 0; i < seatsBottom; i++) {
          const spacing = tableSize / (seatsBottom + 1)
          const seatX = tableX + tableSize / 2 - spacing * (i + 1)
          const seatY = tableY + heightDist
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
        
        // Левая сторона
        for (let i = 0; i < seatsLeft; i++) {
          const spacing = tableHeight / (seatsLeft + 1)
          const seatX = tableX - widthDist
          const seatY = tableY + tableHeight / 2 - spacing * (i + 1)
          
          const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          seatCircle.setAttribute('cx', seatX)
          seatCircle.setAttribute('cy', seatY)
          seatCircle.setAttribute('r', seatRadius)
          seatCircle.setAttribute('fill', tableSeatColor)
          seatCircle.setAttribute('stroke', '#000')
          seatCircle.setAttribute('stroke-width', '1')
          seatCircle.classList.add(seatClassName)
          seatCircle.setAttribute('data-category', section.category || 'table')
          seatCircle.setAttribute('data-row', section.category || 'table')
          seatCircle.setAttribute('data-seat', String(seatIndex + 1))
          seatCircle.setAttribute('data-table-id', String(section.id))
          seatCircle.style.cursor = 'pointer'
          svgRef.current.appendChild(seatCircle)
          seatIndex++
        }
      }
      
      // Текст названия стола
      if (section.label) {
        const tableText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        tableText.setAttribute('x', tableX)
        tableText.setAttribute('y', tableY)
        tableText.setAttribute('text-anchor', 'middle')
        tableText.setAttribute('dominant-baseline', 'middle')
        tableText.setAttribute('fill', '#fff')
        tableText.setAttribute('font-size', '16')
        tableText.setAttribute('font-weight', 'bold')
        tableText.setAttribute('pointer-events', 'none')
        tableText.textContent = section.label
        svgRef.current.appendChild(tableText)
      }
    }
    
    // Отрисовываем столы
    tableSections.forEach((section) => {
      renderTable(section)
    })
    
    // 7.5. Диваны (только обычные, не внутри балконов)
    const sofaSections = sections.filter(s => s.type === SECTION_TYPES.SOFA && !s.balconyId)
    
    // Функция для отрисовки одного дивана
    const renderSofa = (section) => {
      // Определяем позицию дивана: если x, y заданы - используем их, иначе центр схемы
      let sofaX, sofaY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        sofaX = section.x
        sofaY = section.y
      } else {
        // По умолчанию - центр схемы
        sofaX = vbX + vbWidth / 2
        sofaY = vbY + vbHeight / 2
      }
      
      // Выравниваем по сетке
      sofaX = snapToGrid(sofaX)
      sofaY = snapToGrid(sofaY)
      
      const sofaWidth = section.sofaWidth || 120
      const sofaHeight = section.sofaHeight || 60
      const seatsCount = section.seatsCount || 0
      
      // Ограничиваем позицию дивана границами viewBox
      const halfWidth = sofaWidth / 2
      const halfHeight = sofaHeight / 2
      sofaX = Math.max(vbX + halfWidth, Math.min(vbX + vbWidth - halfWidth, sofaX))
      sofaY = Math.max(vbY + halfHeight, Math.min(vbY + vbHeight - halfHeight, sofaY))
      
      // Создаем прямоугольник дивана
      const sofaRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      sofaRect.setAttribute('x', sofaX - halfWidth)
      sofaRect.setAttribute('y', sofaY - halfHeight)
      sofaRect.setAttribute('width', sofaWidth)
      sofaRect.setAttribute('height', sofaHeight)
      sofaRect.setAttribute('fill', section.color || '#8B4513')
      sofaRect.setAttribute('stroke', '#000')
      sofaRect.setAttribute('stroke-width', '2')
      sofaRect.setAttribute('data-section-id', String(section.id))
      sofaRect.style.cursor = 'pointer'
      sofaRect.style.pointerEvents = 'all'
      svgRef.current.appendChild(sofaRect)
      addSectionHandlers(sofaRect, String(section.id))
      
      // Определяем цвет из категории
      const categoryColorForSofa = section.category 
        ? categories.find(c => c.value === section.category)?.color 
        : null
      const sofaSeatColor = categoryColorForSofa || section.seatColor || '#ffaa00'
      
      const padding = 5 // Отступ от краев дивана (уменьшен)
      const fontSize = 14 // Размер шрифта для названия (уменьшен)
      const textTopPadding = 3 // Отступ названия от верха дивана (уменьшен)
      const textBottomPadding = 8 // Отступ между названием и местами (уменьшен)
      
      // Определяем, вертикальный ли диван (ширина < высоты)
      const isVertical = sofaWidth < sofaHeight
      
      // Текст названия дивана (сверху внутри дивана)
      // С dominant-baseline: 'hanging' координата Y указывает на верхнюю линию текста
      const textY = sofaY - halfHeight + padding + textTopPadding
      if (section.label) {
        const sofaText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        sofaText.setAttribute('x', sofaX)
        sofaText.setAttribute('y', textY)
        sofaText.setAttribute('text-anchor', 'middle')
        sofaText.setAttribute('dominant-baseline', 'hanging')
        sofaText.setAttribute('fill', '#fff')
        sofaText.setAttribute('font-size', String(fontSize))
        sofaText.setAttribute('font-weight', 'bold')
        sofaText.setAttribute('pointer-events', 'none')
        sofaText.textContent = section.label
        svgRef.current.appendChild(sofaText)
      }
      
      // Распределяем места внутри дивана
      if (seatsCount > 0) {
        // Вычисляем доступное пространство
        const availableWidth = sofaWidth - padding * 2
        const availableHeight = sofaHeight - padding * 2
        
        // Вычисляем размер места
        let seatRadius
        let spacing
        let startX, startY
        
        if (isVertical) {
          // Вертикальный диван - места в один столбец
          // Вычисляем, где заканчивается текст (нижняя часть текста)
          const textBottomY = textY + fontSize
          const seatsAreaTop = textBottomY + textBottomPadding // Начало области для мест
          const seatsAreaBottom = sofaY + halfHeight - padding // Конец области для мест
          const seatsAvailableHeight = Math.max(0, seatsAreaBottom - seatsAreaTop)
          
          // Вычисляем радиус места с учетом того, что все места должны поместиться
          // Максимальный радиус: половина доступной ширины или половина доступной высоты, деленной на количество мест
          seatRadius = Math.min(availableWidth / 2, seatsAvailableHeight / seatsCount / 2, 5)
          seatRadius = Math.max(2, seatRadius) // Минимальный радиус 2px
          
          // Вычисляем расстояние между местами, чтобы они равномерно распределились
          // и последнее место не выходило за пределы
          if (seatsCount > 1) {
            const totalSeatsHeight = seatRadius * 2 * seatsCount
            const remainingSpace = seatsAvailableHeight - totalSeatsHeight
            spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
          } else {
            spacing = 0
          }
          
          // Начальная позиция для первого места (ниже названия, по центру по горизонтали)
          startX = sofaX
          startY = seatsAreaTop + seatRadius
          
          // Проверяем, что последнее место не выходит за пределы
          const lastSeatY = startY + (seatsCount - 1) * (seatRadius * 2 + spacing)
          if (lastSeatY + seatRadius > seatsAreaBottom) {
            // Если последнее место выходит за пределы, уменьшаем радиус и пересчитываем
            const maxRadius = (seatsAreaBottom - seatsAreaTop) / (seatsCount * 2)
            seatRadius = Math.min(maxRadius, availableWidth / 2, 5)
            seatRadius = Math.max(2, seatRadius)
            if (seatsCount > 1) {
              const totalSeatsHeight = seatRadius * 2 * seatsCount
              const remainingSpace = seatsAvailableHeight - totalSeatsHeight
              spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
            }
            startY = seatsAreaTop + seatRadius
          }
          
          // Рендерим места в один столбец
          for (let i = 0; i < seatsCount; i++) {
            const seatX = startX
            const seatY = startY + i * (seatRadius * 2 + spacing)
            
            // Дополнительная проверка, что место не выходит за пределы
            if (seatY + seatRadius <= seatsAreaBottom && seatY - seatRadius >= seatsAreaTop) {
              const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
              seatCircle.setAttribute('cx', seatX)
              seatCircle.setAttribute('cy', seatY)
              seatCircle.setAttribute('r', seatRadius)
              seatCircle.setAttribute('fill', sofaSeatColor)
              seatCircle.setAttribute('stroke', '#000')
              seatCircle.setAttribute('stroke-width', '1')
              seatCircle.classList.add(seatClassName)
              seatCircle.setAttribute('data-category', section.category || 'sofa')
              seatCircle.setAttribute('data-row', section.category || 'sofa')
              seatCircle.setAttribute('data-seat', String(i + 1))
              seatCircle.setAttribute('data-sofa-id', String(section.id))
              seatCircle.style.cursor = 'pointer'
              svgRef.current.appendChild(seatCircle)
            }
          }
        } else {
          // Горизонтальный диван - места в один ряд
          // Для горизонтальных диванов места располагаются по центру по вертикали
          // Название сверху, места по центру или чуть ниже названия
          const textBottomY = textY + fontSize
          const minSeatsY = textBottomY + textBottomPadding // Минимальная позиция для мест (ниже названия)
          const centerY = sofaY // Центр дивана по вертикали
          // Используем максимальное значение, чтобы места были ниже названия, но по возможности по центру
          const seatsY = Math.max(minSeatsY, centerY)
          
          seatRadius = Math.min(availableWidth / seatsCount / 2, availableHeight / 2, 6)
          seatRadius = Math.max(3, seatRadius) // Минимальный радиус 3px
          spacing = seatsCount > 1 ? (availableWidth - seatRadius * 2 * seatsCount) / (seatsCount - 1) : 0
          
          // Начальная позиция для первого места (в один ряд)
          startX = sofaX - halfWidth + padding + seatRadius
          startY = seatsY
          
          // Рендерим места в один ряд
          for (let i = 0; i < seatsCount; i++) {
            const seatX = startX + i * (seatRadius * 2 + spacing)
            const seatY = startY
            
            const seatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            seatCircle.setAttribute('cx', seatX)
            seatCircle.setAttribute('cy', seatY)
            seatCircle.setAttribute('r', seatRadius)
            seatCircle.setAttribute('fill', sofaSeatColor)
            seatCircle.setAttribute('stroke', '#000')
            seatCircle.setAttribute('stroke-width', '1')
            seatCircle.classList.add(seatClassName)
            seatCircle.setAttribute('data-category', section.category || 'sofa')
            seatCircle.setAttribute('data-row', section.category || 'sofa')
            seatCircle.setAttribute('data-seat', String(i + 1))
            seatCircle.setAttribute('data-sofa-id', String(section.id))
            seatCircle.style.cursor = 'pointer'
            svgRef.current.appendChild(seatCircle)
          }
        }
      }
    }
    
    // Отрисовываем диваны
    sofaSections.forEach((section) => {
      renderSofa(section)
    })
    
    // 8. Создаем невидимые элементы поверх всех мест для перехвата кликов
    // Это должно быть ПОСЛЕДНИМ, что добавляется в SVG, чтобы элементы были поверх всего
    
    // Невидимые элементы для рядов мест
    rowSectionsOverlays.forEach((overlay) => {
      // Создаем невидимый прямоугольник, который полностью покрывает все места
      const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      overlayRect.setAttribute('x', overlay.minX)
      overlayRect.setAttribute('y', overlay.minY)
      overlayRect.setAttribute('width', overlay.maxX - overlay.minX)
      overlayRect.setAttribute('height', overlay.maxY - overlay.minY)
      overlayRect.setAttribute('fill', 'transparent')
      overlayRect.setAttribute('stroke', 'none')
      overlayRect.setAttribute('data-section-id', String(overlay.sectionId))
      overlayRect.setAttribute('data-temp-overlay', 'true') // Маркер временного элемента
      overlayRect.style.cursor = 'pointer'
      overlayRect.style.pointerEvents = 'all' // Перехватываем все клики
      
      // Добавляем невидимый элемент в самый конец, чтобы он был поверх всех мест
      // В SVG порядок элементов определяет их z-index (последний элемент - поверх всех)
      svgRef.current.appendChild(overlayRect)
      
      // Добавляем обработчики к невидимому элементу ПОСЛЕ добавления в DOM
      addSectionHandlers(overlayRect, String(overlay.sectionId))
    })
    
    // Невидимые элементы для мест на балконах
    balconySeatsOverlays.forEach((overlay) => {
      // Создаем невидимый прямоугольник, который полностью покрывает все места на балконе
      const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      overlayRect.setAttribute('x', overlay.minX)
      overlayRect.setAttribute('y', overlay.minY)
      overlayRect.setAttribute('width', overlay.maxX - overlay.minX)
      overlayRect.setAttribute('height', overlay.maxY - overlay.minY)
      overlayRect.setAttribute('fill', 'transparent')
      overlayRect.setAttribute('stroke', 'none')
      overlayRect.setAttribute('data-section-id', String(overlay.sectionId))
      overlayRect.setAttribute('data-temp-overlay', 'true') // Маркер временного элемента
      overlayRect.style.cursor = 'pointer'
      overlayRect.style.pointerEvents = 'all' // Перехватываем все клики
      
      // Добавляем невидимый элемент в самый конец, чтобы он был поверх всех мест
      svgRef.current.appendChild(overlayRect)
      
      // Добавляем обработчики к невидимому элементу ПОСЛЕ добавления в DOM
      addSectionHandlers(overlayRect, String(overlay.sectionId))
    })
    
    // Невидимые элементы для мест на балконах
    balconySeatsOverlays.forEach((overlay) => {
      // Создаем невидимый прямоугольник, который полностью покрывает все места на балконе
      const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      overlayRect.setAttribute('x', overlay.minX)
      overlayRect.setAttribute('y', overlay.minY)
      overlayRect.setAttribute('width', overlay.maxX - overlay.minX)
      overlayRect.setAttribute('height', overlay.maxY - overlay.minY)
      overlayRect.setAttribute('fill', 'transparent')
      overlayRect.setAttribute('stroke', 'none')
      overlayRect.setAttribute('data-section-id', String(overlay.sectionId))
      overlayRect.setAttribute('data-temp-overlay', 'true') // Маркер временного элемента
      overlayRect.style.cursor = 'pointer'
      overlayRect.style.pointerEvents = 'all' // Перехватываем все клики
      
      // Добавляем невидимый элемент в самый конец, чтобы он был поверх всех мест
      svgRef.current.appendChild(overlayRect)
      
      // Добавляем обработчики к невидимому элементу ПОСЛЕ добавления в DOM
      addSectionHandlers(overlayRect, String(overlay.sectionId))
    })
    
    // Вызываем notifyChange только один раз в конце
    // Используем debounce для предотвращения зацикливания
    if (notifyChangeTimeoutRef.current) {
      clearTimeout(notifyChangeTimeoutRef.current)
    }
    notifyChangeTimeoutRef.current = setTimeout(() => {
    notifyChange()
    }, 100)
  }, [sections, categories, notifyChange, addSectionHandlers, removeSectionHandlers])
  

  // Обновление схемы при изменении секций (с debounce для предотвращения глюков при быстрых изменениях)
  useEffect(() => {
    // Не перерисовываем схему во время перетаскивания
    if (draggingTableId) {
      return
    }
    
    // Очищаем предыдущий таймер
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current)
    }
    
    // Устанавливаем новый таймер для debounce
    generateTimeoutRef.current = setTimeout(() => {
      generateScheme()
    }, 50) // Небольшая задержка для batch обновлений
    
    // Очистка при размонтировании
    return () => {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current)
      }
    }
  }, [sections, generateScheme, draggingTableId])

  // Добавление секции
  const handleAddSection = useCallback((type, position = null) => {
    // Проверка для сцены: нельзя создать вторую сцену
    if (type === SECTION_TYPES.STAGE) {
      const existingStage = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (existingStage) {
        // Кнопка должна быть неактивна, поэтому просто возвращаемся
        return
      }
    }
    
    // Генерируем дефолтное название на основе типа и позиции
    let defaultLabel = ''
    if (type === SECTION_TYPES.STAGE) {
      defaultLabel = 'STAGE'
    } else if (type === SECTION_TYPES.DANCEFLOOR) {
      // Для танцполов считаем количество существующих танцполов для порядковой нумерации
      const existingDancefloors = sections.filter(s => s.type === SECTION_TYPES.DANCEFLOOR)
      const dancefloorNumber = existingDancefloors.length + 1
      defaultLabel = `DANCE FLOOR ${dancefloorNumber}`
    } else if (type === SECTION_TYPES.ROWS) {
      // Для рядов считаем количество существующих секций рядов
      const existingRows = sections.filter(s => s.type === SECTION_TYPES.ROWS)
      const rowsNumber = existingRows.length + 1
      defaultLabel = `ROWS ${rowsNumber}`
    } else if (type === SECTION_TYPES.BALCONY) {
      // Для балконов считаем общее количество балконов (позиция будет определена при перетаскивании)
      const existingBalconies = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
      const balconyNumber = existingBalconies.length + 1
        defaultLabel = `BALCONY ${balconyNumber}`
    } else if (type === SECTION_TYPES.BAR) {
      defaultLabel = 'BAR'
    } else if (type === SECTION_TYPES.TABLE) {
      // Для обычных столов (не внутри балконов) считаем количество существующих обычных столов для порядковой нумерации
      const existingTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && !s.balconyId)
      const tableNumber = existingTables.length + 1
      defaultLabel = `TABLE ${tableNumber}`
    } else if (type === SECTION_TYPES.SOFA) {
      // Для обычных диванов (не внутри балконов) считаем количество существующих обычных диванов для порядковой нумерации
      const existingSofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && !s.balconyId)
      const sofaNumber = existingSofas.length + 1
      defaultLabel = `SOFA ${sofaNumber}`
    }
    
    // Используем название как категорию (в нижнем регистре для категории)
    // НО: для сцены и бара категорию не создаём
    let categoryValue = null
    if (type !== SECTION_TYPES.STAGE && type !== SECTION_TYPES.BAR) {
      const defaultCategory = defaultLabel.toLowerCase().replace(/\s+/g, '_')
      categoryValue = defaultCategory
      
      // Проверяем, существует ли категория, если нет - создаем её
      if (!categories.find(c => c.value === defaultCategory)) {
        if (onCategoriesChange) {
          const newCategory = {
            value: defaultCategory,
            label: defaultLabel,
            color: '#cccccc',
            icon: null
          }
          onCategoriesChange([...categories, newCategory])
        }
      }
    }
    
    const newSection = {
      id: Date.now(),
      type,
      label: defaultLabel,
      category: categoryValue, // У сцены будет null
      color: '#cccccc',
      ...(type === SECTION_TYPES.ROWS && { 
        rows: [{
          rowNumber: 1,
          seatsCount: 10
        }]
      }),
      ...(type === SECTION_TYPES.STAGE && { 
        stageWidth: 900, // Ширина сцены в пикселях по умолчанию
        stageHeight: 80 // Высота сцены в пикселях по умолчанию
      }),
      ...(type === SECTION_TYPES.DANCEFLOOR && { 
        count: 0, 
        heightPercent: 25, // 25% от высоты SVG по умолчанию
        widthPercent: 100 // 100% от ширины SVG по умолчанию
      }),
      ...(type === SECTION_TYPES.BALCONY && { 
        position: null, // Позиция определяется при перетаскивании (left/right/middle)
        balconyType: 'seats', // 'seats', 'dancefloor' или 'tables'
        // По умолчанию балкон создается без мест - места настраиваются в модальном окне
        seatsPerRow: 0,
        rowsCount: 0,
        widthPercent: 12, // 12% от ширины SVG для left/right (будет пересчитано при определении позиции)
        heightPercent: null, // Для middle будет установлено при определении позиции
        seatColor: '#ffaa00',
        count: 0, // Для танцпольного балкона
        tableId: null, // ID стола внутри балкона (если balconyType === 'tables')
        x: null, // Будет установлено в generateScheme (центр по умолчанию)
        y: null // Будет установлено в generateScheme (центр по умолчанию)
      }),
      ...(type === SECTION_TYPES.BAR && { 
        width: 100, 
        height: 80,
        x: null, // Будет установлено в generateScheme (центр по умолчанию)
        y: null // Будет установлено в generateScheme (центр по умолчанию)
      }),
      ...(type === SECTION_TYPES.TABLE && { 
        shape: 'round', // 'round', 'square', 'rectangular'
        seatsTop: 0, // Места сверху
        seatsRight: 0, // Места справа
        seatsBottom: 0, // Места снизу
        seatsLeft: 0, // Места слева
        tableSize: 60, // Размер стола (диаметр для круглого, сторона для квадратного, ширина для прямоугольного)
        tableHeight: 40, // Высота для прямоугольного стола
        x: null, // Будет установлено в generateScheme (центр по умолчанию)
        y: null, // Будет установлено в generateScheme (центр по умолчанию)
        seatColor: '#ffaa00'
      }),
      ...(type === SECTION_TYPES.SOFA && { 
        sofaWidth: 120, // Ширина дивана
        sofaHeight: 60, // Высота дивана
        seatsCount: 0, // Количество мест внутри дивана
        x: null, // Будет установлено в generateScheme (центр по умолчанию)
        y: null, // Будет установлено в generateScheme (центр по умолчанию)
        seatColor: '#ffaa00'
      })
    }
    setSections(prev => [...prev, newSection])
    setActiveSection(newSection.id)
  }, [categories, sections, onCategoriesChange])

  // Удаление секции
  const handleDeleteSection = useCallback((id) => {
    setSections(prev => {
      // Находим удаляемую секцию, чтобы получить её категорию
      const deletedSection = prev.find(s => s.id === id)
      const remainingSections = prev.filter(s => s.id !== id)
      
      // Если у удаленной секции была категория, проверяем, используется ли она в других секциях
      if (deletedSection && deletedSection.category && onCategoriesChange) {
        const categoryStillUsed = remainingSections.some(s => s.category === deletedSection.category)
        
        // Если категория больше не используется, удаляем её из списка категорий
        if (!categoryStillUsed) {
          // Используем setTimeout, чтобы обновление категорий произошло после обновления секций
          setTimeout(() => {
            onCategoriesChange(prevCategories => prevCategories.filter(c => c.value !== deletedSection.category))
          }, 0)
        }
      }
      
      return remainingSections
    })
    
    if (activeSection === id) {
      setActiveSection(null)
    }
  }, [activeSection, onCategoriesChange])

  // Добавление ряда
  const handleAddRow = useCallback((sectionId) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId && s.type === SECTION_TYPES.ROWS) {
        const rows = s.rows || []
        const newRow = {
          rowNumber: rows.length + 1,
          seatsCount: 10
        }
        return { ...s, rows: [...rows, newRow] }
      }
      return s
    }))
  }, [])

  // Удаление ряда
  const handleDeleteRow = useCallback((sectionId, rowIndex) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId && s.type === SECTION_TYPES.ROWS) {
        const rows = [...(s.rows || [])]
        rows.splice(rowIndex, 1)
        return { ...s, rows }
      }
      return s
    }))
  }, [])

  const selectedSection = sections.find(s => s.id === activeSection)
  const modalSection = sections.find(s => s.id === modalSectionId)

  // При открытии модального окна сохраняем исходные данные
  useEffect(() => {
    if (isModalVisible && modalSectionId && modalSection) {
      // Глубокое копирование секции для временного состояния
      const data = JSON.parse(JSON.stringify(modalSection))
      
      // Устанавливаем значения по умолчанию для сцены, если они не заданы
      if (modalSection.type === SECTION_TYPES.STAGE) {
        if (!data.stageWidth) {
          const viewBox = svgRef.current?.getAttribute('viewBox') || DEFAULT_VIEWBOX
          const [, , vbWidth] = viewBox.split(' ').map(Number)
          data.stageWidth = vbWidth - 100
        }
        if (!data.stageHeight) {
          data.stageHeight = 80
        }
      }
      
      // Столы внутри балконов сохраняют свои названия и категории с привязкой к балкону
      
      // Если это балкон со столом, загружаем данные стола в форму
      if (modalSection.type === SECTION_TYPES.BALCONY && modalSection.balconyType === 'tables') {
        const balconyTable = sections.find(s => s.type === SECTION_TYPES.TABLE && s.balconyId === modalSectionId)
        if (balconyTable) {
          // Загружаем данные стола в форму балкона для редактирования
          data.tableShape = balconyTable.shape || 'round'
          data.tableSize = balconyTable.tableSize || 60
          data.tableHeight = balconyTable.tableHeight || 40
          data.tableSeatsTop = balconyTable.seatsTop || 0
          data.tableSeatsRight = balconyTable.seatsRight || 0
          data.tableSeatsBottom = balconyTable.seatsBottom || 0
          data.tableSeatsLeft = balconyTable.seatsLeft || 0
        }
      }
      
      setModalSectionData(data)
    } else if (!isModalVisible) {
      // Очищаем временные данные при закрытии
      setModalSectionData(null)
    }
  }, [isModalVisible, modalSectionId, modalSection, sections])

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuVisible && !e.target.closest(`.${s.sectionActionMenu}`)) {
        closeActionMenu()
      }
    }

    if (actionMenuVisible) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [actionMenuVisible, closeActionMenu, s.sectionActionMenu])

  return (
    <div className={s.builder}>
      <Toolbar
        sections={sections}
        onAddSection={handleAddSection}
        onViewMode={onViewMode}
        onBackToSelection={onBackToSelection}
        onDeleteScheme={() => {
                    setSections([])
                    setActiveSection(null)
        }}
        svgRef={svgRef}
        onSchemeChange={onSchemeChange}
        onSectionsChange={onSectionsChange}
        setActiveSection={setActiveSection}
      />
      
      <div className={s.content}>
        <div className={s.canvas}>
          <div ref={containerRef} />
        </div>
        
        <Sidebar
          sections={sections}
          activeSection={activeSection}
          onSectionClick={(id) => {
            setModalSectionId(id)
                setIsModalVisible(true)
              }}
          onSectionDelete={handleDeleteSection}
        />
      </div>
      
      {/* Меню выбора действия для секций */}
      <SectionActionMenu
        visible={actionMenuVisible}
        position={actionMenuPosition}
        onDrag={handleDragSection}
        onConfigure={handleConfigureSection}
        onClose={closeActionMenu}
        isDraggable={actionMenuSectionId ? (() => {
          const section = sections.find(s => s.id === actionMenuSectionId)
          if (!section) return false
          
          // Для балконов с установленной позицией перетаскивание недоступно
          if (section.type === SECTION_TYPES.BALCONY && section.position) {
            return false
          }
          
          // Для остальных типов секций проверяем, поддерживают ли они перетаскивание
          return (
            section.type === SECTION_TYPES.TABLE || 
            section.type === SECTION_TYPES.BAR ||
            section.type === SECTION_TYPES.ROWS ||
            section.type === SECTION_TYPES.BALCONY ||
            section.type === SECTION_TYPES.DANCEFLOOR ||
            section.type === SECTION_TYPES.SOFA
          )
        })() : false}
      />
      
      {/* Модальное окно для редактирования секции */}
      <SectionModal
        open={isModalVisible}
        section={modalSection}
        formData={modalSectionData}
        setFormData={setModalSectionData}
        onOk={() => {
          // Применяем изменения только при нажатии "Сохранить"
          if (modalSectionData && modalSectionId) {
            // Находим исходную секцию для сохранения координат стола
            const originalSection = sections.find(s => s.id === modalSectionId)
            if (originalSection && (originalSection.type === SECTION_TYPES.TABLE || originalSection.type === SECTION_TYPES.SOFA)) {
              // Сохраняем координаты стола/дивана из исходной секции, если они были заданы
              const updatedData = {
                ...modalSectionData,
                x: modalSectionData.x !== undefined && modalSectionData.x !== null 
                  ? modalSectionData.x 
                  : (originalSection.x !== undefined && originalSection.x !== null ? originalSection.x : null),
                y: modalSectionData.y !== undefined && modalSectionData.y !== null 
                  ? modalSectionData.y 
                  : (originalSection.y !== undefined && originalSection.y !== null ? originalSection.y : null)
              }
              handleUpdateSection(modalSectionId, updatedData)
            } else if (originalSection && originalSection.type === SECTION_TYPES.TABLE && originalSection.balconyId) {
              // Для стола внутри балкона формируем название и категорию с привязкой к балкону
              const balcony = sections.find(s => s.id === originalSection.balconyId)
              if (balcony) {
                const position = balcony.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                // Определяем номер балкона (из названия балкона или по количеству балконов с такой же позицией)
                let balconyNumber = 1
                if (balcony.label) {
                  // Пытаемся извлечь номер из названия балкона (например, "BALCONY L 1" -> 1)
                  const match = balcony.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
                  } else {
                    // Если номера нет в названии, вычисляем по количеству балконов с такой же позицией
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== balcony.id
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  // Если названия нет, вычисляем по количеству балконов с такой же позицией
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== balcony.id
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                // Находим все столы этого балкона для правильной нумерации
                const balconyTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === originalSection.balconyId)
                const tableIndex = balconyTables.findIndex(t => t.id === originalSection.id)
                const tableNumber = tableIndex >= 0 ? tableIndex + 1 : balconyTables.length + 1
                
                // Формируем название: BALCONY L 1 TABLE 1, BALCONY R 2 TABLE 1 и т.д.
                const tableLabel = `BALCONY ${positionLabel} ${balconyNumber} TABLE ${tableNumber}`
                const tableCategoryName = `${balcony.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_table_${tableNumber}`
                
                // Создаем категорию для стола балкона, если её нет
                if (!categories.find(c => c.value === tableCategoryName)) {
                  if (onCategoriesChange) {
                    const newCategory = {
                      value: tableCategoryName,
                      label: tableLabel,
                      color: '#cccccc',
                      icon: null
                    }
                    onCategoriesChange(prev => {
                      if (!prev.find(c => c.value === tableCategoryName)) {
                        return [...prev, newCategory]
                      }
                      return prev
                    })
                  }
                }
                
                const updatedData = {
                  ...modalSectionData,
                  label: tableLabel,
                  category: tableCategoryName,
                  balconyId: originalSection.balconyId // Сохраняем привязку к балкону
                }
                handleUpdateSection(modalSectionId, updatedData)
              } else {
                handleUpdateSection(modalSectionId, modalSectionData)
              }
            } else if (originalSection && originalSection.type === SECTION_TYPES.SOFA && originalSection.balconyId) {
              // Для дивана внутри балкона формируем название и категорию с привязкой к балкону
              const balcony = sections.find(s => s.id === originalSection.balconyId)
              if (balcony) {
                const position = balcony.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                // Определяем номер балкона (из названия балкона или по количеству балконов с такой же позицией)
                let balconyNumber = 1
                if (balcony.label) {
                  // Пытаемся извлечь номер из названия балкона (например, "BALCONY L 1" -> 1)
                  const match = balcony.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
                  } else {
                    // Если номера нет в названии, вычисляем по количеству балконов с такой же позицией
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== balcony.id
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  // Если названия нет, вычисляем по количеству балконов с такой же позицией
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== balcony.id
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                // Находим все диваны этого балкона для правильной нумерации
                const balconySofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === originalSection.balconyId)
                const sofaIndex = balconySofas.findIndex(t => t.id === originalSection.id)
                const sofaNumber = sofaIndex >= 0 ? sofaIndex + 1 : balconySofas.length + 1
                
                // Формируем название: BALCONY L 1 SOFA 1, BALCONY R 2 SOFA 1 и т.д.
                const sofaLabel = `BALCONY ${positionLabel} ${balconyNumber} SOFA ${sofaNumber}`
                const sofaCategoryName = `${balcony.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_sofa_${sofaNumber}`
                
                // Создаем категорию для дивана балкона, если её нет
                if (!categories.find(c => c.value === sofaCategoryName)) {
                  if (onCategoriesChange) {
                    const newCategory = {
                      value: sofaCategoryName,
                      label: sofaLabel,
                      color: '#cccccc',
                      icon: null
                    }
                    onCategoriesChange(prev => {
                      if (!prev.find(c => c.value === sofaCategoryName)) {
                        return [...prev, newCategory]
                      }
                      return prev
                    })
                  }
                }
                
                const updatedData = {
                  ...modalSectionData,
                  label: sofaLabel,
                  category: sofaCategoryName,
                  balconyId: originalSection.balconyId // Сохраняем привязку к балкону
                }
                handleUpdateSection(modalSectionId, updatedData)
              } else {
                handleUpdateSection(modalSectionId, modalSectionData)
              }
            } else if (originalSection && originalSection.type === SECTION_TYPES.BALCONY) {
              // Для балкона
              const updatedData = { ...modalSectionData }
              
              // Если выбран тип "dancefloor", обновляем название и категорию
              if (modalSectionData.balconyType === 'dancefloor') {
                const position = originalSection.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                // Находим все балконы с такой же позицией для правильной нумерации
                const samePositionBalconies = sections.filter(s => 
                  s.type === SECTION_TYPES.BALCONY && 
                  s.position === position && 
                  s.id !== originalSection.id
                )
                const balconyNumber = samePositionBalconies.length + 1
                
                // Формируем название: BALCONY L 1 DANCE FLOOR
                const balconyLabel = `BALCONY ${positionLabel} ${balconyNumber} DANCE FLOOR`
                const balconyCategoryName = `balcony_${positionLabel.toLowerCase()}_${balconyNumber}_dance_floor`
                
                // Создаем категорию для балкона с танцполом, если её нет
                if (!categories.find(c => c.value === balconyCategoryName)) {
                  if (onCategoriesChange) {
                    const newCategory = {
                      value: balconyCategoryName,
                      label: balconyLabel,
                      color: '#cccccc',
                      icon: null
                    }
                    onCategoriesChange(prev => {
                      if (!prev.find(c => c.value === balconyCategoryName)) {
                        return [...prev, newCategory]
                      }
                      return prev
                    })
                  }
                }
                
                updatedData.label = balconyLabel
                updatedData.category = balconyCategoryName
              }
              
              // Если выбран тип "tables", создаем или обновляем секцию стола
              if (modalSectionData.balconyType === 'tables') {
                const position = originalSection.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                // Определяем номер балкона (из названия балкона или по количеству балконов с такой же позицией)
                let balconyNumber = 1
                if (originalSection.label) {
                  // Пытаемся извлечь номер из названия балкона (например, "BALCONY L 1" -> 1)
                  const match = originalSection.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
                  } else {
                    // Если номера нет в названии, вычисляем по количеству балконов с такой же позицией
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== modalSectionId
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  // Если названия нет, вычисляем по количеству балконов с такой же позицией
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== modalSectionId
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                // Получаем количество столов
                const tablesCount = modalSectionData.tablesCount || 1
                
                // Находим все существующие столы для этого балкона
                const existingTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === modalSectionId)
                
                // Удаляем лишние столы, если их больше, чем нужно
                if (existingTables.length > tablesCount) {
                  const tablesToDelete = existingTables.slice(tablesCount)
                  setSections(prev => prev.filter(s => !tablesToDelete.some(t => t.id === s.id)))
                }
                
                // Обновляем или создаем столы
                for (let i = 0; i < tablesCount; i++) {
                  const tableNumber = i + 1 // Нумерация с 1 для каждого балкона отдельно
                  const tableLabel = `BALCONY ${positionLabel} ${balconyNumber} TABLE ${tableNumber}`
                  const tableCategoryName = `${modalSectionData.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_table_${tableNumber}`
                  
                  const existingTable = existingTables[i]
                  
                  if (existingTable) {
                    // Обновляем существующий стол (настройки будут в модальном окне стола)
                    handleUpdateSection(existingTable.id, {
                      ...existingTable,
                      label: tableLabel,
                      category: tableCategoryName
                    })
                  } else {
                    // Создаем новый стол с дефолтными настройками
                    const newTable = {
                      id: Date.now() + i,
                      type: SECTION_TYPES.TABLE,
                      label: tableLabel,
                      category: tableCategoryName,
                      color: modalSectionData.color || '#8B4513',
                      seatColor: modalSectionData.seatColor || '#ffaa00',
                      shape: 'round', // Дефолтная форма
                      tableSize: 60, // Дефолтный размер
                      tableHeight: 40, // Дефолтная высота
                      seatsTop: 0, // По умолчанию без мест
                      seatsRight: 0,
                      seatsBottom: 0,
                      seatsLeft: 0,
                      balconyId: modalSectionId, // Привязка к балкону
                      x: null, // Позиция будет вычислена при рендеринге
                      y: null
                    }
                    setSections(prev => [...prev, newTable])
                  }
                  
                  // Создаем категорию для стола, если её нет
                  if (!categories.find(c => c.value === tableCategoryName)) {
                    if (onCategoriesChange) {
                      const newCategory = {
                        value: tableCategoryName,
                        label: tableLabel,
                        color: '#cccccc',
                        icon: null
                      }
                      onCategoriesChange(prev => {
                        if (!prev.find(c => c.value === tableCategoryName)) {
                          return [...prev, newCategory]
                        }
                        return prev
                      })
                    }
                  }
                }
              } else if (modalSectionData.balconyType === 'sofas') {
                // Если выбран тип "sofas", создаем или обновляем секцию дивана
                const position = originalSection.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                // Определяем номер балкона (из названия балкона или по количеству балконов с такой же позицией)
                let balconyNumber = 1
                if (originalSection.label) {
                  // Пытаемся извлечь номер из названия балкона (например, "BALCONY L 1" -> 1)
                  const match = originalSection.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
              } else {
                    // Если номера нет в названии, вычисляем по количеству балконов с такой же позицией
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== modalSectionId
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  // Если названия нет, вычисляем по количеству балконов с такой же позицией
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== modalSectionId
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                // Получаем количество диванов
                const sofasCount = modalSectionData.sofasCount || 1
                
                // Находим все существующие диваны для этого балкона
                const existingSofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === modalSectionId)
                
                // Удаляем лишние диваны, если их больше, чем нужно
                if (existingSofas.length > sofasCount) {
                  const sofasToDelete = existingSofas.slice(sofasCount)
                  setSections(prev => prev.filter(s => !sofasToDelete.some(t => t.id === s.id)))
                }
                
                // Обновляем или создаем диваны
                for (let i = 0; i < sofasCount; i++) {
                  const sofaNumber = i + 1 // Нумерация с 1 для каждого балкона отдельно
                  const sofaLabel = `BALCONY ${positionLabel} ${balconyNumber} SOFA ${sofaNumber}`
                  const sofaCategoryName = `${modalSectionData.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_sofa_${sofaNumber}`
                  
                  const existingSofa = existingSofas[i]
                  
                  if (existingSofa) {
                    // Обновляем существующий диван (настройки будут в модальном окне дивана)
                    handleUpdateSection(existingSofa.id, {
                      ...existingSofa,
                      label: sofaLabel,
                      category: sofaCategoryName
                    })
                  } else {
                    // Создаем новый диван с дефолтными настройками
                    // Для боковых балконов (left/right) размеры перевернуты (60x120), для нижних (middle) - стандартные (120x60)
                    const isSideBalcony = position === 'left' || position === 'right'
                    const defaultSofaWidth = isSideBalcony ? 60 : 120
                    const defaultSofaHeight = isSideBalcony ? 120 : 60
                    
                    const newSofa = {
                      id: Date.now() + i,
                      type: SECTION_TYPES.SOFA,
                      label: sofaLabel,
                      category: sofaCategoryName,
                      color: modalSectionData.color || '#8B4513',
                      seatColor: modalSectionData.seatColor || '#ffaa00',
                      sofaWidth: defaultSofaWidth,
                      sofaHeight: defaultSofaHeight,
                      seatsCount: 0, // По умолчанию без мест
                      balconyId: modalSectionId, // Привязка к балкону
                      x: null, // Позиция будет вычислена при рендеринге
                      y: null
                    }
                    setSections(prev => [...prev, newSofa])
                  }
                  
                  // Создаем категорию для дивана, если её нет
                  if (!categories.find(c => c.value === sofaCategoryName)) {
                    if (onCategoriesChange) {
                      const newCategory = {
                        value: sofaCategoryName,
                        label: sofaLabel,
                        color: '#cccccc',
                        icon: null
                      }
                      onCategoriesChange(prev => {
                        if (!prev.find(c => c.value === sofaCategoryName)) {
                          return [...prev, newCategory]
                        }
                        return prev
                      })
                    }
                  }
                }
              } else {
                // Если тип не "tables" и не "sofas", удаляем все столы и диваны этого балкона
                const tablesToDelete = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === modalSectionId)
                const sofasToDelete = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === modalSectionId)
                if (tablesToDelete.length > 0 || sofasToDelete.length > 0) {
                  setSections(prev => prev.filter(s => !tablesToDelete.some(t => t.id === s.id) && !sofasToDelete.some(t => t.id === s.id)))
                }
              }
              
              handleUpdateSection(modalSectionId, updatedData)
            } else {
              handleUpdateSection(modalSectionId, modalSectionData)
            }
          }
          setIsModalVisible(false)
          setModalSectionId(null)
          setModalSectionData(null)
        }}
        onCancel={() => {
          // При отмене просто закрываем модальное окно без изменений
          setIsModalVisible(false)
          setModalSectionId(null)
          setModalSectionData(null)
        }}
        categories={categories}
        sections={sections}
        onCategoriesChange={onCategoriesChange}
      />
    </div>
  )
}
