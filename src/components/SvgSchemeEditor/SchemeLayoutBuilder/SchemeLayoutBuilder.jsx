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
  const [modalSectionData, setModalSectionData] = useState(null)
  const [draggingTableId, setDraggingTableId] = useState(null)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [dragStartTablePos, setDragStartTablePos] = useState({ x: 0, y: 0 })
  const [actionMenuVisible, setActionMenuVisible] = useState(false)
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 })
  const [actionMenuSectionId, setActionMenuSectionId] = useState(null)
  const [justFinishedDragging, setJustFinishedDragging] = useState(false)
  const generateTimeoutRef = useRef(null)
  const notifyChangeTimeoutRef = useRef(null)
  const isInitialMountRef = useRef(true)
  const clickHandlerRef = useRef(null)
  const mouseDownHandlerRef = useRef(null)
  
  const handleUpdateSection = useCallback((id, updates) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) {
        let updatedSection
        if (updates.id && updates.type) {
          if (s.type === SECTION_TYPES.TABLE || s.type === SECTION_TYPES.ROWS || s.type === SECTION_TYPES.BALCONY || s.type === SECTION_TYPES.DANCEFLOOR || s.type === SECTION_TYPES.SOFA) {
            updatedSection = {
              ...updates,
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
  
  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false)
    setActionMenuSectionId(null)
  }, [])
  
  useEffect(() => {
    if (onCategoriesChange) {
      sections.forEach(section => {
        if (section.category && section.color) {
          const categoryIndex = categories.findIndex(c => c.value === section.category)
          if (categoryIndex >= 0 && categories[categoryIndex].color !== section.color) {
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
  
  useEffect(() => {
    if (onSectionsChange) {
      const timeoutId = setTimeout(() => {
        onSectionsChange(sections)
        
        if (onCategoriesChange) {
          const usedCategories = new Set()
          sections.forEach(section => {
            if (section.category) {
              usedCategories.add(section.category)
            }
          })
          
          onCategoriesChange(prev => prev.filter(cat => usedCategories.has(cat.value)))
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [sections, onSectionsChange, onCategoriesChange])
  
  useEffect(() => {
    if (isInitialMountRef.current) {
      if (initialSections && initialSections.length > 0) {
        setSections(initialSections)
      }
      isInitialMountRef.current = false
    }
  }, [])

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
      
      if (sections.length === 0) {
        notifyChange()
      }
    }
  }, [initialSections, sections.length])

  const parseExistingScheme = useCallback((svg) => {
    setSections([])
  }, [])

  const notifyChange = useCallback(() => {
    if (!svgRef.current || !onSchemeChange) return
    try {
      const svg = svgRef.current.cloneNode(true)
      
      const tempOverlays = svg.querySelectorAll('[data-temp-overlay="true"]')
      tempOverlays.forEach(el => el.remove())
      
      const seats = svg.querySelectorAll('.svg-seat')
      seats.forEach(seat => {
        seat.style.pointerEvents = 'auto'
      })
      
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

  const showActionMenu = useCallback((sectionId, position) => {
    if (justFinishedDragging) {
      return
    }
    setActionMenuSectionId(sectionId)
    setActionMenuPosition(position)
    setActionMenuVisible(true)
  }, [justFinishedDragging])

  const handleConfigureSection = useCallback(() => {
    if (!actionMenuSectionId) return
    setModalSectionId(actionMenuSectionId)
    setIsModalVisible(true)
  }, [actionMenuSectionId])

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
        const svg = svgRef.current
      if (!svg) {
          return
        }
        
        let currentX, currentY
        if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
          currentX = section.x
          currentY = section.y
      } else if (isRows || isBalcony || isDancefloor) {
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
      
      setDragStartTablePos({ x: currentX, y: currentY })
      setDragStartPos({ x: currentX, y: currentY })
      setDraggingTableId(actionMenuSectionId)
    }
  }, [actionMenuSectionId, sections, svgRef])

  const { addSectionHandlers, removeSectionHandlers } = useSectionHandlers({
    svgRef,
    sections,
    draggingTableId,
    showActionMenu,
    justFinishedDragging
  })
  
  const generateScheme = useCallback(() => {
    if (!svgRef.current) return
    
    try {
      const allElements = svgRef.current.querySelectorAll('[data-section-id]')
      allElements.forEach(el => {
        if (el._sectionHandlers) {
          removeSectionHandlers(el)
        }
      })
      
      svgRef.current.innerHTML = ''
    } catch (e) {
      console.warn('Error clearing SVG:', e)
      return
    }
    
    const viewBox = svgRef.current.getAttribute('viewBox') || DEFAULT_VIEWBOX
    const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number)
    
    const snapToGrid = (value) => {
      return Math.round(value / 10) * 10
    }
    
    let currentY = vbY + 10
    const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
    const stageHeight = stageSection?.stageHeight || 80
    const stageWidth = stageSection?.stageWidth || (vbWidth - 100)
    const dancefloorHeight = 200
    const baseRowHeight = 30
    const baseSeatSpacing = 5
    let seatSpacing = baseSeatSpacing
    
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
    
    if (maxSeatsInRow === 0) {
      maxSeatsInRow = 10
    }
    
    const labelOffset = 30
    const sidePadding = 20
    const availableWidth = vbWidth - labelOffset - sidePadding * 2
    const maxRowWidth = availableWidth
    let calculatedSeatWidth = (maxRowWidth - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow
    
    if (calculatedSeatWidth < 3) {
      seatSpacing = Math.max(1, (maxRowWidth - maxSeatsInRow * 3) / Math.max(1, maxSeatsInRow - 1))
      calculatedSeatWidth = Math.max(2, (maxRowWidth - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow)
    }
    
    const balconySectionsForWidth = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    const leftBalconiesForWidth = balconySectionsForWidth.filter(s => s.position === 'left')
    const rightBalconiesForWidth = balconySectionsForWidth.filter(s => s.position === 'right')
    
    let leftBalconyMaxWidthForCalc = 0
    if (leftBalconiesForWidth.length > 0) {
      leftBalconiesForWidth.forEach((section) => {
        const widthPercent = section.widthPercent || 12
        const balconyWidth = (widthPercent / 100) * vbWidth
        leftBalconyMaxWidthForCalc = Math.max(leftBalconyMaxWidthForCalc, balconyWidth)
      })
    }
    
    let rightBalconyMaxWidthForCalc = 0
    if (rightBalconiesForWidth.length > 0) {
      rightBalconiesForWidth.forEach((section) => {
        const widthPercent = section.widthPercent || 12
        const balconyWidth = (widthPercent / 100) * vbWidth
        rightBalconyMaxWidthForCalc = Math.max(rightBalconyMaxWidthForCalc, balconyWidth)
      })
    }
    
    const leftBalconyEndXForCalc = vbX + 20 + leftBalconyMaxWidthForCalc
    const rightBalconyStartXForCalc = vbX + vbWidth - 20 - rightBalconyMaxWidthForCalc
    const availableStartXForCalc = Math.max(vbX + labelOffset, leftBalconyEndXForCalc + 5)
    const availableEndXForCalc = Math.min(vbX + vbWidth - 10, rightBalconyStartXForCalc - 5)
    const availableRowWidthForCalc = availableEndXForCalc - availableStartXForCalc
    
    let calculatedSeatWidthWithBalconies = (availableRowWidthForCalc - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow
    
    if (calculatedSeatWidthWithBalconies < 3) {
      seatSpacing = Math.max(1, (availableRowWidthForCalc - maxSeatsInRow * 3) / Math.max(1, maxSeatsInRow - 1))
      calculatedSeatWidthWithBalconies = Math.max(2, (availableRowWidthForCalc - (maxSeatsInRow - 1) * seatSpacing) / maxSeatsInRow)
    }
    
    const seatWidth = Math.max(2, Math.min(calculatedSeatWidthWithBalconies, 20))
    
    let rowsStartY = vbY + 10
    {
      const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (stageSection) {
        rowsStartY = vbY + stageHeight + 20 + 10
      }
    }
    
    const balconySectionsForRows = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    const bottomBalconiesForRows = balconySectionsForRows.filter(s => s.position === 'middle')
    let bottomBalconiesHeightForRows = 0
    if (bottomBalconiesForRows.length > 0) {
      bottomBalconiesForRows.forEach((section) => {
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const bottomPadding = 10
        bottomBalconiesHeightForRows = Math.max(bottomBalconiesHeightForRows, balconyHeight + bottomPadding + 10)
      })
    }
    
    let bottomBalconiesStartY = vbHeight
    if (bottomBalconiesForRows.length > 0) {
      bottomBalconiesForRows.forEach((section) => {
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const bottomPadding = 10
        const balconyY = vbHeight - balconyHeight - bottomPadding
        bottomBalconiesStartY = Math.min(bottomBalconiesStartY, balconyY)
      })
    }
    
    const rowsEndY = bottomBalconiesStartY - 5
    let availableHeightForRows = Math.max(0, rowsEndY - rowsStartY)
    
    let rowSpacing = 2
    let rowHeight = baseRowHeight
    
    if (totalRowsCount > 1 && availableHeightForRows > 0) {
      const totalRowsHeight = totalRowsCount * baseRowHeight
      const availableSpacing = availableHeightForRows - totalRowsHeight
      
      if (availableSpacing > 0) {
        const calculatedSpacing = availableSpacing / (totalRowsCount - 1)
        rowSpacing = Math.min(calculatedSpacing, 3)
        rowSpacing = Math.max(0.5, rowSpacing)
      } else {
        const minRowSpacing = 0.5
        const requiredHeight = totalRowsCount * baseRowHeight + (totalRowsCount - 1) * minRowSpacing
        if (requiredHeight > availableHeightForRows) {
          const maxTotalHeight = availableHeightForRows - (totalRowsCount - 1) * minRowSpacing
          rowHeight = Math.max(5, maxTotalHeight / totalRowsCount)
          rowSpacing = minRowSpacing
        } else {
          rowSpacing = minRowSpacing
        }
      }
    }
    
    let leftBalconyMaxWidth = 0
    let rightBalconyMaxWidth = 0
    const sideBalconiesForRows = balconySectionsForRows.filter(s => s.position === 'left' || s.position === 'right')
    sideBalconiesForRows.forEach(section => {
      const widthPercent = section.widthPercent || 12
      const balconyWidth = (widthPercent / 100) * vbWidth
      if (section.position === 'left') {
        leftBalconyMaxWidth = Math.max(leftBalconyMaxWidth, balconyWidth)
      } else if (section.position === 'right') {
        rightBalconyMaxWidth = Math.max(rightBalconyMaxWidth, balconyWidth)
      }
    })
    
    const leftMargin = Math.max(leftBalconyMaxWidth + 20 + 10, labelOffset)
    const rightMargin = rightBalconyMaxWidth + 20 + 10
    const availableWidthForRows = vbWidth - leftMargin - rightMargin
    
    {
      const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (stageSection) {
        const currentStageWidth = stageSection.stageWidth || (vbWidth - 100)
        const currentStageHeight = stageSection.stageHeight || 80
        
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
    
    let globalRowIndex = 0
    const rowSectionsOverlays = []
    const balconySeatsOverlays = []
    
    rowSections.forEach((section, sectionIndex) => {
      const rows = section.rows || []
      
      let sectionOffsetX = 0
      let sectionOffsetY = 0
      let baseRowY = rowsStartY
      
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        const totalRowsHeight = rows.length * (rowHeight + rowSpacing) - rowSpacing
        const initialCenterY = rowsStartY + totalRowsHeight / 2
        
        const initialCenterX = leftMargin + availableWidthForRows / 2
        
        sectionOffsetX = section.x - initialCenterX
        sectionOffsetY = section.y - initialCenterY
        
        baseRowY = rowsStartY + sectionOffsetY
      }
      
      let sectionMinX = Infinity
      let sectionMaxX = -Infinity
      let sectionMinY = Infinity
      let sectionMaxY = -Infinity
      let sectionSeatRadius = 0
      
      rows.forEach((row, localRowIndex) => {
        let rowY = baseRowY + globalRowIndex * (rowHeight + rowSpacing)
        if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
          rowY = baseRowY + localRowIndex * (rowHeight + rowSpacing)
        } else {
          rowY = rowsStartY + globalRowIndex * (rowHeight + rowSpacing)
        }
        
        if (rowY >= rowsEndY) {
          return
        }
        
        let actualRowHeight = rowHeight
        if (rowY + rowHeight > rowsEndY) {
          actualRowHeight = Math.max(5, rowsEndY - rowY) 
        }
        
        const seatsCount = row.seatsCount || 10
        const globalRowNumber = globalRowIndex + 1
        
        const leftBalconyEndX = vbX + 20 + leftBalconyMaxWidth
        const rightBalconyStartX = vbX + vbWidth - 20 - rightBalconyMaxWidth
        
        const availableStartX = Math.max(vbX + labelOffset, leftBalconyEndX + 5)
        const availableEndX = Math.min(vbX + vbWidth - 10, rightBalconyStartX - 5)
        const availableRowWidth = availableEndX - availableStartX
        
        let actualSeatWidth = seatWidth
        let actualSeatSpacing = seatSpacing
        
        const requiredWidth = seatsCount * (actualSeatWidth + actualSeatSpacing) - actualSeatSpacing
        
        if (requiredWidth > availableRowWidth) {
          actualSeatSpacing = Math.max(0.5, (availableRowWidth - seatsCount * actualSeatWidth) / Math.max(1, seatsCount - 1))
          
          const newRequiredWidth = seatsCount * (actualSeatWidth + actualSeatSpacing) - actualSeatSpacing
          if (newRequiredWidth > availableRowWidth) {
            actualSeatWidth = Math.max(2, (availableRowWidth - (seatsCount - 1) * actualSeatSpacing) / seatsCount)
          }
        }
        
        const rowWidth = seatsCount * (actualSeatWidth + actualSeatSpacing) - actualSeatSpacing
        
        const baseStartX = availableStartX + (availableRowWidth - rowWidth) / 2
        const startX = baseStartX + sectionOffsetX
        
        const seatRadius = Math.max(1, Math.min(actualSeatWidth, actualRowHeight) / 2 - 1)
        sectionSeatRadius = Math.max(sectionSeatRadius, seatRadius)
        
        for (let seatIndex = 0; seatIndex < seatsCount; seatIndex++) {
          const seatCenterX = startX + seatIndex * (actualSeatWidth + actualSeatSpacing) + actualSeatWidth / 2
          const seatCenterY = rowY + actualRowHeight / 2
          
          if (seatCenterX < leftBalconyEndX || seatCenterX > rightBalconyStartX) {
            continue
          }
          
          if (seatCenterY + seatRadius > rowsEndY) {
            continue
          }
          
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
          seat.setAttribute('data-section-id', String(section.id))
          seat.setAttribute('data-category', section.category || 'default')
          seat.setAttribute('data-row', String(globalRowNumber))
          seat.setAttribute('data-seat', String(seatIndex + 1))
          seat.style.cursor = 'pointer'
          seat.style.pointerEvents = 'none'
          
          svgRef.current.appendChild(seat)
          
          sectionMinX = Math.min(sectionMinX, seatCenterX - seatRadius)
          sectionMaxX = Math.max(sectionMaxX, seatCenterX + seatRadius)
          sectionMinY = Math.min(sectionMinY, seatCenterY - seatRadius)
          sectionMaxY = Math.max(sectionMaxY, seatCenterY + seatRadius)
        }
        
        const labelWidth = 30
        const extraPadding = 10
        sectionMinX = Math.min(sectionMinX, startX - labelWidth - extraPadding)
        sectionMaxX = Math.max(sectionMaxX, startX + rowWidth + extraPadding)
        sectionMinY = Math.min(sectionMinY, rowY - seatRadius - extraPadding)
        sectionMaxY = Math.max(sectionMaxY, rowY + actualRowHeight + seatRadius + extraPadding)
        
        const rowLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        rowLabel.setAttribute('data-section-id', String(section.id))
        
        let labelX = baseStartX - 20 + sectionOffsetX
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
        
        globalRowIndex++
      })
      
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
    
    if (totalRowsCount > 0) {
      currentY = rowsStartY + totalRowsCount * (rowHeight + rowSpacing) - rowSpacing + 20
    }
    
    const dancefloorSections = sections.filter(s => s.type === SECTION_TYPES.DANCEFLOOR)
    
    const balconySectionsForDancefloor = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    const bottomBalconiesForDancefloor = balconySectionsForDancefloor.filter(s => s.position === 'middle')
    let bottomBalconiesHeightForDancefloor = 0
    if (bottomBalconiesForDancefloor.length > 0) {
      bottomBalconiesForDancefloor.forEach((section) => {
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        bottomBalconiesHeightForDancefloor = Math.max(bottomBalconiesHeightForDancefloor, balconyHeight + 10)
      })
    }
    
    const availableHeightForDancefloor = (vbY + vbHeight) - currentY - bottomBalconiesHeightForDancefloor - 10
    
    dancefloorSections.forEach((section) => {
      const heightPercent = section.heightPercent || 25
      const dancefloorHeight = (heightPercent / 100) * availableHeightForDancefloor
      
      const widthPercent = section.widthPercent || 100
      const dancefloorWidth = (widthPercent / 100) * vbWidth
      
      const maxWidth = vbWidth - 100
      const finalWidth = Math.min(dancefloorWidth, maxWidth)
      
      let dancefloorX, dancefloorY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        dancefloorX = section.x - finalWidth / 2
        dancefloorY = section.y - dancefloorHeight / 2
      } else {
        dancefloorX = vbX + (vbWidth - finalWidth) / 2
        dancefloorY = currentY
      }
      
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
      dancefloorRect.setAttribute('data-category', section.category || 'dancefloor')
      dancefloorRect.setAttribute('data-count', String(section.count || 0))
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
      addSectionHandlers(dancefloorRect, String(section.id))
      if (section.x === null || section.x === undefined || section.y === null || section.y === undefined) {
      currentY += dancefloorHeight + 20
      }
    })
    
    const balconySections = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
    
    let stageBottomY = vbY
    let stageLeftX = vbX + 50
    let stageRightX = vbX + vbWidth - 50
    {
      const stageSection = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (stageSection) {
        const currentStageHeight = stageSection.stageHeight || 80
        stageBottomY = vbY + currentStageHeight + 20
      }
    }
    
    const sideBalconies = balconySections.filter(s => s.position === 'left' || s.position === 'right')
    const bottomBalconies = balconySections.filter(s => s.position === 'middle')
    const unpositionedBalconies = balconySections.filter(s => !s.position)
    
    let bottomBalconiesHeight = 0
    if (bottomBalconies.length > 0) {
      bottomBalconies.forEach((section) => {
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const bottomPadding = 10
        bottomBalconiesHeight = Math.max(bottomBalconiesHeight, balconyHeight + bottomPadding + 10)
      })
    }
    
    const verticalPadding = 10
    const balconySpacing = 15
    
    const leftBalconies = sideBalconies.filter(s => s.position === 'left')
    const rightBalconies = sideBalconies.filter(s => s.position === 'right')
    
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
    
    const totalPadding = 40 + 40
    const minSpaceBetween = 20
    const availableWidthPercent = 100 - (totalPadding + minSpaceBetween) / vbWidth * 100
    
    if (leftMaxWidthPercent + rightMaxWidthPercent > availableWidthPercent) {
      const scale = availableWidthPercent / (leftMaxWidthPercent + rightMaxWidthPercent)
      leftMaxWidthPercent = Math.min(leftMaxWidthPercent * scale, 50)
      rightMaxWidthPercent = Math.min(rightMaxWidthPercent * scale, 50)
    }
    
    const renderSideBalconies = (balconyGroup, position) => {
      if (balconyGroup.length === 0) return
      
      const startY = Math.max(stageBottomY, vbY + verticalPadding)
      const endY = vbHeight - verticalPadding - bottomBalconiesHeight
      const totalAvailableHeight = endY - startY
      const totalSpacing = (balconyGroup.length - 1) * balconySpacing
      const balconyHeight = (totalAvailableHeight - totalSpacing) / balconyGroup.length
      
      let balconyWidth, balconyX
      if (position === 'left') {
        const validatedWidthPercent = Math.min(leftMaxWidthPercent, 50)
        balconyWidth = (validatedWidthPercent / 100) * vbWidth
        balconyX = vbX + 20
      } else {
        const validatedWidthPercent = Math.min(rightMaxWidthPercent, 50)
        balconyWidth = (validatedWidthPercent / 100) * vbWidth
        balconyX = vbX + vbWidth - balconyWidth - 20
        
        if (leftBalconies.length > 0) {
          const leftBalconyMaxWidth = (Math.min(leftMaxWidthPercent, 50) / 100) * vbWidth
          const rightBalconyX = balconyX
          const leftBalconyEndX = vbX + 20 + leftBalconyMaxWidth
          const minSpaceBetween = 20
          
          if (rightBalconyX < leftBalconyEndX + minSpaceBetween) {
            const totalWidth = leftBalconyMaxWidth + balconyWidth
            const availableWidth = vbWidth - 40 - minSpaceBetween
            const scale = availableWidth / totalWidth
            balconyWidth = balconyWidth * scale
            balconyX = vbX + vbWidth - balconyWidth - 20
          }
        }
      }
      
      balconyGroup.forEach((section, balconyIndex) => {
        const balconyY = startY + balconyIndex * (balconyHeight + balconySpacing)
        
        const seatsPerRow = section.seatsPerRow || 4
        const rowsCount = section.rowsCount || 5
          
          const balconyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          balconyRect.setAttribute('x', balconyX)
          balconyRect.setAttribute('y', balconyY)
          balconyRect.setAttribute('width', balconyWidth)
          balconyRect.setAttribute('height', balconyHeight)
          balconyRect.setAttribute('fill', section.color || '#ff8800')
          balconyRect.setAttribute('fill-opacity', '0.3')
          balconyRect.setAttribute('stroke', '#000')
          balconyRect.setAttribute('stroke-width', '2')
          balconyRect.setAttribute('data-section-id', String(section.id))
          balconyRect.style.cursor = 'pointer'
          balconyRect.style.pointerEvents = 'all'
          
          const balconyType = section.balconyType || 'seats'
          
          if (balconyType === 'dancefloor') {
            balconyRect.setAttribute('data-category', section.category || 'balcony')
            balconyRect.setAttribute('data-count', String(section.count || 0))
            svgRef.current.appendChild(balconyRect)
            
            const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
            const balconyNumber = balconyIndex + 1
            let textToDisplay = section.label || `BALCONY ${positionLabel} ${balconyNumber} DANCE FLOOR`
            if (!textToDisplay.includes('DANCE FLOOR')) {
              textToDisplay = `${textToDisplay} DANCE FLOOR`
            }
            createMultilineText(
              svgRef.current,
              textToDisplay,
              balconyX + balconyWidth / 2,
              balconyY + balconyHeight / 2,
              balconyWidth - 20,
              14,
              '#fff',
              'bold'
            )
            
            addSectionHandlers(balconyRect, String(section.id))
          } else if (balconyType === 'tables') {
            svgRef.current.appendChild(balconyRect)
            addSectionHandlers(balconyRect, String(section.id))
            
            const balconyTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === section.id)
            
            if (balconyTables.length > 0) {
              balconyTables.forEach((balconyTable, tableIndex) => {
                let tableX, tableY
                if (balconyTable.x !== null && balconyTable.x !== undefined && 
                    balconyTable.y !== null && balconyTable.y !== undefined) {
                  tableX = balconyTable.x
                  tableY = balconyTable.y
                } else {
                  const tablesCount = balconyTables.length
                  if (tablesCount === 1) {
                    tableX = balconyX + balconyWidth / 2
                    tableY = balconyY + balconyHeight / 2
                  } else {
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
            const rowsCount = section.rowsCount || 0
            const seatsPerRow = section.seatsPerRow || 0
            
            if (rowsCount > 0 && seatsPerRow > 0) {
            const padding = 15
            const availableWidth = balconyWidth - padding * 2
            const availableHeight = balconyHeight - padding * 2 - 25
            
            const maxSeatWidth = availableWidth / rowsCount
            const maxSeatHeight = availableHeight / seatsPerRow
            const seatSize = Math.min(maxSeatWidth * 0.8, maxSeatHeight * 0.8, 15)
            const seatRadius = Math.max(1, seatSize / 2 - 0.5)
            
            const totalRowsWidth = rowsCount * seatSize
            const horizontalSpacing = rowsCount > 1 ? (availableWidth - totalRowsWidth) / (rowsCount - 1) : 0
            
            const totalSeatsHeight = seatsPerRow * seatSize
            const verticalSpacing = seatsPerRow > 1 ? (availableHeight - totalSeatsHeight) / (seatsPerRow - 1) : 0
            
            const startX = balconyX + padding + (availableWidth - totalRowsWidth - horizontalSpacing * (rowsCount - 1)) / 2
            const startSeatY = balconyY + padding + 25 + (availableHeight - totalSeatsHeight - verticalSpacing * (seatsPerRow - 1)) / 2
              
              let balconySeatsMinX = Infinity
              let balconySeatsMaxX = -Infinity
              let balconySeatsMinY = Infinity
              let balconySeatsMaxY = -Infinity
            
            for (let row = 0; row < rowsCount; row++) {
              for (let seat = 0; seat < seatsPerRow; seat++) {
                const seatCenterX = startX + row * (seatSize + horizontalSpacing) + seatSize / 2
                const seatCenterY = startSeatY + seat * (seatSize + verticalSpacing) + seatSize / 2
                  
                  balconySeatsMinX = Math.min(balconySeatsMinX, seatCenterX - seatRadius)
                  balconySeatsMaxX = Math.max(balconySeatsMaxX, seatCenterX + seatRadius)
                  balconySeatsMinY = Math.min(balconySeatsMinY, seatCenterY - seatRadius)
                  balconySeatsMaxY = Math.max(balconySeatsMaxY, seatCenterY + seatRadius)
                
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
                  seatCircle.style.pointerEvents = 'none'
                
                svgRef.current.appendChild(seatCircle)
              }
            }
              
              if (balconySeatsMinX !== Infinity && balconySeatsMaxX !== -Infinity && 
                  balconySeatsMinY !== Infinity && balconySeatsMaxY !== -Infinity) {
                balconySeatsOverlays.push({
                  sectionId: section.id,
                  minX: balconyX,
                  maxX: balconyX + balconyWidth,
                  minY: balconyY,
                  maxY: balconyY + balconyHeight
                })
              }
            }
            
            svgRef.current.appendChild(balconyRect)
            if (rowsCount === 0 || seatsPerRow === 0) {
              addSectionHandlers(balconyRect, String(section.id))
            } else {
              balconyRect.style.pointerEvents = 'none'
            }
          }
          
        if (balconyType !== 'dancefloor') {
        const labelText = section.label || `BALCONY ${position === 'left' ? 'L' : 'R'}`
        const textX = balconyX + balconyWidth / 2
        const textY = balconyY + 18
        const maxTextWidth = balconyWidth - 20
        createMultilineText(svgRef.current, labelText, textX, textY, maxTextWidth, 14, '#fff', 'bold')
        }
      })
    }
    
    renderSideBalconies(leftBalconies, 'left')
    renderSideBalconies(rightBalconies, 'right')
    
    unpositionedBalconies.forEach((section) => {
      const centerX = vbX + vbWidth / 2
      const centerY = vbY + vbHeight / 2
      const balconyWidth = 300
      const balconyHeight = 150
      
      const balconyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      balconyRect.setAttribute('x', centerX - balconyWidth / 2)
      balconyRect.setAttribute('y', centerY - balconyHeight / 2)
      balconyRect.setAttribute('width', balconyWidth)
      balconyRect.setAttribute('height', balconyHeight)
      balconyRect.setAttribute('fill', section.color || '#ff8800')
      balconyRect.setAttribute('fill-opacity', '0.3')
      balconyRect.setAttribute('stroke', '#000')
      balconyRect.setAttribute('stroke-width', '2')
      balconyRect.setAttribute('stroke-dasharray', '5,5')
      balconyRect.setAttribute('data-section-id', String(section.id))
      balconyRect.style.cursor = 'pointer'
      balconyRect.style.pointerEvents = 'all'
      
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
    
    if (bottomBalconies.length > 0) {
      const horizontalPadding = 20
      const bottomPadding = 10
      const totalSpacing = (bottomBalconies.length - 1) * balconySpacing
      const balconyWidth = (vbWidth - horizontalPadding * 2 - totalSpacing) / bottomBalconies.length
      
      bottomBalconies.forEach((section, balconyIndex) => {
        const seatsPerRow = section.seatsPerRow || 4
        const rowsCount = section.rowsCount || 5
        const heightPercent = section.heightPercent || 25
        const balconyHeight = (heightPercent / 100) * vbHeight
        const balconyX = vbX + horizontalPadding + balconyIndex * (balconyWidth + balconySpacing)
        const balconyY = vbHeight - balconyHeight - bottomPadding
        
        const balconyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        balconyRect.setAttribute('x', balconyX)
        balconyRect.setAttribute('y', balconyY)
        balconyRect.setAttribute('width', balconyWidth)
        balconyRect.setAttribute('height', balconyHeight)
        balconyRect.setAttribute('fill', section.color || '#ff8800')
        balconyRect.setAttribute('fill-opacity', '0.3')
        balconyRect.setAttribute('stroke', '#000')
        balconyRect.setAttribute('stroke-width', '2')
        balconyRect.setAttribute('data-section-id', String(section.id))
        balconyRect.style.cursor = 'pointer'
        balconyRect.style.pointerEvents = 'all'
        
        const balconyType = section.balconyType || 'seats'
        
        if (balconyType === 'dancefloor') {
          balconyRect.setAttribute('data-category', section.category || 'balcony')
          balconyRect.setAttribute('data-count', String(section.count || 0))
          svgRef.current.appendChild(balconyRect)
          
          const positionLabel = 'M'
          const balconyNumber = balconyIndex + 1
          let textToDisplay = section.label || `BALCONY ${positionLabel} ${balconyNumber} DANCE FLOOR`
          if (!textToDisplay.includes('DANCE FLOOR')) {
            textToDisplay = `${textToDisplay} DANCE FLOOR`
          }
          createMultilineText(
            svgRef.current,
            textToDisplay,
            balconyX + balconyWidth / 2,
            balconyY + balconyHeight / 2,
            balconyWidth - 20,
            14,
            '#fff',
            'bold'
          )
          
          addSectionHandlers(balconyRect, String(section.id))
        } else if (balconyType === 'tables') {
          svgRef.current.appendChild(balconyRect)
          addSectionHandlers(balconyRect, String(section.id))
          
          const balconyTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === section.id)
          
          if (balconyTables.length > 0) {
            balconyTables.forEach((balconyTable, tableIndex) => {
              let tableX, tableY
              if (balconyTable.x !== null && balconyTable.x !== undefined && 
                  balconyTable.y !== null && balconyTable.y !== undefined) {
                tableX = balconyTable.x
                tableY = balconyTable.y
              } else {
                const tablesCount = balconyTables.length
                if (tablesCount === 1) {
                  tableX = balconyX + balconyWidth / 2
                  tableY = balconyY + balconyHeight / 2
                } else {
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
          const rowsCount = section.rowsCount || 0
          const seatsPerRow = section.seatsPerRow || 0
          
          if (rowsCount > 0 && seatsPerRow > 0) {
          const padding = 15
          const availableWidth = balconyWidth - padding * 2
          const availableHeight = balconyHeight - padding * 2 - 25
          
          const maxSeatWidth = availableWidth / seatsPerRow
          const maxSeatHeight = availableHeight / rowsCount
          const seatSize = Math.min(maxSeatWidth * 0.8, maxSeatHeight * 0.8, 15)
          const seatRadius = Math.max(1, seatSize / 2 - 0.5)
          
          const totalSeatsWidth = seatsPerRow * seatSize
          const horizontalSpacing = seatsPerRow > 1 ? (availableWidth - totalSeatsWidth) / (seatsPerRow - 1) : 0
          
          const totalSeatsHeight = rowsCount * seatSize
          const verticalSpacing = rowsCount > 1 ? (availableHeight - totalSeatsHeight) / (rowsCount - 1) : 0
          
          const startX = balconyX + padding + (availableWidth - totalSeatsWidth - horizontalSpacing * (seatsPerRow - 1)) / 2
          const startSeatY = balconyY + padding + 25
            
            let bottomBalconySeatsMinX = Infinity
            let bottomBalconySeatsMaxX = -Infinity
            let bottomBalconySeatsMinY = Infinity
            let bottomBalconySeatsMaxY = -Infinity
          
          for (let row = 0; row < rowsCount; row++) {
            for (let seat = 0; seat < seatsPerRow; seat++) {
              const seatCenterX = startX + seat * (seatSize + horizontalSpacing) + seatSize / 2
              const seatCenterY = startSeatY + row * (seatSize + verticalSpacing) + seatSize / 2
                
                bottomBalconySeatsMinX = Math.min(bottomBalconySeatsMinX, seatCenterX - seatRadius)
                bottomBalconySeatsMaxX = Math.max(bottomBalconySeatsMaxX, seatCenterX + seatRadius)
                bottomBalconySeatsMinY = Math.min(bottomBalconySeatsMinY, seatCenterY - seatRadius)
                bottomBalconySeatsMaxY = Math.max(bottomBalconySeatsMaxY, seatCenterY + seatRadius)
              
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
                seatCircle.style.pointerEvents = 'none'
              
              svgRef.current.appendChild(seatCircle)
              }
            }
            
            if (bottomBalconySeatsMinX !== Infinity && bottomBalconySeatsMaxX !== -Infinity && 
                bottomBalconySeatsMinY !== Infinity && bottomBalconySeatsMaxY !== -Infinity) {
              balconySeatsOverlays.push({
                sectionId: section.id,
                minX: balconyX,
                maxX: balconyX + balconyWidth,
                minY: balconyY,
                maxY: balconyY + balconyHeight
              })
            }
          }
          
          svgRef.current.appendChild(balconyRect)
          if (rowsCount === 0 || seatsPerRow === 0) {
            addSectionHandlers(balconyRect, String(section.id))
          } else {
            balconyRect.style.pointerEvents = 'none'
          }
        }
        
        if (balconyType !== 'dancefloor') {
        const labelText = section.label || 'BALCONY M'
        const textX = balconyX + balconyWidth / 2
        const textY = balconyY + 18
        const maxTextWidth = balconyWidth - 20
        createMultilineText(svgRef.current, labelText, textX, textY, maxTextWidth, 14, '#fff', 'bold')
        }
      })
    }
    
    const barSections = sections.filter(s => s.type === SECTION_TYPES.BAR)
    barSections.forEach((section) => {
      let barX, barY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        barX = section.x
        barY = section.y
      } else {
        barX = vbX + vbWidth / 2
        barY = vbY + vbHeight / 2
      }
      
      barX = snapToGrid(barX)
      barY = snapToGrid(barY)
      
      const barWidth = section.width || 100
      const barHeight = section.height || 80
      
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
    
    const tableSections = sections.filter(s => s.type === SECTION_TYPES.TABLE && !s.balconyId)
    
    let maxSeatsAtTable = 0
    let maxSeatsOnSide = 0
    let minCircleRadius = Infinity
    let minSideLength = Infinity
    
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
      const seatDistanceFromEdge = 10
      
      if (shape === 'round') {
        const circleRadius = tableSize / 2 + seatDistanceFromEdge
        if (circleRadius < minCircleRadius) {
          minCircleRadius = circleRadius
        }
      } else if (shape === 'square') {
        const maxSeatsOnThisSide = Math.max(seatsTop, seatsRight, seatsBottom, seatsLeft)
        if (maxSeatsOnThisSide > maxSeatsOnSide) {
          maxSeatsOnSide = maxSeatsOnThisSide
        }
        if (tableSize < minSideLength) {
          minSideLength = tableSize
        }
      } else {
        const maxSeatsOnThisSide = Math.max(seatsTop, seatsRight, seatsBottom, seatsLeft)
        if (maxSeatsOnThisSide > maxSeatsOnSide) {
          maxSeatsOnSide = maxSeatsOnThisSide
        }
        let sideLength
        if (Math.max(seatsTop, seatsBottom) >= Math.max(seatsLeft, seatsRight)) {
          sideLength = tableSize
        } else {
          sideLength = tableHeight
        }
        if (sideLength < minSideLength) {
          minSideLength = sideLength
        }
      }
    })
    
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
    
    const circumference = 2 * Math.PI * minCircleRadius
    const minDistanceBetweenSeatsCircle = circumference / maxSeatsAtTable
    const calculatedSeatRadiusCircle = minDistanceBetweenSeatsCircle / 2
    
    const calculatedSeatRadiusSquare = minSideLength / (2 * (maxSeatsOnSide + 1))
    
    const calculatedSeatRadius = Math.min(calculatedSeatRadiusCircle, calculatedSeatRadiusSquare, 8)
    
    let finalSeatRadius = Math.max(2, calculatedSeatRadius)
    
    const renderTable = (section) => {
      let tableX, tableY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        tableX = section.x
        tableY = section.y
      } else {
        tableX = vbX + vbWidth / 2
        tableY = vbY + vbHeight / 2
      }
      
      tableX = snapToGrid(tableX)
      tableY = snapToGrid(tableY)
      const shape = section.shape || 'round'
      const tableSize = section.tableSize || 60
      const tableHeight = section.tableHeight || 40
      const seatRadius = finalSeatRadius
      const seatDistanceFromEdge = 10
      
      let maxRadius = 0
      if (shape === 'round') {
        maxRadius = tableSize / 2 + seatDistanceFromEdge + seatRadius
      } else if (shape === 'square') {
        const halfSize = tableSize / 2
        const diagonalRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize)
        maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
      } else {
        const halfWidth = tableSize / 2
        const halfHeight = tableHeight / 2
        const diagonalRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
        maxRadius = diagonalRadius + seatDistanceFromEdge + seatRadius
      }
      
      tableX = Math.max(vbX + maxRadius, Math.min(vbX + vbWidth - maxRadius, tableX))
      tableY = Math.max(vbY + maxRadius, Math.min(vbY + vbHeight - maxRadius, tableY))
      
      if (shape === 'round') {
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
        addSectionHandlers(tableCircle, String(section.id))
        
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        const totalSeats = seatsTop + seatsRight + seatsBottom + seatsLeft
        
        const circleRadius = tableSize / 2 + seatDistanceFromEdge
        const halfSize = tableSize / 2
        
        const categoryColorForTable = section.category 
          ? categories.find(c => c.value === section.category)?.color 
          : null
        const tableSeatColor = categoryColorForTable || '#ffaa00'
        
        const checkOverlap = (seatsCount) => {
          if (seatsCount <= 1) return false
          const spacing = tableSize / (seatsCount + 1)
          return spacing < 2 * seatRadius
        }
        
        const hasOverlap = checkOverlap(seatsTop) || checkOverlap(seatsRight) || 
                          checkOverlap(seatsBottom) || checkOverlap(seatsLeft)
        
        let seatIndex = 0
        
        if (hasOverlap) {
          for (let i = 0; i < totalSeats; i++) {
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
        addSectionHandlers(tableRect, String(section.id))
        
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        
        const halfSize = tableSize / 2
        const radius = halfSize + seatDistanceFromEdge
        
        const categoryColorForTable = section.category 
          ? categories.find(c => c.value === section.category)?.color 
          : null
        const tableSeatColor = categoryColorForTable || '#ffaa00'
        
        let seatIndex = 0
        
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
        addSectionHandlers(tableRect, String(section.id))
        
        const seatsTop = section.seatsTop || 0
        const seatsRight = section.seatsRight || 0
        const seatsBottom = section.seatsBottom || 0
        const seatsLeft = section.seatsLeft || 0
        
        const widthDist = tableSize / 2 + seatDistanceFromEdge
        const heightDist = tableHeight / 2 + seatDistanceFromEdge
        
        const categoryColorForTable = section.category 
          ? categories.find(c => c.value === section.category)?.color 
          : null
        const tableSeatColor = categoryColorForTable || '#ffaa00'
        
        let seatIndex = 0
        
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
    
    tableSections.forEach((section) => {
      renderTable(section)
    })
    
    const sofaSections = sections.filter(s => s.type === SECTION_TYPES.SOFA && !s.balconyId)
    
    const renderSofa = (section) => {
      let sofaX, sofaY
      if (section.x !== null && section.x !== undefined && section.y !== null && section.y !== undefined) {
        sofaX = section.x
        sofaY = section.y
      } else {
        sofaX = vbX + vbWidth / 2
        sofaY = vbY + vbHeight / 2
      }
      
      sofaX = snapToGrid(sofaX)
      sofaY = snapToGrid(sofaY)
      
      const sofaWidth = section.sofaWidth || 120
      const sofaHeight = section.sofaHeight || 60
      const seatsCount = section.seatsCount || 0
      
      const halfWidth = sofaWidth / 2
      const halfHeight = sofaHeight / 2
      sofaX = Math.max(vbX + halfWidth, Math.min(vbX + vbWidth - halfWidth, sofaX))
      sofaY = Math.max(vbY + halfHeight, Math.min(vbY + vbHeight - halfHeight, sofaY))
      
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
      
      const categoryColorForSofa = section.category 
        ? categories.find(c => c.value === section.category)?.color 
        : null
      const sofaSeatColor = categoryColorForSofa || section.seatColor || '#ffaa00'
      
      const padding = 5
      const fontSize = 14
      const textTopPadding = 3
      const textBottomPadding = 8
      
      const isVertical = sofaWidth < sofaHeight
      
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
              seatCircle.setAttribute('data-category', section.category || 'sofa')
              seatCircle.setAttribute('data-row', section.category || 'sofa')
              seatCircle.setAttribute('data-seat', String(i + 1))
              seatCircle.setAttribute('data-sofa-id', String(section.id))
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
    
    sofaSections.forEach((section) => {
      renderSofa(section)
    })
    
    rowSectionsOverlays.forEach((overlay) => {
      const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      overlayRect.setAttribute('x', overlay.minX)
      overlayRect.setAttribute('y', overlay.minY)
      overlayRect.setAttribute('width', overlay.maxX - overlay.minX)
      overlayRect.setAttribute('height', overlay.maxY - overlay.minY)
      overlayRect.setAttribute('fill', 'transparent')
      overlayRect.setAttribute('stroke', 'none')
      overlayRect.setAttribute('data-section-id', String(overlay.sectionId))
      overlayRect.setAttribute('data-temp-overlay', 'true') 
      overlayRect.style.cursor = 'pointer'
      overlayRect.style.pointerEvents = 'all'
      
      svgRef.current.appendChild(overlayRect)
      
      addSectionHandlers(overlayRect, String(overlay.sectionId))
    })
    
    balconySeatsOverlays.forEach((overlay) => {
      const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      overlayRect.setAttribute('x', overlay.minX)
      overlayRect.setAttribute('y', overlay.minY)
      overlayRect.setAttribute('width', overlay.maxX - overlay.minX)
      overlayRect.setAttribute('height', overlay.maxY - overlay.minY)
      overlayRect.setAttribute('fill', 'transparent')
      overlayRect.setAttribute('stroke', 'none')
      overlayRect.setAttribute('data-section-id', String(overlay.sectionId))
      overlayRect.setAttribute('data-temp-overlay', 'true')
      overlayRect.style.cursor = 'pointer'
      overlayRect.style.pointerEvents = 'all'
      
      svgRef.current.appendChild(overlayRect)
      
      addSectionHandlers(overlayRect, String(overlay.sectionId))
    })
    
    balconySeatsOverlays.forEach((overlay) => {
      const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      overlayRect.setAttribute('x', overlay.minX)
      overlayRect.setAttribute('y', overlay.minY)
      overlayRect.setAttribute('width', overlay.maxX - overlay.minX)
      overlayRect.setAttribute('height', overlay.maxY - overlay.minY)
      overlayRect.setAttribute('fill', 'transparent')
      overlayRect.setAttribute('stroke', 'none')
      overlayRect.setAttribute('data-section-id', String(overlay.sectionId))
      overlayRect.setAttribute('data-temp-overlay', 'true')
      overlayRect.style.cursor = 'pointer'
      overlayRect.style.pointerEvents = 'all'
      
      svgRef.current.appendChild(overlayRect)
      
      addSectionHandlers(overlayRect, String(overlay.sectionId))
    })
    
    if (notifyChangeTimeoutRef.current) {
      clearTimeout(notifyChangeTimeoutRef.current)
    }
    notifyChangeTimeoutRef.current = setTimeout(() => {
    notifyChange()
    }, 100)
  }, [sections, categories, notifyChange, addSectionHandlers, removeSectionHandlers])
  

  useEffect(() => {
    if (draggingTableId) {
      return
    }
    
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current)
    }
    
    generateTimeoutRef.current = setTimeout(() => {
      generateScheme()
    }, 50) 
    
    return () => {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current)
      }
    }
  }, [sections, generateScheme, draggingTableId])

  const handleAddSection = useCallback((type, position = null) => {
    if (type === SECTION_TYPES.STAGE) {
      const existingStage = sections.find(s => s.type === SECTION_TYPES.STAGE)
      if (existingStage) {
        return
      }
    }
    
    let defaultLabel = ''
    if (type === SECTION_TYPES.STAGE) {
      defaultLabel = 'STAGE'
    } else if (type === SECTION_TYPES.DANCEFLOOR) {
      const existingDancefloors = sections.filter(s => s.type === SECTION_TYPES.DANCEFLOOR)
      const dancefloorNumber = existingDancefloors.length + 1
      defaultLabel = `DANCE FLOOR ${dancefloorNumber}`
    } else if (type === SECTION_TYPES.ROWS) {
      const existingRows = sections.filter(s => s.type === SECTION_TYPES.ROWS)
      const rowsNumber = existingRows.length + 1
      defaultLabel = `ROWS ${rowsNumber}`
    } else if (type === SECTION_TYPES.BALCONY) {
      const existingBalconies = sections.filter(s => s.type === SECTION_TYPES.BALCONY)
      const balconyNumber = existingBalconies.length + 1
        defaultLabel = `BALCONY ${balconyNumber}`
    } else if (type === SECTION_TYPES.BAR) {
      defaultLabel = 'BAR'
    } else if (type === SECTION_TYPES.TABLE) {
      const existingTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && !s.balconyId)
      const tableNumber = existingTables.length + 1
      defaultLabel = `TABLE ${tableNumber}`
    } else if (type === SECTION_TYPES.SOFA) {
      const existingSofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && !s.balconyId)
      const sofaNumber = existingSofas.length + 1
      defaultLabel = `SOFA ${sofaNumber}`
    }
    
    let categoryValue = null
    if (type !== SECTION_TYPES.STAGE && type !== SECTION_TYPES.BAR) {
      const defaultCategory = defaultLabel.toLowerCase().replace(/\s+/g, '_')
      categoryValue = defaultCategory
      
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
      category: categoryValue, 
      color: '#cccccc',
      ...(type === SECTION_TYPES.ROWS && { 
        rows: [{
          rowNumber: 1,
          seatsCount: 10
        }]
      }),
      ...(type === SECTION_TYPES.STAGE && { 
        stageWidth: 900, 
        stageHeight: 80 
      }),
      ...(type === SECTION_TYPES.DANCEFLOOR && { 
        count: 0, 
        heightPercent: 25, 
        widthPercent: 100 
      }),
      ...(type === SECTION_TYPES.BALCONY && { 
        position: null, 
        balconyType: 'seats', 
        seatsPerRow: 0,
        rowsCount: 0,
        widthPercent: 12, 
        heightPercent: null, 
        seatColor: '#ffaa00',
        count: 0, 
        tableId: null, 
        x: null, 
        y: null 
      }),
      ...(type === SECTION_TYPES.BAR && { 
        width: 100, 
        height: 80,
        x: null, 
        y: null 
      }),
      ...(type === SECTION_TYPES.TABLE && { 
        shape: 'round', 
        seatsTop: 0, 
        seatsRight: 0, 
        seatsBottom: 0, 
        seatsLeft: 0, 
        tableSize: 60, 
        tableHeight: 40, 
        x: null, 
        y: null, 
        seatColor: '#ffaa00'
      }),
      ...(type === SECTION_TYPES.SOFA && { 
        sofaWidth: 120, 
        sofaHeight: 60,
        seatsCount: 0, 
        x: null, 
        y: null, 
        seatColor: '#ffaa00'
      })
    }
    setSections(prev => [...prev, newSection])
    setActiveSection(newSection.id)
  }, [categories, sections, onCategoriesChange])

  const handleDeleteSection = useCallback((id) => {
    setSections(prev => {
      const deletedSection = prev.find(s => s.id === id)
      const remainingSections = prev.filter(s => s.id !== id)
      
      if (deletedSection && deletedSection.category && onCategoriesChange) {
        const categoryStillUsed = remainingSections.some(s => s.category === deletedSection.category)
        
        if (!categoryStillUsed) {
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

  useEffect(() => {
    if (isModalVisible && modalSectionId && modalSection) {
      const data = JSON.parse(JSON.stringify(modalSection))
      
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
      
      if (modalSection.type === SECTION_TYPES.BALCONY && modalSection.balconyType === 'tables') {
        const balconyTable = sections.find(s => s.type === SECTION_TYPES.TABLE && s.balconyId === modalSectionId)
        if (balconyTable) {
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
      setModalSectionData(null)
    }
  }, [isModalVisible, modalSectionId, modalSection, sections])

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
      
      <SectionActionMenu
        visible={actionMenuVisible}
        position={actionMenuPosition}
        onDrag={handleDragSection}
        onConfigure={handleConfigureSection}
        onClose={closeActionMenu}
        isDraggable={actionMenuSectionId ? (() => {
          const section = sections.find(s => s.id === actionMenuSectionId)
          if (!section) return false
          
          if (section.type === SECTION_TYPES.BALCONY && section.position) {
            return false
          }
          
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
      
      <SectionModal
        open={isModalVisible}
        section={modalSection}
        formData={modalSectionData}
        setFormData={setModalSectionData}
        onOk={() => {
          if (modalSectionData && modalSectionId) {
            const originalSection = sections.find(s => s.id === modalSectionId)
            if (originalSection && (originalSection.type === SECTION_TYPES.TABLE || originalSection.type === SECTION_TYPES.SOFA)) {
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
              const balcony = sections.find(s => s.id === originalSection.balconyId)
              if (balcony) {
                const position = balcony.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                let balconyNumber = 1
                if (balcony.label) {
                  const match = balcony.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
                  } else {
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== balcony.id
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== balcony.id
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                const balconyTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === originalSection.balconyId)
                const tableIndex = balconyTables.findIndex(t => t.id === originalSection.id)
                const tableNumber = tableIndex >= 0 ? tableIndex + 1 : balconyTables.length + 1
                
                const tableLabel = `BALCONY ${positionLabel} ${balconyNumber} TABLE ${tableNumber}`
                const tableCategoryName = `${balcony.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_table_${tableNumber}`
                
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
                  balconyId: originalSection.balconyId 
                }
                handleUpdateSection(modalSectionId, updatedData)
              } else {
                handleUpdateSection(modalSectionId, modalSectionData)
              }
            } else if (originalSection && originalSection.type === SECTION_TYPES.SOFA && originalSection.balconyId) {
              const balcony = sections.find(s => s.id === originalSection.balconyId)
              if (balcony) {
                const position = balcony.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                let balconyNumber = 1
                if (balcony.label) {
                  const match = balcony.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
                  } else {
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== balcony.id
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== balcony.id
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                const balconySofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === originalSection.balconyId)
                const sofaIndex = balconySofas.findIndex(t => t.id === originalSection.id)
                const sofaNumber = sofaIndex >= 0 ? sofaIndex + 1 : balconySofas.length + 1
                
                const sofaLabel = `BALCONY ${positionLabel} ${balconyNumber} SOFA ${sofaNumber}`
                const sofaCategoryName = `${balcony.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_sofa_${sofaNumber}`
                
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
                  balconyId: originalSection.balconyId 
                }
                handleUpdateSection(modalSectionId, updatedData)
              } else {
                handleUpdateSection(modalSectionId, modalSectionData)
              }
            } else if (originalSection && originalSection.type === SECTION_TYPES.BALCONY) {
              const updatedData = { ...modalSectionData }
              
              if (modalSectionData.balconyType === 'dancefloor') {
                const position = originalSection.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                const samePositionBalconies = sections.filter(s => 
                  s.type === SECTION_TYPES.BALCONY && 
                  s.position === position && 
                  s.id !== originalSection.id
                )
                const balconyNumber = samePositionBalconies.length + 1
                
                const balconyLabel = `BALCONY ${positionLabel} ${balconyNumber} DANCE FLOOR`
                const balconyCategoryName = `balcony_${positionLabel.toLowerCase()}_${balconyNumber}_dance_floor`
                
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
              
              if (modalSectionData.balconyType === 'tables') {
                const position = originalSection.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                let balconyNumber = 1
                if (originalSection.label) {
                  const match = originalSection.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
                  } else {
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== modalSectionId
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== modalSectionId
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                const tablesCount = modalSectionData.tablesCount || 1
                
                const existingTables = sections.filter(s => s.type === SECTION_TYPES.TABLE && s.balconyId === modalSectionId)
                
                if (existingTables.length > tablesCount) {
                  const tablesToDelete = existingTables.slice(tablesCount)
                  setSections(prev => prev.filter(s => !tablesToDelete.some(t => t.id === s.id)))
                }
                
                for (let i = 0; i < tablesCount; i++) {
                  const tableNumber = i + 1 
                  const tableLabel = `BALCONY ${positionLabel} ${balconyNumber} TABLE ${tableNumber}`
                  const tableCategoryName = `${modalSectionData.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_table_${tableNumber}`
                  
                  const existingTable = existingTables[i]
                  
                  if (existingTable) {
                    handleUpdateSection(existingTable.id, {
                      ...existingTable,
                      label: tableLabel,
                      category: tableCategoryName
                    })
                  } else {
                    const newTable = {
                      id: Date.now() + i,
                      type: SECTION_TYPES.TABLE,
                      label: tableLabel,
                      category: tableCategoryName,
                      color: modalSectionData.color || '#8B4513',
                      seatColor: modalSectionData.seatColor || '#ffaa00',
                      shape: 'round', 
                      tableSize: 60, 
                      tableHeight: 40, 
                      seatsTop: 0, 
                      seatsRight: 0,
                      seatsBottom: 0,
                      seatsLeft: 0,
                      balconyId: modalSectionId, 
                      x: null, 
                      y: null
                    }
                    setSections(prev => [...prev, newTable])
                  }
                  
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
                const position = originalSection.position || 'left'
                const positionLabel = position === 'left' ? 'L' : position === 'right' ? 'R' : 'M'
                
                let balconyNumber = 1
                if (originalSection.label) {
                  const match = originalSection.label.match(/\s+(\d+)/)
                  if (match) {
                    balconyNumber = parseInt(match[1], 10)
              } else {
                    const samePositionBalconies = sections.filter(s => 
                      s.type === SECTION_TYPES.BALCONY && 
                      s.position === position && 
                      s.id !== modalSectionId
                    )
                    balconyNumber = samePositionBalconies.length + 1
                  }
                } else {
                  const samePositionBalconies = sections.filter(s => 
                    s.type === SECTION_TYPES.BALCONY && 
                    s.position === position && 
                    s.id !== modalSectionId
                  )
                  balconyNumber = samePositionBalconies.length + 1
                }
                
                const sofasCount = modalSectionData.sofasCount || 1
                
                const existingSofas = sections.filter(s => s.type === SECTION_TYPES.SOFA && s.balconyId === modalSectionId)
                
                if (existingSofas.length > sofasCount) {
                  const sofasToDelete = existingSofas.slice(sofasCount)
                  setSections(prev => prev.filter(s => !sofasToDelete.some(t => t.id === s.id)))
                }
                
                for (let i = 0; i < sofasCount; i++) {
                  const sofaNumber = i + 1 
                  const sofaLabel = `BALCONY ${positionLabel} ${balconyNumber} SOFA ${sofaNumber}`
                  const sofaCategoryName = `${modalSectionData.category || `balcony_${positionLabel.toLowerCase()}_${balconyNumber}`}_sofa_${sofaNumber}`
                  
                  const existingSofa = existingSofas[i]
                  
                  if (existingSofa) {
                    handleUpdateSection(existingSofa.id, {
                      ...existingSofa,
                      label: sofaLabel,
                      category: sofaCategoryName
                    })
                  } else {
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
                      seatsCount: 0, 
                      balconyId: modalSectionId, 
                      x: null, 
                      y: null
                    }
                    setSections(prev => [...prev, newSofa])
                  }
                  
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
