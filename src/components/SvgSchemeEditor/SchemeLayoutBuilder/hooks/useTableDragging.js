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
  const isFirstMoveRef = useRef(false)
  
  useEffect(() => {
    if (!draggingTableId) {
      isFirstMoveRef.current = false
      return
    }
    
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
    
    const isTableInBalcony = section.type === SECTION_TYPES.TABLE && section.balconyId
    const isSofaInBalcony = section.type === SECTION_TYPES.SOFA && section.balconyId
    let balconySection = null
    if (isTableInBalcony || isSofaInBalcony) {
      balconySection = sections.find(s => s.id === section.balconyId)
    }
    
    let tempOverlayElement = null
    if (section.type === SECTION_TYPES.ROWS || section.type === SECTION_TYPES.BALCONY) {
      tempOverlayElement = svg.querySelector(`[data-section-id="${draggingTableId}"][data-temp-overlay="true"]`)
      if (tempOverlayElement) {
        tempOverlayElement.remove()
      }
    }
    
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
          sectionElementsInitialPos.set(el, { x: x + width / 2, y: y + height / 2, width, height })
        } else if (el.tagName === 'text') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          sectionElementsInitialPos.set(el, { x, y })
        }
      })
    } else if (isUnpositionedBalcony) {
      const selector = `[data-section-id="${draggingTableId}"]`
      sectionElementsForDragging = Array.from(svg.querySelectorAll(selector))
      sectionElementsForDragging.forEach((el) => {
        if (el.tagName === 'rect') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          const width = parseFloat(el.getAttribute('width') || 0)
          const height = parseFloat(el.getAttribute('height') || 0)
          sectionElementsInitialPos.set(el, { x: x + width / 2, y: y + height / 2, width, height })
        } else if (el.tagName === 'text') {
          const x = parseFloat(el.getAttribute('x') || 0)
          const y = parseFloat(el.getAttribute('y') || 0)
          sectionElementsInitialPos.set(el, { x, y })
        }
      })
    }
    
    const allElements = svg.querySelectorAll('[data-section-id]')
    const originalPointerEvents = new Map()
    allElements.forEach(el => {
      if (el.getAttribute('data-section-id') !== String(draggingTableId)) {
        originalPointerEvents.set(el, el.style.pointerEvents)
        el.style.pointerEvents = 'none'
      }
    })
    
    const originalBodyCursor = document.body.style.cursor
    document.body.style.cursor = 'move'
    
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
      
      if ((section.type === SECTION_TYPES.ROWS || (section.type === SECTION_TYPES.BALCONY && section.position)) && !isFirstMoveRef.current) {
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
            setDragStartPos({ x: centerX, y: centerY })
            isFirstMoveRef.current = true
            return
          }
        }
      }
      
      const deltaX = svgPoint.x - dragStartPos.x
      const deltaY = svgPoint.y - dragStartPos.y
      let newX = dragStartTablePos.x + deltaX
      let newY = dragStartTablePos.y + deltaY
      
      newX = snapToGrid(newX)
      newY = snapToGrid(newY)
      
      const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
      const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
      
      let rowsDeltaX = deltaX
      let rowsDeltaY = deltaY
      if (section.type === SECTION_TYPES.ROWS || section.type === SECTION_TYPES.BALCONY || isDancefloor) {
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
            
            const newMinX = newX - (initialCenterX - minX)
            const newMaxX = newX + (maxX - initialCenterX)
            const newMinY = newY - (initialCenterY - minY)
            const newMaxY = newY + (maxY - initialCenterY)
            
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
            
            rowsDeltaX = limitedNewX - dragStartTablePos.x
            rowsDeltaY = limitedNewY - dragStartTablePos.y
            newX = limitedNewX
            newY = limitedNewY
          }
        }
      }
      
      const element = svg.querySelector(`[data-section-id="${draggingTableId}"]`)
      if (!element) {
        return
      }
      
      if (section.type === SECTION_TYPES.BAR) {
        const barWidth = section.width || 100
        const barHeight = section.height || 80
        
        newX = Math.max(vbX + barWidth / 2, Math.min(vbX + vbWidth - barWidth / 2, newX))
        newY = Math.max(vbY + barHeight / 2, Math.min(vbY + vbHeight - barHeight / 2, newY))
        
        const renderX = newX - barWidth / 2
        const renderY = newY - barHeight / 2
        
        element.setAttribute('x', renderX)
        element.setAttribute('y', renderY)
        
        const barText = element.nextElementSibling
        if (barText && barText.tagName === 'text') {
          barText.setAttribute('x', newX)
          barText.setAttribute('y', newY)
        }
      } else if (section.type === SECTION_TYPES.SOFA) {
        const sofaWidth = section.sofaWidth || 120
        const sofaHeight = section.sofaHeight || 60
        
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
          newX = Math.max(vbX + sofaWidth / 2, Math.min(vbX + vbWidth - sofaWidth / 2, newX))
          newY = Math.max(vbY + sofaHeight / 2, Math.min(vbY + vbHeight - sofaHeight / 2, newY))
        }
        
        const renderX = newX - sofaWidth / 2
        const renderY = newY - sofaHeight / 2
        
        element.setAttribute('x', renderX)
        element.setAttribute('y', renderY)
        
        const sofaText = element.nextElementSibling
        if (sofaText && sofaText.tagName === 'text') {
          const padding = 5
          const fontSize = 14
          const textTopPadding = 3
          const textY = newY - sofaHeight / 2 + padding + textTopPadding
          sofaText.setAttribute('x', newX)
          sofaText.setAttribute('y', textY)
        }
        
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
              if (seatY + seatRadius <= seatsAreaBottom && seatY - seatRadius >= seatsAreaTop) {
                seat.setAttribute('cx', seatX)
                seat.setAttribute('cy', seatY)
                seat.setAttribute('r', seatRadius)
              }
            })
          } else {
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
        const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
        const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
        const heightPercent = section.heightPercent || 25
        const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
        const availableHeightForDancefloor = vbHeight - (stageSection ? (stageSection.stageHeight || 80) : 0)
        const dancefloorHeight = (heightPercent / 100) * availableHeightForDancefloor
        const widthPercent = section.widthPercent || 100
        const dancefloorWidth = (widthPercent / 100) * vbWidth
        const maxWidth = vbWidth - 100
        const finalWidth = Math.min(dancefloorWidth, maxWidth)
        
        newX = Math.max(vbX + finalWidth / 2, Math.min(vbX + vbWidth - finalWidth / 2, newX))
        newY = Math.max(vbY + dancefloorHeight / 2, Math.min(vbY + vbHeight - dancefloorHeight / 2, newY))
        
        const renderX = newX - finalWidth / 2
        const renderY = newY - dancefloorHeight / 2
        
        element.setAttribute('x', renderX)
        element.setAttribute('y', renderY)
        
        const dancefloorText = element.nextElementSibling
        if (dancefloorText && dancefloorText.tagName === 'text') {
          dancefloorText.setAttribute('x', newX)
          dancefloorText.setAttribute('y', newY)
        }
      } else if (section.type === SECTION_TYPES.TABLE) {
        const tableSize = section.tableSize || 60
        const tableHeight = section.tableHeight || 40
        const seatRadius = 8
        const seatDistanceFromEdge = 10
        
        let maxRadius = 0
        if (section.shape === 'round') {
          maxRadius = tableSize / 2 + seatDistanceFromEdge + seatRadius
        } else if (section.shape === 'square') {
          const halfSize = tableSize / 2
          const diagonalRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        } else { 
          const halfWidth = tableSize / 2
          const halfHeight = tableHeight / 2
          const diagonalRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        }
        
        if (isTableInBalcony && balconySection) {
          const balconyElement = svg.querySelector(`[data-section-id="${balconySection.id}"]`)
          if (balconyElement) {
            const balconyX = parseFloat(balconyElement.getAttribute('x') || 0)
            const balconyY = parseFloat(balconyElement.getAttribute('y') || 0)
            const balconyWidth = parseFloat(balconyElement.getAttribute('width') || 0)
            const balconyHeight = parseFloat(balconyElement.getAttribute('height') || 0)
            
            newX = Math.max(balconyX + maxRadius, Math.min(balconyX + balconyWidth - maxRadius, newX))
            newY = Math.max(balconyY + maxRadius, Math.min(balconyY + balconyHeight - maxRadius, newY))
          } else {
            newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
            newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
          }
        } else {
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
        
        const seats = svg.querySelectorAll(`[data-table-id="${draggingTableId}"]`)
        
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        
        let actualSeatRadius = seatRadius
        if (seats.length > 0) {
          const firstSeat = seats[0]
          const r = firstSeat.getAttribute('r')
          if (r) {
            actualSeatRadius = parseFloat(r)
          }
        }
        
        if (section.shape === 'round') {
          const circleRadius = tableSize / 2 + seatDistanceFromEdge
          const halfSize = tableSize / 2
          const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
          
          const checkOverlap = (seatsCount) => {
            if (seatsCount <= 1) return false
            const spacing = tableSize / (seatsCount + 1)
            return spacing < 2 * actualSeatRadius
          }
          
          const hasOverlap = checkOverlap(seatsTop) || checkOverlap(seatsRight) || 
                            checkOverlap(seatsBottom) || checkOverlap(seatsLeft)
          
          if (hasOverlap) {
            seats.forEach((seat, index) => {
              const angle = (2 * Math.PI * index) / totalSeats - Math.PI / 2
              const seatX = newX + circleRadius * Math.cos(angle)
              const seatY = newY + circleRadius * Math.sin(angle)
              
              seat.setAttribute('cx', seatX)
              seat.setAttribute('cy', seatY)
            })
          } else {
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
        } else {
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
        if (sectionElementsInitialPos.size > 0) {
          sectionElementsInitialPos.forEach((initialPos, el) => {
            if (el && el.tagName === 'circle') {
              const newCx = initialPos.x + rowsDeltaX
              const newCy = initialPos.y + rowsDeltaY
              el.setAttribute('cx', newCx)
              el.setAttribute('cy', newCy)
            } else if (el && el.tagName === 'rect') {
              const width = initialPos.width || 0
              const height = initialPos.height || 0
              const renderX = (initialPos.x + rowsDeltaX) - width / 2
              const renderY = (initialPos.y + rowsDeltaY) - height / 2
              el.setAttribute('x', renderX)
              el.setAttribute('y', renderY)
            } else if (el && el.tagName === 'text') {
              const newTextX = initialPos.x + rowsDeltaX
              const newTextY = initialPos.y + rowsDeltaY
              el.setAttribute('x', newTextX)
              el.setAttribute('y', newTextY)
            }
          })
        }
      } else if (section.type === SECTION_TYPES.BALCONY && !section.position) {
        const balconyWidth = 300
        const balconyHeight = 150
        
        newX = Math.max(vbX + balconyWidth / 2, Math.min(vbX + vbWidth - balconyWidth / 2, newX))
        newY = Math.max(vbY + balconyHeight / 2, Math.min(vbY + vbHeight - balconyHeight / 2, newY))
        
        const renderX = newX - balconyWidth / 2
        const renderY = newY - balconyHeight / 2
        
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
      
      const deltaX = svgPoint.x - dragStartPos.x
      const deltaY = svgPoint.y - dragStartPos.y
      let newX = dragStartTablePos.x + deltaX
      let newY = dragStartTablePos.y + deltaY
      
      newX = snapToGrid(newX)
      newY = snapToGrid(newY)
      
      const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
      const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
      
      if (section.type === SECTION_TYPES.BAR) {
        const barWidth = section.width || 100
        const barHeight = section.height || 80
        
        newX = Math.max(vbX + barWidth / 2, Math.min(vbX + vbWidth - barWidth / 2, newX))
        newY = Math.max(vbY + barHeight / 2, Math.min(vbY + vbHeight - barHeight / 2, newY))
      } else if (section.type === SECTION_TYPES.SOFA) {
        const sofaWidth = section.sofaWidth || 120
        const sofaHeight = section.sofaHeight || 60
        
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
          newX = Math.max(vbX + sofaWidth / 2, Math.min(vbX + vbWidth - sofaWidth / 2, newX))
          newY = Math.max(vbY + sofaHeight / 2, Math.min(vbY + vbHeight - sofaHeight / 2, newY))
        }
      } else if (isDancefloor) {
        const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
        const heightPercent = section.heightPercent || 25
        const availableHeightForDancefloor = vbHeight - (stageSection ? (stageSection.stageHeight || 80) : 0)
        const dancefloorHeight = (heightPercent / 100) * availableHeightForDancefloor
        const widthPercent = section.widthPercent || 100
        const dancefloorWidth = (widthPercent / 100) * vbWidth
        const maxWidth = vbWidth - 100
        const finalWidth = Math.min(dancefloorWidth, maxWidth)
        
        newX = Math.max(vbX + finalWidth / 2, Math.min(vbX + vbWidth - finalWidth / 2, newX))
        newY = Math.max(vbY + dancefloorHeight / 2, Math.min(vbY + vbHeight - dancefloorHeight / 2, newY))
      } else if (section.type === SECTION_TYPES.TABLE) {
        const tableSize = section.tableSize || 60
        const tableHeight = section.tableHeight || 40
        const seatRadius = 8
        const seatDistanceFromEdge = 10
        
        let maxRadius = 0
        if (section.shape === 'round') {
          maxRadius = tableSize / 2 + seatDistanceFromEdge + seatRadius
        } else if (section.shape === 'square') {
          const halfSize = tableSize / 2
          const diagonalRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        } else { 
          const halfWidth = tableSize / 2
          const halfHeight = tableHeight / 2
          const diagonalRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
          maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
        }
        
        if (isTableInBalcony && balconySection) {
          const balconyElement = svg.querySelector(`[data-section-id="${balconySection.id}"]`)
          if (balconyElement) {
            const balconyX = parseFloat(balconyElement.getAttribute('x') || 0)
            const balconyY = parseFloat(balconyElement.getAttribute('y') || 0)
            const balconyWidth = parseFloat(balconyElement.getAttribute('width') || 0)
            const balconyHeight = parseFloat(balconyElement.getAttribute('height') || 0)
            
            newX = Math.max(balconyX + maxRadius, Math.min(balconyX + balconyWidth - maxRadius, newX))
            newY = Math.max(balconyY + maxRadius, Math.min(balconyY + balconyHeight - maxRadius, newY))
          } else {
            newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
            newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
          }
        } else {
          newX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, newX))
          newY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, newY))
        }
      } else if (section.type === SECTION_TYPES.ROWS) {
        if (sectionElementsInitialPos.size > 0) {
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
            newX = (minX + maxX) / 2
            newY = (minY + maxY) / 2
          }
        }
      } else if (isDancefloor) {
        if (sectionElementsInitialPos.size > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          sectionElementsInitialPos.forEach((initialPos, el) => {
            if (el.tagName === 'rect') {
              const currentX = parseFloat(el.getAttribute('x') || 0)
              const currentY = parseFloat(el.getAttribute('y') || 0)
              const width = parseFloat(el.getAttribute('width') || 0)
              const height = parseFloat(el.getAttribute('height') || 0)
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
            newX = (minX + maxX) / 2
            newY = (minY + maxY) / 2
          }
        }
      } else if (section.type === SECTION_TYPES.BALCONY) {
        const positionThreshold = 50
        let newPosition = section.position
        
        const viewBox = svg.getAttribute('viewBox') || DEFAULT_VIEWBOX
        const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
        const centerX = vbX + vbWidth / 2
        const centerY = vbY + vbHeight / 2
        
        if (!section.position) {
          const absDeltaX = Math.abs(deltaX)
          const absDeltaY = Math.abs(deltaY)
          
          if (absDeltaY > absDeltaX && absDeltaY > positionThreshold && deltaY < -positionThreshold) {
            message.warning('Балкон нельзя установить наверх. Балкон может быть только слева, справа или снизу.')
            
            if (setJustFinishedDragging) {
              setJustFinishedDragging(true)
            }
            
            const balconyElements = svg.querySelectorAll(`[data-section-id="${draggingTableId}"]`)
            
            const savedClickHandlers = new Map()
            balconyElements.forEach(el => {
              if (el._sectionHandlers && el._sectionHandlers.click) {
                savedClickHandlers.set(el, el._sectionHandlers.click)
                el.removeEventListener('click', el._sectionHandlers.click)
              }
            })
            
            const blockClickHandler = (e) => {
              const target = e.target
              if (target && target.getAttribute('data-section-id') === String(draggingTableId)) {
                e.preventDefault()
                e.stopPropagation()
                e.stopImmediatePropagation()
                return false
              }
            }
            document.addEventListener('click', blockClickHandler, true) 
            
            handleUpdateSection(draggingTableId, {
              position: null,
              x: centerX,
              y: centerY
            })
            
            if (closeActionMenu) {
              closeActionMenu()
            }
            
            allElements.forEach(el => {
              if (originalPointerEvents.has(el)) {
                el.style.pointerEvents = originalPointerEvents.get(el)
              }
            })
            originalPointerEvents.clear()
            
            document.body.style.cursor = originalBodyCursor
            sectionElementsForDragging.forEach(el => {
              if (originalElementCursors.has(el)) {
                el.style.cursor = originalElementCursors.get(el)
              }
            })
            
            setTimeout(() => {
              setDraggingTableId(null)
              setDragStartPos({ x: 0, y: 0 })
              setDragStartTablePos({ x: 0, y: 0 })
              
              setTimeout(() => {
                document.removeEventListener('click', blockClickHandler, true)
                
                savedClickHandlers.forEach((handler, el) => {
                  if (el && handler) {
                    el.addEventListener('click', handler)
                  }
                })
                
                if (setJustFinishedDragging) {
                  setTimeout(() => {
                    setJustFinishedDragging(false)
                  }, 200)
                }
              }, 500)
            }, 100)
            
            return
          }
          
          if (absDeltaX > positionThreshold || absDeltaY > positionThreshold) {
            if (absDeltaX > absDeltaY) {
              if (deltaX < -positionThreshold) {
                newPosition = 'left'
              } else if (deltaX > positionThreshold) {
                newPosition = 'right'
              }
            } else {
              if (deltaY > positionThreshold) {
                newPosition = 'middle'
              }
            }
          }
        }
        
        if (newPosition && newPosition !== section.position) {
          const existingBalconiesSamePosition = sections.filter(s => 
            s.type === SECTION_TYPES.BALCONY && 
            s.position === newPosition && 
            s.id !== section.id
          )
          const balconyNumber = existingBalconiesSamePosition.length + 1
          
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
          
          handleUpdateSection(draggingTableId, {
            position: newPosition,
            label: newLabel,
            category: newCategory,
            widthPercent: newPosition === 'middle' ? null : 12,
            heightPercent: newPosition === 'middle' ? 25 : null
          })
          
          if (onCategoriesChange && !categories.find(c => c.value === newCategory)) {
            const newCategoryObj = {
              value: newCategory,
              label: newLabel,
              color: '#cccccc',
              icon: null
            }
            onCategoriesChange([...categories, newCategoryObj])
          }
          
          if (closeActionMenu) {
            closeActionMenu()
          }
          
          setDraggingTableId(null)
          setDragStartPos({ x: 0, y: 0 })
          setDragStartTablePos({ x: 0, y: 0 })
          
          return
        }
        
      }
      
      handleUpdateSection(draggingTableId, { x: newX, y: newY })
      
      allElements.forEach(el => {
        if (originalPointerEvents.has(el)) {
          el.style.pointerEvents = originalPointerEvents.get(el)
        }
      })
      
      document.body.style.cursor = originalBodyCursor
      sectionElementsForDragging.forEach(el => {
        if (originalElementCursors.has(el)) {
          el.style.cursor = originalElementCursors.get(el)
        }
      })
      
      setDraggingTableId(null)
      setDragStartPos({ x: 0, y: 0 })
      setDragStartTablePos({ x: 0, y: 0 })
      isFirstMoveRef.current = false
    }
    
    document.addEventListener('mousemove', handleGlobalMouseMove, true) 
    document.addEventListener('mouseup', handleGlobalMouseUp, true) 
    
    return () => {
      allElements.forEach(el => {
        if (originalPointerEvents.has(el)) {
          el.style.pointerEvents = originalPointerEvents.get(el)
        }
      })
      
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
