import cn from 'classnames'
import s from './svg-scheme.module.scss'

export default function SvgSchemeSeatPreview({
  className,
  category,
  categories,
  price,
  row,
  seat,
  text,
  icon,
  color,
  footer
}) {
  const cat = categories.find(c => c.value === category)
  const svg = icon || cat?.icon
  const clr = color || cat?.color || '#fff'
  const val = [category, row, seat].join(';')
  return (
    <div className={cn(s.preview, className)}>
      <div className={s.block}>
        <div className={s.price}>{price}</div>
        {!svg ? <div /> : <div className={s.icon} style={{ color: clr }} dangerouslySetInnerHTML={{ __html: svg }} />}
      </div>
      <div className={s.block} style={{ color: clr }}>
        <div className={s.category}>{cat?.label}</div>
        <div className={s.text}>{text}</div>
      </div>
      {!!row && !!seat && <div className={s.block}>
        <div className={s.row}><span>Row </span>{row}</div>
        <div className={s.seat}><span>Seat </span>{seat}</div>
      </div>}
      {!!footer && <div className={s.footer}>{footer}</div>}
    </div>
  )
}