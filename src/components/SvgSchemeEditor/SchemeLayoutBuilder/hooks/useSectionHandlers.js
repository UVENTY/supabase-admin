import { useCallback } from 'react'
import { SECTION_TYPES, DEFAULT_VIEWBOX } from '../constants'

export const useSectionHandlers = ({
  svgRef,
  sections,
  draggingTableId,
  showActionMenu,
  justFinishedDragging = false
}) => {
  const addSectionHandlers = useCallback((element, sectionId) => {
    if (!element || !sectionId) return
    
    if (element._sectionHandlers) {
      removeSectionHandlers(element)
    }
    
    const sectionIdNum = parseInt(sectionId, 10)
    const section = sections.find(s => s.id === sectionIdNum)
    const isTable = section && section.type === SECTION_TYPES.TABLE
    const isBar = section && section.type === SECTION_TYPES.BAR
    const isRows = section && section.type === SECTION_TYPES.ROWS
    const isBalcony = section && section.type === SECTION_TYPES.BALCONY
    const isDancefloor = section && section.type === SECTION_TYPES.DANCEFLOOR
    const isDraggable = isTable || isBar || isRows || isBalcony || isDancefloor
    
    const handleMouseEnter = () => {
      const currentStroke = element.getAttribute('stroke') || '#000'
      const currentStrokeWidth = element.getAttribute('stroke-width') || '2'
      element.setAttribute('data-original-stroke', currentStroke)
      element.setAttribute('data-original-stroke-width', currentStrokeWidth)
      element.setAttribute('stroke', '#1890ff')
      element.setAttribute('stroke-width', '4')
    }
    
    const handleMouseLeave = () => {
      if (draggingTableId !== sectionIdNum) {
        const originalStroke = element.getAttribute('data-original-stroke') || '#000'
        const originalStrokeWidth = element.getAttribute('data-original-stroke-width') || '2'
        element.setAttribute('stroke', originalStroke)
        element.setAttribute('stroke-width', originalStrokeWidth)
      }
    }
    
    const handleClick = (e) => {
      if (draggingTableId === sectionIdNum) {
        return
      }
      
      e.preventDefault()
      e.stopPropagation()
      
      const svg = svgRef.current
      if (!svg || !showActionMenu) return
      
      const menuX = e.clientX
      const menuY = e.clientY
      
      showActionMenu(sectionIdNum, { x: menuX, y: menuY })
    }
    
    const handleMouseDown = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const handleMouseUp = (e) => {

    }
    
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)
    element.addEventListener('click', handleClick)
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mouseup', handleMouseUp)
    
    element.style.userSelect = 'none'
    element.style.webkitUserSelect = 'none'
    element.style.mozUserSelect = 'none'
    element.style.msUserSelect = 'none'
    element.style.cursor = 'pointer'
    
    element._sectionHandlers = {
      mouseenter: handleMouseEnter,
      mouseleave: handleMouseLeave,
      click: handleClick,
      mousedown: handleMouseDown,
      mouseup: handleMouseUp
    }
  }, [sections, draggingTableId, svgRef, showActionMenu])
  
  const removeSectionHandlers = useCallback((element) => {
    if (!element || !element._sectionHandlers) return
    
    const handlers = element._sectionHandlers
    element.removeEventListener('mouseenter', handlers.mouseenter)
    element.removeEventListener('mouseleave', handlers.mouseleave)
    element.removeEventListener('click', handlers.click)
    element.removeEventListener('mousedown', handlers.mousedown)
    element.removeEventListener('mouseup', handlers.mouseup)
    delete element._sectionHandlers
  }, [])
  
  return { addSectionHandlers, removeSectionHandlers }
}
