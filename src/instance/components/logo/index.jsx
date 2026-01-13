import { Tooltip } from 'antd'
import s from './logo.module.scss'

export default function Logo() {
  return (
    <div className={s.logo}>
      <span><Tooltip title='Create' color='#0476D0'>C</Tooltip></span>
      <span><Tooltip title='Read' color='#0476D0'>R</Tooltip></span>
      <span><Tooltip title='Update' color='#0476D0'>U</Tooltip></span>
      <span><Tooltip title='Tickets' color='#0476D0'>T</Tooltip></span>
    </div>
  ) 
}