import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import s from './svg-scheme.module.scss'
import SvgSchemeTooltop from './tooltip'
import { useClickPrevention } from '../../utils/hooks'

const SvgScheme = forwardRef(({
  categories = [],
  seatSelector = '.svg-seat',
  src,
  tooltip,
  onSeatClick,
  onSeatDoubleClick,
  onSeatOver,
  onSeatOut,
}, ref) => {
  const initial = useRef(src)
  useEffect(() => {
    if (!initial.current) initial.current = src
    else if (!src) {
      ref.current.innerHTML = null
      initial.current = null
    } else {
      // Убеждаемся, что SVG имеет фон #2a2a2a при загрузке
      if (src) {
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(src, 'image/svg+xml')
          const svg = doc.querySelector('svg')
          if (svg) {
            // Если у SVG нет фона, устанавливаем #2a2a2a
            const style = svg.getAttribute('style') || ''
            if (!style.includes('background')) {
              const currentStyle = style ? style + '; ' : ''
              svg.setAttribute('style', currentStyle + 'background: #2a2a2a;')
              const serializer = new XMLSerializer()
              initial.current = serializer.serializeToString(doc)
            } else {
              initial.current = src
            }
          } else {
            initial.current = src
          }
        } catch (e) {
          initial.current = src
        }
      }
    }
  }, [src])
  
  // Обновляем DOM при изменении initial.current
  useEffect(() => {
    if (ref.current && initial.current) {
      ref.current.innerHTML = initial.current
    } else if (ref.current && !initial.current) {
      ref.current.innerHTML = ''
    }
  }, [initial.current])
  const handleMouseEvent = useCallback((e, cb) => {
    const { target: el } = e
    if (!el.matches(seatSelector)) return
    cb && cb(e)
  })
  
  const handleMouseOver = useCallback(e => {
    const { target: el } = e
    if (!el.matches(seatSelector)) return;
    if (tooltip) setTooltipSeat(el)
    onSeatOver && onSeatOver(e)
  }, [tooltip])

  const handleMouseOut = useCallback(e => {
    const { target: el } = e
    if (!el.matches(seatSelector)) return;
    if (tooltip) setTooltipSeat(null)
    onSeatOut && onSeatOut(e)
  }, [])

  const [ tooltipSeat, setTooltipSeat ] = useState()
  const [ handleClick, handleDblClick ] = useClickPrevention({
    onClick: e => handleMouseEvent(e, onSeatClick),
    onDoubleClick: e => handleMouseEvent(e, onSeatDoubleClick),
    delay: 200
  })

  const styles = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc += `
        .svg-seat[data-category="${cat.value}"] { fill: ${cat.color}; }
        .svg-seat[data-category="${cat.value}"]:not([data-disabled]):hover { stroke: ${cat.color}; stroke-width: 3px; }
        .svg-scheme-icon-cat-${cat.value} { color: ${cat.color}; }
        .svg-scheme-bg-cat-${cat.value} { background-color: ${cat.color}; }
      `
      return acc
    }, `
      .svg-seat:not([data-disabled]) { cursor: pointer; }
      .svg-seat[data-disabled] { fill: #666 !important; }
      .svg-seat.active { stroke: #ffffff !important; stroke-width: 2px; }
    `)
  }, [categories])

  return (
    <div className={s.scheme}>
      {!!tooltip && <SvgSchemeTooltop for={tooltipSeat}>
        {!!tooltipSeat && tooltip(Object.assign({}, tooltipSeat.dataset))}  
      </SvgSchemeTooltop>}
      <style>{styles}</style>
      <div
        ref={ref}
        className={s.svgContainer}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onMouseOver={e => handleMouseEvent(e, handleMouseOver)}
        onMouseOut={e => handleMouseEvent(e, handleMouseOut)}
      />
    </div>
  )
})

export default SvgScheme

export { default as SeatPreview } from './preview'