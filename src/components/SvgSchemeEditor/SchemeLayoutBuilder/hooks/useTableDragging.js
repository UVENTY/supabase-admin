import { useEffect, useRef } from 'react'
import { App } from 'antd'
import { SECTION_TYPES, DEFAULT_VIEWBOX } from '../constants'
import { snapToGrid } from '../utils'

export const useTableDragging = ({
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
  categories = [],
  onCategoriesChange = null,
  closeActionMenu = null,
  setJustFinishedDragging = null
}) => {
  const { message } = App.useApp()
  // Флаг для отслеживания первого движения мыши
  const isFirstMoveRef = useRef(false)
  
  useEffect(() => {
    if (!draggingTableId) {
      isFirstMoveRef.current = false
      return
    }
    
    // Если модальное окно открыто, прекращаем перетаскивание
    if (isModalVisible) {
      setDraggingTableId(null)
      setDragStartPos({ x: 0, y: 0 })
      setDragStartTablePos({ x: 0, y: 0 })
      return
    }
    
    const svg = svgRef.current
    if (!svg) {
      return
    }
    
    const section = sections.find(s => s.id === draggingTableId)
    if (!section || (
      section.type !== SECTION_TYPES.TABLE && 
      section.type !== SECTION_TYPES.BAR &&
      section.type !== SECTION_TYPES.ROWS &&
      section.type !== SECTION_TYPES.BALCONY &&
      section.type !== SECTION_TYPES.DANCEFLOOR &&
      section.type !== SECTION_TYPES.SOFA
    )) {
      return
    }
    
    // Проверяем, является ли стол столом внутри балкона
    const isTableInBalcony = section.type === SECTION_TYPES.TABLE && section.balconyId
    // Проверяем, является ли диван диваном внутри балкона
    const isSofaInBalcony = section.type === SECTION_TYPES.SOFA && section.balconyId
    let balconySection = null
    if (isTableInBalcony || isSofaInBalcony) {
      balconySection = sections.find(s => s.id === section.balconyId)
    }
    
    // Для рядов и балконов удаляем временный элемент-обводку при начале перетаскивания
    let tempOverlayElement = null
    if (section.type === SECTION_TYPES.ROWS || section.type === SECTION_TYPES.BALCONY) {
      tempOverlayElement = svg.querySelector(`[data-section-id="${draggingTableId}"][data-temp-overlay="true"]`)
      if (tempOverlayElement) {
        tempOverlayElement.remove()
      }
    }
    
    // Сохраняем начальные позиции всех элементов секции для рядов, балконов и танцпола
    const sectionElementsInitialPos = new Map()
    let sectionElementsForDragging = []
    const isUnpositionedBalcony = section.type === SECTION_TYPES.BALCONY && !section.position
    const isDancefloor = section.type === SECTION_TYPES.DANCEFLOOR
    if (section.type === SECTION_TYPES.ROWS || (section.type === SECTION_TYPES.BALCONY && !isUnpositionedBalcony) || isDancefloor) {
      const selector = `[data-section-id="${draggingTableId}"]`
      sectionElementsForDragging = Array.from(svg.querySelectorAll(selector))
      sectionElementsForDragging.forEach((el) => {
        if (el.tagName === 'circle') {
          const cx = parseFloat(el.getAttribute('cx') || 0)
          const cy = parseFloat(el.getAttribute('cy') || 0)
          sectionElementsInitialPos.set(el, { x: cx, y: cy })
        } else if (el.tagName === 'rect') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          const width = parseFloat(el.getAttribute('width') || 0)
          const height = parseFloat(el.getAttribute('height') || 0)
          // Сохраняем центр прямоугольника для танцпола
          sectionElementsInitialPos.set(el, { x: x + width / 2, y: y + height / 2, width, height })
        } else if (el.tagName === 'text') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          sectionElementsInitialPos.set(el, { x, y })
        }
      })
    } else if (isUnpositionedBalcony) {
      // Для балконов без позиции сохраняем позицию rect и text
      const selector = `[data-section-id="${draggingTableId}"]`
      sectionElementsForDragging = Array.from(svg.querySelectorAll(selector))
      sectionElementsForDragging.forEach((el) => {
        if (el.tagName === 'rect') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          const width = parseFloat(el.getAttribute('width') || 0)
          const height = parseFloat(el.getAttribute('height') || 0)
          // Сохраняем центр прямоугольника
          sectionElementsInitialPos.set(el, { x: x + width / 2, y: y + height / 2, width, height })
        } else if (el.tagName === 'text') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          sectionElementsInitialPos.set(el, { x, y })
        }
      })
    }
    
    // Отключаем pointer-events для всех элементов кроме перетаскиваемого во время перетаскивания
    const allElements = svg.querySelectorAll('[data-section-id]')
    const originalPointerEvents = new Map()
    allElements.forEach(el => {
      if (el.getAttribute('data-section-id') !== String(draggingTableId)) {
        originalPointerEvents.set(el, el.style.pointerEvents)
        el.style.pointerEvents = 'none'
      }
    })
    
    // Меняем курсор на move для всего документа при перетаскивании (для всех типов секций)
    const originalBodyCursor = document.body.style.cursor
    document.body.style.cursor = 'move'
    
    // Также меняем курсор для элементов секции (для всех типов секций)
    const originalElementCursors = new Map()
    const allSectionElements = svg.querySelectorAll(`[data-section-id="${draggingTableId}"]`)
    allSectionElements.forEach(el => {
      originalElementCursors.set(el, el.style.cursor)
      el.style.cursor = 'move'
    })
    
    const handleGlobalMouseMove = (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      const point = svg.createSVGPoint()
      point.x = e.clientX
      point.y = e.clientY
      const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse())
      
      // Для рядов и балконов при первом движении мыши устанавливаем dragStartPos в центр элементов
      // чтобы курсор был по центру элемента
      if ((section.type === SECTION_TYPES.ROWS || (section.type === SECTION_TYPES.BALCONY && section.position)) && !isFirstMoveRef.current) {
        // Вычисляем центр элементов на основе их текущих позиций
        if (sectionElementsInitialPos.size > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          sectionElementsInitialPos.forEach((pos, el) => {
            if (el.tagName === 'circle') {
              const r = parseFloat(el.getAttribute('r') || 0)
              minX = Math.min(minX, pos.x - r)
              maxX = Math.max(maxX, pos.x + r)
              minY = Math.min(minY, pos.y - r)
              maxY = Math.max(maxY, pos.y + r)
            } else if (el.tagName === 'text') {
              minX = Math.min(minX, pos.x)
              maxX = Math.max(maxX, pos.x)
              minY = Math.min(minY, pos.y)
              maxY = Math.max(maxY, pos.y)
            }
          })
          if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
            const centerX = (minX + maxX) / 2
            const centerY = (minY + maxY) / 2
            // Устанавливаем dragStartPos в центр элементов, чтобы курсор был по центру
            setDragStartPos({ x: centerX, y: centerY })
            isFirstMoveRef.current = true
            // Возвращаемся, чтобы не обрабатывать это движение как перетаскивание
            return
          }
        }
      }
      
      // Вычисляем новую позицию с учетом смещения
      const deltaX = svgPoint.x - dragStartPos.x
      const deltaY = svgPoint.y - dragStartPos.y
      let newX = dragStartTablePos.x + deltaX
      let newY = dragStartTablePos.y + deltaY
      
      // Выравниваем по сетке (шаг 10px)
      newX = snapToGrid(newX)
      newY = snapToGrid(newY)
      
      // Получаем границы viewBox
      const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
      const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
      
      // Для рядов, балконов и танцпола вычисляем размеры bounding box для ограничения границ
      let rowsDeltaX = deltaX
      let rowsDeltaY = deltaY
      if (section.type === SECTION_TYPES.ROWS || section.type === SECTION_TYPES.BALCONY || isDancefloor) {
        // Вычисляем размеры bounding box всех элементов на основе их начальных позиций
        if (sectionElementsInitialPos.size > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          sectionElementsInitialPos.forEach((pos, el) => {
            if (el.tagName === 'circle') {
              const r = parseFloat(el.getAttribute('r') || 0)
              minX = Math.min(minX, pos.x - r)
              maxX = Math.max(maxX, pos.x + r)
              minY = Math.min(minY, pos.y - r)
              maxY = Math.max(maxY, pos.y + r)
            } else if (el.tagName === 'text') {
              minX = Math.min(minX, pos.x)
              maxX = Math.max(maxX, pos.x)
              minY = Math.min(minY, pos.y)
              maxY = Math.max(maxY, pos.y)
            }
          })
          if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
            const width = maxX - minX
            const height = maxY - minY
            const initialCenterX = (minX + maxX) / 2
            const initialCenterY = (minY + maxY) / 2
            
            // Вычисляем новые границы bounding box после перемещения
            const newMinX = newX - (initialCenterX - minX)
            const newMaxX = newX + (maxX - initialCenterX)
            const newMinY = newY - (initialCenterY - minY)
            const newMaxY = newY + (maxY - initialCenterY)
            
            // Ограничиваем так, чтобы весь bounding box оставался в пределах viewBox
            let limitedNewX = newX
            let limitedNewY = newY
            
            if (newMinX < vbX) {
              limitedNewX = vbX + (initialCenterX - minX)
            } else if (newMaxX > vbX + vbWidth) {
              limitedNewX = (vbX + vbWidth) - (maxX - initialCenterX)
            }
            
            if (newMinY < vbY) {
              limitedNewY = vbY + (initialCenterY - minY)
            } else if (newMaxY > vbY + vbHeight) {
              limitedNewY = (vbY + vbHeight) - (maxY - initialCenterY)
            }
            
            // Корректируем deltaX и deltaY с учетом ограничений
            rowsDeltaX = limitedNewX - dragStartTablePos.x
            rowsDeltaY = limitedNewY - dragStartTablePos.y
            newX = limitedNewX
            newY = limitedNewY
          }
        }
      }
      
      // Временно обновляем позицию для визуального отображения
      const element = svg.querySelector(`[data-section-id="${draggingTableId}"]`)
      if (!element) {
        // Если элемент не найден, возможно произошла перерисовка, прекращаем перетаскивание
        return
      }
      
      if (section.type === SECTION_TYPES.BAR) {
        // Для бара обновляем позицию прямоугольника
        const barWidth = section.width || 100
        const barHeight = section.height || 80
        
        // newX и newY - это центр бара, нужно ограничить так, чтобы весь бар был в пределах viewBox
        newX = Math.max(vbX + barWidth / 2, Math.min(vbX + vbWidth - barWidth / 2, newX))
        newY = Math.max(vbY + barHeight / 2, Math.min(vbY + vbHeight - barHeight / 2, newY))
        
        // Для рендеринга нужно вычесть половину размера, чтобы центрировать
        const renderX = newX - barWidth / 2
        const renderY = newY - barHeight / 2
        
        element.setAttribute('x', renderX)
        element.setAttribute('y', renderY)
        
        // Обновляем позицию текста (центр бара)
        const barText = element.nextElementSibling
        if (barText && barText.tagName === 'text') {
          barText.setAttribute('x', newX)
          barText.setAttribute('y', newY)
        }
      } else if (section.type === SECTION_TYPES.SOFA) {
        // Для дивана обновляем позицию прямоугольника
        const sofaWidth = section.sofaWidth || 120
        const sofaHeight = section.sofaHeight || 60
        
        // Если диван внутри балкона, ограничиваем перемещение границами балкона
        if (isSofaInBalcony && balconySection) {
          // Находим балкон на схеме и вычисляем его границы
          const balconyElement = svg.querySelector(`[data-section-id="${balconySection.id}"]`)
          if (balconyElement) {
            const balconyX = parseFloat(balconyElement.getAttribute('x') || 0)
            const balconyY = parseFloat(balconyElement.getAttribute('y') || 0)
            const balconyWidth = parseFloat(balconyElement.getAttribute('width') || 0)
            const balconyHeight = parseFloat(balconyElement.getAttribute('height') || 0)
            
            // Ограничиваем позицию дивана границами балкона
            newX = Math.max(balconyX + sofaWidth / 2, Math.min(balconyX + balconyWidth - sofaWidth / 2, newX))
            newY = Math.max(balconyY + sofaHeight / 2, Math.min(balconyY + balconyHeight - sofaHeight / 2, newY))
          } else {
            // Если балкон не найден, используем стандартные ограничения
            newX = Math.max(vbX + sofaWidth / 2, Math.min(vbX + vbWidth - sofaWidth / 2, newX))
            newY = Math.max(vbY + sofaHeight / 2, Math.min(vbY + vbHeight - sofaHeight / 2, newY))
          }
        } else {
          // Для обычных диванов ограничиваем границами SVG
          newX = Math.max(vbX + sofaWidth / 2, Math.min(vbX + vbWidth - sofaWidth / 2, newX))
          newY = Math.max(vbY + sofaHeight / 2, Math.min(vbY + vbHeight - sofaHeight / 2, newY))
        }
        
        // Для рендеринга нужно вычесть половину размера, чтобы центрировать
        const renderX = newX - sofaWidth / 2
        const renderY = newY - sofaHeight / 2
        
        element.setAttribute('x', renderX)
        element.setAttribute('y', renderY)
        
        // Обновляем позицию текста (сверху внутри дивана)
        const sofaText = element.nextElementSibling
        if (sofaText && sofaText.tagName === 'text') {
          const padding = 5
          const fontSize = 14
          const textTopPadding = 3
          const textY = newY - sofaHeight / 2 + padding + textTopPadding
          sofaText.setAttribute('x', newX)
          sofaText.setAttribute('y', textY)
        }
        
        // Пересчитываем позиции мест внутри дивана
        const seats = svg.querySelectorAll(`[data-sofa-id="${draggingTableId}"]`)
        const seatsCount = seats.length
        if (seatsCount > 0) {
          const padding = 5
          const fontSize = 14
          const textTopPadding = 3
          const textBottomPadding = 8
          const availableWidth = sofaWidth - padding * 2
          const availableHeight = sofaHeight - padding * 2
          
          const isVertical = sofaWidth < sofaHeight
          
          if (isVertical) {
            // Вертикальный диван - места в один столбец
            // Вычисляем позицию текста и область для мест
            const padding = 5
            const fontSize = 14
            const textTopPadding = 3
            const textBottomPadding = 8
            const textY = newY - sofaHeight / 2 + padding + textTopPadding
            const textBottomY = textY + fontSize
            const seatsAreaTop = textBottomY + textBottomPadding
            const seatsAreaBottom = newY + sofaHeight / 2 - padding
            const seatsAvailableHeight = Math.max(0, seatsAreaBottom - seatsAreaTop)
            
            let seatRadius = Math.min(availableWidth / 2, seatsAvailableHeight / seatsCount / 2, 5)
            seatRadius = Math.max(2, seatRadius)
            
            let spacing = 0
            if (seatsCount > 1) {
              const totalSeatsHeight = seatRadius * 2 * seatsCount
              const remainingSpace = seatsAvailableHeight - totalSeatsHeight
              spacing = remainingSpace > 0 ? remainingSpace / (seatsCount - 1) : 0
            }
            
            let startY = seatsAreaTop + seatRadius
            
            // Проверяем, что последнее место не выходит за пределы
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
            
            const startX = newX
            
            seats.forEach((seat, i) => {
              const seatX = startX
              const seatY = startY + i * (seatRadius * 2 + spacing)
              // Дополнительная проверка, что место не выходит за пределы
              if (seatY + seatRadius <= seatsAreaBottom && seatY - seatRadius >= seatsAreaTop) {
                seat.setAttribute('cx', seatX)
                seat.setAttribute('cy', seatY)
                seat.setAttribute('r', seatRadius)
              }
            })
          } else {
            // Горизонтальный диван - места в один ряд
            // Для горизонтальных диванов места располагаются по центру по вертикали
            const textY = newY - sofaHeight / 2 + padding + textTopPadding
            const textBottomY = textY + fontSize
            const minSeatsY = textBottomY + textBottomPadding
            const centerY = newY
            const seatsY = Math.max(minSeatsY, centerY)
            
            const seatRadius = Math.min(availableWidth / seatsCount / 2, availableHeight / 2, 6)
            const finalSeatRadius = Math.max(3, seatRadius)
            const spacing = seatsCount > 1 ? (availableWidth - finalSeatRadius * 2 * seatsCount) / (seatsCount - 1) : 0
            const startX = newX - sofaWidth / 2 + padding + finalSeatRadius
            const startY = seatsY
            
            seats.forEach((seat, i) => {
              const seatX = startX + i * (finalSeatRadius * 2 + spacing)
              const seatY = startY
              seat.setAttribute('cx', seatX)
              seat.setAttribute('cy', seatY)
              seat.setAttribute('r', finalSeatRadius)
            })
          }
        }
      } else if (isDancefloor) {
        // Для танцпола обновляем позицию прямоугольника
        // Вычисляем размеры танцпола из процентов
        const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
        const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
        const heightPercent = section.heightPercent || 25
        // Находим секцию сцены для расчета доступной высоты
        const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
        const availableHeightForDancefloor = vbHeight - (stageSection ? (stageSection.stageHeight || 80) : 0)
        const dancefloorHeight = (heightPercent / 100) * availableHeightForDancefloor
        const widthPercent = section.widthPercent || 100
        const dancefloorWidth = (widthPercent / 100) * vbWidth
        const maxWidth = vbWidth - 100
        const finalWidth = Math.min(dancefloorWidth, maxWidth)
        
        // newX и newY - это центр танцпола, нужно ограничить так, чтобы весь танцпол был в пределах viewBox
        newX = Math.max(vbX + finalWidth / 2, Math.min(vbX + vbWidth - finalWidth / 2, newX))
        newY = Math.max(vbY + dancefloorHeight / 2, Math.min(vbY + vbHeight - dancefloorHeight / 2, newY))
        
        // Для рендеринга нужно вычесть половину размера, чтобы центрировать
        const renderX = newX - finalWidth / 2
        const renderY = newY - dancefloorHeight / 2
        
        element.setAttribute('x', renderX)
        element.setAttribute('y', renderY)
        
        // Обновляем позицию текста (центр танцпола)
        const dancefloorText = element.nextElementSibling
        if (dancefloorText && dancefloorText.tagName === 'text') {
          dancefloorText.setAttribute('x', newX)
          dancefloorText.setAttribute('y', newY)
        }
      } else if (section.type === SECTION_TYPES.TABLE) {
        // Вычисляем максимальный радиус стола с местами для ограничения границ
        const tableSize = section.tableSize || 60
        const tableHeight = section.tableHeight || 40
        const seatRadius = 8 // Максимальный радиус места
        const seatDistanceFromEdge = 10
        
        let maxRadius = 0
        if (section.shape === 'round') {
          maxRadius = tableSize / 2 + seatDistanceFromEdge + seatRadius
        } else if (section.shape === 'square') {
          const halfSize = tableSize / 2
          const diagonalRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        } else { // rectangular
          const halfWidth = tableSize / 2
          const halfHeight = tableHeight / 2
          const diagonalRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        }
        
        // Если стол внутри балкона, ограничиваем перемещение границами балкона
        if (isTableInBalcony && balconySection) {
          // Находим балкон на схеме и вычисляем его границы
          const balconyElement = svg.querySelector(`[data-section-id="${balconySection.id}"]`)
          if (balconyElement) {
            const balconyX = parseFloat(balconyElement.getAttribute('x') || 0)
            const balconyY = parseFloat(balconyElement.getAttribute('y') || 0)
            const balconyWidth = parseFloat(balconyElement.getAttribute('width') || 0)
            const balconyHeight = parseFloat(balconyElement.getAttribute('height') || 0)
            
            // Ограничиваем позицию стола границами балкона (с учетом размера стола и мест)
            newX = Math.max(balconyX + maxRadius, Math.min(balconyX + balconyWidth - maxRadius, newX))
            newY = Math.max(balconyY + maxRadius, Math.min(balconyY + balconyHeight - maxRadius, newY))
          } else {
            // Если балкон не найден, используем стандартные ограничения
            newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
            newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
          }
        } else {
          // Для обычных столов ограничиваем границами SVG
          newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
          newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
        }
        
        if (element.tagName === 'circle') {
          element.setAttribute('cx', newX)
          element.setAttribute('cy', newY)
        } else {
          element.setAttribute('x', newX - tableSize / 2)
          element.setAttribute('y', newY - (section.shape === 'rectangular' ? tableHeight / 2 : tableSize / 2))
        }
        
        // Обновляем позиции мест вокруг стола
        const seats = svg.querySelectorAll(`[data-table-id="${draggingTableId}"]`)
        
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        
        // Получаем реальный радиус места из первого места (если есть)
        let actualSeatRadius = seatRadius
        if (seats.length > 0) {
          const firstSeat = seats[0]
          const r = firstSeat.getAttribute('r')
          if (r) {
            actualSeatRadius = parseFloat(r)
          }
        }
        
        if (section.shape === 'round') {
          // Для круглых столов - проверяем перекрытие
          const circleRadius = tableSize / 2 + seatDistanceFromEdge
          const halfSize = tableSize / 2
          const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
          
          // Проверяем, будут ли места перекрываться при размещении на сторонах
          const checkOverlap = (seatsCount) => {
            if (seatsCount <= 1) return false
            const spacing = tableSize / (seatsCount + 1)
            return spacing < 2 * actualSeatRadius
          }
          
          const hasOverlap = checkOverlap(seatsTop) || checkOverlap(seatsRight) || 
                            checkOverlap(seatsBottom) || checkOverlap(seatsLeft)
          
          if (hasOverlap) {
            // Если места перекрываются, распределяем их равномерно по кругу
            seats.forEach((seat, index) => {
              const angle = (2 * Math.PI * index) / totalSeats - Math.PI / 2
              const seatX = newX + circleRadius * Math.cos(angle)
              const seatY = newY + circleRadius * Math.sin(angle)
              
              seat.setAttribute('cx', seatX)
              seat.setAttribute('cy', seatY)
            })
          } else {
            // Если места не перекрываются, размещаем их на указанных сторонах
            let seatIndex = 0
            
            seats.forEach((seat) => {
              let seatX, seatY
              
              if (seatIndex < seatsTop) {
                const spacing = tableSize / (seatsTop + 1)
                seatX = newX - halfSize + spacing * (seatIndex + 1)
                seatY = newY - circleRadius
              } else if (seatIndex < seatsTop + seatsRight) {
                const localIndex = seatIndex - seatsTop
                const spacing = tableSize / (seatsRight + 1)
                seatX = newX + circleRadius
                seatY = newY - halfSize + spacing * (localIndex + 1)
              } else if (seatIndex < seatsTop + seatsRight + seatsBottom) {
                const localIndex = seatIndex - seatsTop - seatsRight
                const spacing = tableSize / (seatsBottom + 1)
                seatX = newX + halfSize - spacing * (localIndex + 1)
                seatY = newY + circleRadius
              } else {
                const localIndex = seatIndex - seatsTop - seatsRight - seatsBottom
                const spacing = tableSize / (seatsLeft + 1)
                seatX = newX - circleRadius
                seatY = newY + halfSize - spacing * (localIndex + 1)
              }
              
              seat.setAttribute('cx', seatX)
              seat.setAttribute('cy', seatY)
              seatIndex++
            })
          }
        } else if (section.shape === 'square') {
          // Для квадратных столов - по сторонам
          const halfSize = tableSize / 2
          const radius = halfSize + seatDistanceFromEdge
          let seatIndex = 0
          
          seats.forEach((seat) => {
            let seatX, seatY
            
            if (seatIndex < seatsTop) {
              const spacing = tableSize / (seatsTop + 1)
              seatX = newX - halfSize + spacing * (seatIndex + 1)
              seatY = newY - radius
            } else if (seatIndex < seatsTop + seatsRight) {
              const localIndex = seatIndex - seatsTop
              const spacing = tableSize / (seatsRight + 1)
              seatX = newX + radius
              seatY = newY - halfSize + spacing * (localIndex + 1)
            } else if (seatIndex < seatsTop + seatsRight + seatsBottom) {
              const localIndex = seatIndex - seatsTop - seatsRight
              const spacing = tableSize / (seatsBottom + 1)
              seatX = newX + halfSize - spacing * (localIndex + 1)
              seatY = newY + radius
            } else {
              const localIndex = seatIndex - seatsTop - seatsRight - seatsBottom
              const spacing = tableSize / (seatsLeft + 1)
              seatX = newX - radius
              seatY = newY + halfSize - spacing * (localIndex + 1)
            }
            
            seat.setAttribute('cx', seatX)
            seat.setAttribute('cy', seatY)
            seatIndex++
          })
        } else { // rectangular
          // Для прямоугольных столов - по сторонам
          const widthDist = tableSize / 2 + seatDistanceFromEdge
          const heightDist = tableHeight / 2 + seatDistanceFromEdge
          let seatIndex = 0
          
          seats.forEach((seat) => {
            let seatX, seatY
            
            if (seatIndex < seatsTop) {
              const spacing = tableSize / (seatsTop + 1)
              seatX = newX - tableSize / 2 + spacing * (seatIndex + 1)
              seatY = newY - heightDist
            } else if (seatIndex < seatsTop + seatsRight) {
              const localIndex = seatIndex - seatsTop
              const spacing = tableHeight / (seatsRight + 1)
              seatX = newX + widthDist
              seatY = newY - tableHeight / 2 + spacing * (localIndex + 1)
            } else if (seatIndex < seatsTop + seatsRight + seatsBottom) {
              const localIndex = seatIndex - seatsTop - seatsRight
              const spacing = tableSize / (seatsBottom + 1)
              seatX = newX + tableSize / 2 - spacing * (localIndex + 1)
              seatY = newY + heightDist
            } else {
              const localIndex = seatIndex - seatsTop - seatsRight - seatsBottom
              const spacing = tableHeight / (seatsLeft + 1)
              seatX = newX - widthDist
              seatY = newY + tableHeight / 2 - spacing * (localIndex + 1)
            }
            
            seat.setAttribute('cx', seatX)
            seat.setAttribute('cy', seatY)
            seatIndex++
          })
        }
      } else if (section.type === SECTION_TYPES.ROWS || (section.type === SECTION_TYPES.BALCONY && section.position) || isDancefloor) {
        // Для рядов, балконов с позицией и танцпола используем скорректированные deltaX и deltaY
        // которые уже учитывают ограничения границ
        
        // Перемещаем все элементы секции визуально
        if (sectionElementsInitialPos.size > 0) {
          sectionElementsInitialPos.forEach((initialPos, el) => {
            if (el && el.tagName === 'circle') {
              // Места
              const newCx = initialPos.x + rowsDeltaX
              const newCy = initialPos.y + rowsDeltaY
              el.setAttribute('cx', newCx)
              el.setAttribute('cy', newCy)
            } else if (el && el.tagName === 'rect') {
              // Для танцпола обновляем позицию прямоугольника
              const width = initialPos.width || 0
              const height = initialPos.height || 0
              const renderX = (initialPos.x + rowsDeltaX) - width / 2
              const renderY = (initialPos.y + rowsDeltaY) - height / 2
              el.setAttribute('x', renderX)
              el.setAttribute('y', renderY)
            } else if (el && el.tagName === 'text') {
              // Метки рядов и текст танцпола
              const newTextX = initialPos.x + rowsDeltaX
              const newTextY = initialPos.y + rowsDeltaY
              el.setAttribute('x', newTextX)
              el.setAttribute('y', newTextY)
            }
          })
        }
      } else if (section.type === SECTION_TYPES.BALCONY && !section.position) {
        // Для балконов без позиции перемещаем rect и text за мышкой
        const balconyWidth = 300
        const balconyHeight = 150
        
        // Ограничиваем позицию границами viewBox
        newX = Math.max(vbX + balconyWidth / 2, Math.min(vbX + vbWidth - balconyWidth / 2, newX))
        newY = Math.max(vbY + balconyHeight / 2, Math.min(vbY + vbHeight - balconyHeight / 2, newY))
        
        // Для рендеринга нужно вычесть половину размера, чтобы центрировать
        const renderX = newX - balconyWidth / 2
        const renderY = newY - balconyHeight / 2
        
        // Обновляем позицию rect и text
        if (sectionElementsInitialPos.size > 0) {
          sectionElementsInitialPos.forEach((initialPos, el) => {
            if (el && el.tagName === 'rect') {
              el.setAttribute('x', renderX)
              el.setAttribute('y', renderY)
            } else if (el && el.tagName === 'text') {
              el.setAttribute('x', newX)
              el.setAttribute('y', newY)
            }
          })
        }
      }
    }
    
    const handleGlobalMouseUp = (e) => {
      const svg = svgRef.current
      if (!svg) return
      
      const point = svg.createSVGPoint()
      point.x = e.clientX
      point.y = e.clientY
      const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse())
      
      // Вычисляем новую позицию с учетом смещения
      const deltaX = svgPoint.x - dragStartPos.x
      const deltaY = svgPoint.y - dragStartPos.y
      let newX = dragStartTablePos.x + deltaX
      let newY = dragStartTablePos.y + deltaY
      
      // Выравниваем по сетке (шаг 10px)
      newX = snapToGrid(newX)
      newY = snapToGrid(newY)
      
      // Получаем границы viewBox
      const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
      const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
      
      if (section.type === SECTION_TYPES.BAR) {
        // Для бара ограничиваем позицию границами viewBox
        const barWidth = section.width || 100
        const barHeight = section.height || 80
        
        // newX и newY - это центр бара, нужно ограничить так, чтобы весь бар был в пределах viewBox
        newX = Math.max(vbX + barWidth / 2, Math.min(vbX + vbWidth - barWidth / 2, newX))
        newY = Math.max(vbY + barHeight / 2, Math.min(vbY + vbHeight - barHeight / 2, newY))
      } else if (section.type === SECTION_TYPES.SOFA) {
        // Для дивана ограничиваем позицию границами viewBox или балкона
        const sofaWidth = section.sofaWidth || 120
        const sofaHeight = section.sofaHeight || 60
        
        // Если диван внутри балкона, ограничиваем перемещение границами балкона
        if (isSofaInBalcony && balconySection) {
          const balconyElement = svg.querySelector(`[data-section-id="${balconySection.id}"]`)
          if (balconyElement) {
            const balconyX = parseFloat(balconyElement.getAttribute('x') || 0)
            const balconyY = parseFloat(balconyElement.getAttribute('y') || 0)
            const balconyWidth = parseFloat(balconyElement.getAttribute('width') || 0)
            const balconyHeight = parseFloat(balconyElement.getAttribute('height') || 0)
            
            newX = Math.max(balconyX + sofaWidth / 2, Math.min(balconyX + balconyWidth - sofaWidth / 2, newX))
            newY = Math.max(balconyY + sofaHeight / 2, Math.min(balconyY + balconyHeight - sofaHeight / 2, newY))
          } else {
            newX = Math.max(vbX + sofaWidth / 2, Math.min(vbX + vbWidth - sofaWidth / 2, newX))
            newY = Math.max(vbY + sofaHeight / 2, Math.min(vbY + vbHeight - sofaHeight / 2, newY))
          }
        } else {
          // Для обычных диванов ограничиваем границами SVG
          newX = Math.max(vbX + sofaWidth / 2, Math.min(vbX + vbWidth - sofaWidth / 2, newX))
          newY = Math.max(vbY + sofaHeight / 2, Math.min(vbY + vbHeight - sofaHeight / 2, newY))
        }
      } else if (isDancefloor) {
        // Для танцпола ограничиваем позицию границами viewBox
        // Вычисляем размеры танцпола из процентов
        const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
        const heightPercent = section.heightPercent || 25
        const availableHeightForDancefloor = vbHeight - (stageSection ? (stageSection.stageHeight || 80) : 0)
        const dancefloorHeight = (heightPercent / 100) * availableHeightForDancefloor
        const widthPercent = section.widthPercent || 100
        const dancefloorWidth = (widthPercent / 100) * vbWidth
        const maxWidth = vbWidth - 100
        const finalWidth = Math.min(dancefloorWidth, maxWidth)
        
        // newX и newY - это центр танцпола, нужно ограничить так, чтобы весь танцпол был в пределах viewBox
        newX = Math.max(vbX + finalWidth / 2, Math.min(vbX + vbWidth - finalWidth / 2, newX))
        newY = Math.max(vbY + dancefloorHeight / 2, Math.min(vbY + vbHeight - dancefloorHeight / 2, newY))
      } else if (section.type === SECTION_TYPES.TABLE) {
        // Вычисляем максимальный радиус стола с местами для ограничения границ
        const tableSize = section.tableSize || 60
        const tableHeight = section.tableHeight || 40
        const seatRadius = 8 // Максимальный радиус места
        const seatDistanceFromEdge = 10
        
        let maxRadius = 0
        if (section.shape === 'round') {
          maxRadius = tableSize / 2 + seatDistanceFromEdge + seatRadius
        } else if (section.shape === 'square') {
          const halfSize = tableSize / 2
          const diagonalRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        } else { // rectangular
          const halfWidth = tableSize / 2
          const halfHeight = tableHeight / 2
          const diagonalRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        }
        
        // Если стол внутри балкона, ограничиваем перемещение границами балкона
        if (isTableInBalcony && balconySection) {
          // Находим балкон на схеме и вычисляем его границы
          const balconyElement = svg.querySelector(`[data-section-id="${balconySection.id}"]`)
          if (balconyElement) {
            const balconyX = parseFloat(balconyElement.getAttribute('x') || 0)
            const balconyY = parseFloat(balconyElement.getAttribute('y') || 0)
            const balconyWidth = parseFloat(balconyElement.getAttribute('width') || 0)
            const balconyHeight = parseFloat(balconyElement.getAttribute('height') || 0)
            
            // Ограничиваем позицию стола границами балкона (с учетом размера стола и мест)
            newX = Math.max(balconyX + maxRadius, Math.min(balconyX + balconyWidth - maxRadius, newX))
            newY = Math.max(balconyY + maxRadius, Math.min(balconyY + balconyHeight - maxRadius, newY))
          } else {
            // Если балкон не найден, используем стандартные ограничения
            newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
            newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
          }
        } else {
          // Для обычных столов ограничиваем границами SVG
          newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
          newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
        }
      } else if (section.type === SECTION_TYPES.ROWS) {
        // Для рядов вычисляем центр элементов на основе их текущих позиций
        // и ограничиваем позицию границами viewBox
        if (sectionElementsInitialPos.size > 0) {
          // Вычисляем текущий центр элементов после перемещения
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          sectionElementsInitialPos.forEach((initialPos, el) => {
            if (el.tagName === 'circle') {
              const currentCx = parseFloat(el.getAttribute('cx') || 0)
              const currentCy = parseFloat(el.getAttribute('cy') || 0)
              const r = parseFloat(el.getAttribute('r') || 0)
              minX = Math.min(minX, currentCx - r)
              maxX = Math.max(maxX, currentCx + r)
              minY = Math.min(minY, currentCy - r)
              maxY = Math.max(maxY, currentCy + r)
            } else if (el.tagName === 'text') {
              const currentX = parseFloat(el.getAttribute('x') || 0)
              const currentY = parseFloat(el.getAttribute('y') || 0)
              minX = Math.min(minX, currentX)
              maxX = Math.max(maxX, currentX)
              minY = Math.min(minY, currentY)
              maxY = Math.max(maxY, currentY)
            }
          })
          if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
            // Используем текущий центр элементов как новую позицию
            newX = (minX + maxX) / 2
            newY = (minY + maxY) / 2
          }
        }
        // Ограничиваем позицию границами viewBox (уже сделано выше в handleGlobalMouseMove)
      } else if (isDancefloor) {
        // Для танцпола вычисляем центр элементов на основе их текущих позиций
        // и ограничиваем позицию границами viewBox
        if (sectionElementsInitialPos.size > 0) {
          // Вычисляем текущий центр элементов после перемещения
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          sectionElementsInitialPos.forEach((initialPos, el) => {
            if (el.tagName === 'rect') {
              const currentX = parseFloat(el.getAttribute('x') || 0)
              const currentY = parseFloat(el.getAttribute('y') || 0)
              const width = parseFloat(el.getAttribute('width') || 0)
              const height = parseFloat(el.getAttribute('height') || 0)
              // Центр прямоугольника
              const centerX = currentX + width / 2
              const centerY = currentY + height / 2
              minX = Math.min(minX, centerX - width / 2)
              maxX = Math.max(maxX, centerX + width / 2)
              minY = Math.min(minY, centerY - height / 2)
              maxY = Math.max(maxY, centerY + height / 2)
            } else if (el.tagName === 'text') {
              const currentX = parseFloat(el.getAttribute('x') || 0)
              const currentY = parseFloat(el.getAttribute('y') || 0)
              minX = Math.min(minX, currentX)
              maxX = Math.max(maxX, currentX)
              minY = Math.min(minY, currentY)
              maxY = Math.max(maxY, currentY)
            }
          })
          if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
            // Используем текущий центр элементов как новую позицию
            newX = (minX + maxX) / 2
            newY = (minY + maxY) / 2
          }
        }
        // Ограничиваем позицию границами viewBox (уже сделано выше в handleGlobalMouseMove)
      } else if (section.type === SECTION_TYPES.BALCONY) {
        // Для балконов определяем позицию по направлению движения
        const positionThreshold = 50 // Порог для определения направления (в пикселях SVG)
        let newPosition = section.position
        
        // Получаем границы viewBox для вычисления центра
        const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
        const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
        const centerX = vbX + vbWidth / 2
        const centerY = vbY + vbHeight / 2
        
        // Если позиция еще не определена, определяем её по направлению движения
        if (!section.position) {
          const absDeltaX = Math.abs(deltaX)
          const absDeltaY = Math.abs(deltaY)
          
          // Определяем основное направление движения
          // Проверяем попытку установить балкон наверх только если основное направление - вверх
          if (absDeltaY > absDeltaX && absDeltaY > positionThreshold && deltaY < -positionThreshold) {
            // Движение вверх - показываем предупреждение и возвращаем балкон в центр
            message.warning('Балкон нельзя установить наверх. Балкон может быть только слева, справа или снизу.')
            
            // Устанавливаем флаг ДО всех остальных действий, чтобы предотвратить открытие меню
            if (setJustFinishedDragging) {
              setJustFinishedDragging(true)
            }
            
            // Находим элементы балкона для блокировки кликов
            const balconyElements = svg.querySelectorAll(`[data-section-id="${draggingTableId}"]`)
            
            // Временно удаляем обработчики кликов на элементах балкона
            const savedClickHandlers = new Map()
            balconyElements.forEach(el => {
              if (el._sectionHandlers && el._sectionHandlers.click) {
                savedClickHandlers.set(el, el._sectionHandlers.click)
                el.removeEventListener('click', el._sectionHandlers.click)
              }
            })
            
            // Добавляем глобальный обработчик для блокировки кликов на короткое время
            const blockClickHandler = (e) => {
              const target = e.target
              if (target && target.getAttribute('data-section-id') === String(draggingTableId)) {
                e.preventDefault()
                e.stopPropagation()
                e.stopImmediatePropagation()
                return false
              }
            }
            document.addEventListener('click', blockClickHandler, true) // capture phase
            
            // Возвращаем балкон в центр
            handleUpdateSection(draggingTableId, {
              position: null,
              x: centerX,
              y: centerY
            })
            
            // Закрываем меню
            if (closeActionMenu) {
              closeActionMenu()
            }
            
            // Восстанавливаем pointer-events для всех элементов
            allElements.forEach(el => {
              if (originalPointerEvents.has(el)) {
                el.style.pointerEvents = originalPointerEvents.get(el)
              }
            })
            originalPointerEvents.clear()
            
            // Восстанавливаем курсор
            document.body.style.cursor = originalBodyCursor
            sectionElementsForDragging.forEach(el => {
              if (originalElementCursors.has(el)) {
                el.style.cursor = originalElementCursors.get(el)
              }
            })
            
            // Сбрасываем draggingTableId с задержкой, чтобы предотвратить открытие меню
            setTimeout(() => {
              setDraggingTableId(null)
              setDragStartPos({ x: 0, y: 0 })
              setDragStartTablePos({ x: 0, y: 0 })
              
              // Восстанавливаем обработчики кликов после задержки
              setTimeout(() => {
                // Удаляем глобальный блокирующий обработчик
                document.removeEventListener('click', blockClickHandler, true)
                
                // Восстанавливаем обработчики кликов
                savedClickHandlers.forEach((handler, el) => {
                  if (el && handler) {
                    el.addEventListener('click', handler)
                  }
                })
                
                // Сбрасываем флаг через большую задержку, чтобы click событие точно не сработало
                if (setJustFinishedDragging) {
                  setTimeout(() => {
                    setJustFinishedDragging(false)
                  }, 200)
                }
              }, 500)
            }, 100)
            
            return
          }
          
          // Определяем основное направление движения
          if (absDeltaX > positionThreshold || absDeltaY > positionThreshold) {
            if (absDeltaX > absDeltaY) {
              // Горизонтальное движение
              if (deltaX < -positionThreshold) {
                // Движение влево
                newPosition = 'left'
              } else if (deltaX > positionThreshold) {
                // Движение вправо
                newPosition = 'right'
              }
            } else {
              // Вертикальное движение
              if (deltaY > positionThreshold) {
                // Движение вниз
                newPosition = 'middle'
              }
              // Движение вверх уже обработано выше
            }
          }
        }
        
        // Если позиция определена, обновляем название и категорию
        if (newPosition && newPosition !== section.position) {
          // Определяем номер балкона для этой позиции
          const existingBalconiesSamePosition = sections.filter(s => 
            s.type === SECTION_TYPES.BALCONY && 
            s.position === newPosition && 
            s.id !== section.id
          )
          const balconyNumber = existingBalconiesSamePosition.length + 1
          
          // Формируем название и категорию в зависимости от позиции
          let positionLabel = ''
          if (newPosition === 'left') {
            positionLabel = 'L'
          } else if (newPosition === 'right') {
            positionLabel = 'R'
          } else if (newPosition === 'middle') {
            positionLabel = 'B'
          }
          
          const newLabel = `BALCONY ${positionLabel} ${balconyNumber}`
          const newCategory = `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`
          
          // Обновляем секцию с новой позицией, названием и категорией
          handleUpdateSection(draggingTableId, {
            position: newPosition,
            label: newLabel,
            category: newCategory,
            // Обновляем размеры в зависимости от позиции
            widthPercent: newPosition === 'middle' ? null : 12,
            heightPercent: newPosition === 'middle' ? 25 : null
          })
          
          // Создаем категорию, если её нет
          if (onCategoriesChange && !categories.find(c => c.value === newCategory)) {
            const newCategoryObj = {
              value: newCategory,
              label: newLabel,
              color: '#cccccc',
              icon: null
            }
            onCategoriesChange([...categories, newCategoryObj])
          }
          
          // Закрываем меню после определения позиции
          if (closeActionMenu) {
            closeActionMenu()
          }
          
          // Сбрасываем draggingTableId, чтобы меню не открывалось снова
          setDraggingTableId(null)
          setDragStartPos({ x: 0, y: 0 })
          setDragStartTablePos({ x: 0, y: 0 })
          
          // Не сохраняем x и y для балконов, так как они позиционируются автоматически
          return
        }
        
        // Если позиция уже определена, просто обновляем x и y (для будущего использования)
        // Но для балконов x и y не используются, так как позиция определяется автоматически
      }
      
      // Обновляем позицию секции
      handleUpdateSection(draggingTableId, { x: newX, y: newY })
      
      // Восстанавливаем pointer-events для всех элементов
      allElements.forEach(el => {
        if (originalPointerEvents.has(el)) {
          el.style.pointerEvents = originalPointerEvents.get(el)
        }
      })
      
      // Восстанавливаем курсор
      document.body.style.cursor = originalBodyCursor
      sectionElementsForDragging.forEach(el => {
        if (originalElementCursors.has(el)) {
          el.style.cursor = originalElementCursors.get(el)
        }
      })
      
      // Для рядов и балконов временный элемент вернется при следующей перерисовке схемы
      // через generateScheme, который вызывается при обновлении секции
      
      setDraggingTableId(null)
      setDragStartPos({ x: 0, y: 0 })
      setDragStartTablePos({ x: 0, y: 0 })
      isFirstMoveRef.current = false
    }
    
    document.addEventListener('mousemove', handleGlobalMouseMove, true) // Используем capture phase
    document.addEventListener('mouseup', handleGlobalMouseUp, true) // Используем capture phase
    
    return () => {
      // Восстанавливаем pointer-events при размонтировании
      allElements.forEach(el => {
        if (originalPointerEvents.has(el)) {
          el.style.pointerEvents = originalPointerEvents.get(el)
        }
      })
      
      // Восстанавливаем курсор
      document.body.style.cursor = originalBodyCursor
      sectionElementsForDragging.forEach(el => {
        if (originalElementCursors.has(el)) {
          el.style.cursor = originalElementCursors.get(el)
        }
      })
      
      document.removeEventListener('mousemove', handleGlobalMouseMove, true)
      document.removeEventListener('mouseup', handleGlobalMouseUp, true)
    }
  }, [draggingTableId, dragStartPos, dragStartTablePos, sections, isModalVisible, handleUpdateSection, svgRef, setDraggingTableId, setDragStartPos, setDragStartTablePos])
}
