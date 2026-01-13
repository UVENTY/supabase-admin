import { useEffect, useMemo, useState } from 'react'
import cn from 'classnames'
import s from './svg-scheme.module.scss'

export default function SvgSchemeTooltop({
  for: el,
  className,
  children,
}) {  
  const [ styles, setStyles ] = useState()

  useEffect(() => {
    const isElem = el instanceof Element
    const isString = typeof el === 'string'
    if (!isElem && !isString) {
      setStyles()
      return
    }
    const target = isElem ? el : document.querySelector(el)
    if (target) {
      const { x: left, y: top, width } = target.getBBox()
      setStyles({ left: left, top, opacity: 1 })
    }
  }, [el])
  return (
    <div className={cn(s.svgSchemeTooltip, className)} style={styles}>
      {children}
    </div>
  )
}