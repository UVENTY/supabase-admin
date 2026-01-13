import cn from 'classnames'
import s from './layout.module.scss'

export default function Sidebar({ buttons, sticky, children }) {
  return (
    <div
      className={cn(s.sidebar, {
        [s.sidebar__buttons]: buttons,
        [s.sidebar__sticky]: sticky
      })}
    >
      <div>
        {children}
      </div>
    </div>
  )
}