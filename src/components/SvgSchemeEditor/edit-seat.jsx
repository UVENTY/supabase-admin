import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Card, Checkbox, ColorPicker, Flex, Input, InputNumber, Select, Typography, Upload } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { mapValues } from 'lodash'
import cn from 'classnames'
import InputSvg from '../InputSvg'
import s from './svg-scheme-editor.module.scss'
import { axios } from '../../api/axios'
import { downloadBlob, setCurrentColor } from '../../utils/utils'
import { API_URL } from '../../consts'
import { getTicketPdf } from '../../api/tickets/request'

const { Title } = Typography

const isArray = val => (ifTrue, ifFalse = val) => Array.isArray(val) ? ifTrue : ifFalse

export default function SvgSchemeEditSeat({
  tickets = [],
  categories = [],
  fields = [],
  seats = [],
  onOk,
  onChange,
  changedPrice = {},
  hallId
}) {
  const formRef = useRef()
  const [ changedValues, setChangedValue ] = useState({})

  useEffect(() => {
    if (seats.length === 1) {
      const seat = seats[0]
      const seatCategory = seat.dataset.category
      const seatRow = seat.dataset.row
      const seatSeat = seat.dataset.seat
      const hallIdStr = hallId ? String(hallId) : null
      const changedPriceKey = hallIdStr
        ? [hallIdStr, seatCategory, seatRow, seatSeat].filter(Boolean).join(';')
        : [seatCategory, seatRow, seatSeat].filter(Boolean).join(';')
      
      if (changedPrice[changedPriceKey] !== undefined) {
        if (typeof changedPrice[changedPriceKey] === 'object' && changedPrice[changedPriceKey] !== null) {
          setChangedValue(prev => ({
            ...prev,
            price: changedPrice[changedPriceKey].price !== undefined ? changedPrice[changedPriceKey].price : prev.price,
            count: changedPrice[changedPriceKey].count !== undefined ? changedPrice[changedPriceKey].count : prev.count
          }))
        } else {
          setChangedValue(prev => ({
            ...prev,
            price: changedPrice[changedPriceKey]
          }))
        }
      }
    }
  }, [seats, changedPrice, hallId])
  
  const handleChange = (name, value) => {
    setChangedValue(prev => {
      const newValues = {
        ...prev,
        [name]: value
      }
      if (onChange) {
        setTimeout(() => onChange(newValues), 0)
      }
      return newValues
    })
  }
  
  const getDisplayValue = (name, defaultValue) => {
    if (changedValues.hasOwnProperty(name) && changedValues[name] !== undefined && changedValues[name] !== null) {
      return changedValues[name]
    }
    if (defaultValue === undefined || defaultValue === null || defaultValue === '') {
      return undefined
    }
    if (typeof defaultValue === 'number') {
      return defaultValue
    }
    if (typeof defaultValue === 'string') {
      const num = Number(defaultValue)
      return isNaN(num) ? undefined : num
    }
    if (typeof defaultValue === 'object') {
      return undefined
    }
    return defaultValue
  }

  const fieldsToShow = useMemo(() => fields.filter(f => seats.length > 1 ? f.groupEditable : true), [seats, fields])

  const seatsData = useMemo(() => seats.map(seat => Object.assign({}, seat.dataset)), [seats])

  const values = useMemo(() => mapValues(
    seats.reduce((acc, el) => {
      const data = Object.assign({}, el.dataset)
      // Всегда включаем row и seat для правильного определения типа места
      const keys = ['category', 'row', 'seat'].concat(fieldsToShow.map(f => f.value))
      keys.forEach(field => {
        const val = data[field] || null
        if (!acc[field]) acc[field] = [val]
        else if (!acc[field].includes(val)) acc[field].push(val)
      })
      return acc
    }, {}),
    val => val.length <= 1 ? (val[0] || null) : val
  ), [seats, fieldsToShow])

  const { disabled, category, row, seat, price, count, busyCount } = values
  
  // Проверяем, есть ли у выбранных мест row и seat (для обычных мест)
  // Если row и seat - массивы, проверяем, что хотя бы одно место имеет row и seat
  const hasRowAndSeat = Array.isArray(row) ? row.some(r => r && r !== '-1' && r !== null && r !== '') : (row && row !== '-1' && row !== null && row !== '')
  const hasSeat = Array.isArray(seat) ? seat.some(s => s && s !== null && s !== '') : (seat && seat !== null && seat !== '')
  const isRegularSeat = hasRowAndSeat && hasSeat
  
  const isDisabled = disabled === 'true'
  const ticket = tickets.find(item => String(item.section) === String(category) && (String(item.row) === '-1' || (String(item.row) === String(row) && String(item.seat) === String(seat))))

  const { inputPrice, inputCount, inputBusyCount, groupPrice } = useMemo(() => {
    let inputPrice = '';
    let inputCount = '';
    let inputBusyCount = '';
    let groupPrice = '';
    
    if (seats.length === 1) {
      const seat = seats[0];
      const seatCategory = seat.dataset.category;
      const seatRow = seat.dataset.row;
      const seatSeat = seat.dataset.seat;
      const hallIdStr = hallId ? String(hallId) : null
      const changedPriceKey = hallIdStr
        ? [hallIdStr, seatCategory, seatRow, seatSeat].filter(Boolean).join(';')
        : [seatCategory, seatRow, seatSeat].filter(Boolean).join(';');
      
      let ticket = tickets.find(
        t => String(t.section) === String(seatCategory)
          && String(t.row) === String(seatRow)
          && String(t.seat) === String(seatSeat)
      );
      if (!ticket) {
        ticket = tickets.find(
          t => String(t.section) === String(seatCategory)
            && String(t.row) === '-1'
        );
      }
      
      if (!seatRow || !seatSeat || seatRow === '-1') {
        const nonSeatTickets = tickets.filter(
          t => String(t.section) === String(seatCategory) && String(t.row) === '-1'
        )

        const freeTicketsCount = nonSeatTickets.filter(
          t => !t.is_sold && !t.is_reserved && t.status !== 3 && t.status !== 2
        ).length
        inputCount = freeTicketsCount >= 0 ? freeTicketsCount : '';
        
        const busyTicketsCount = nonSeatTickets.filter(
          t => t.is_sold || t.is_reserved || t.status === 3 || t.status === 2
        ).length
        inputBusyCount = busyTicketsCount >= 0 ? busyTicketsCount : '';
      } else {
        inputCount = '';
        inputBusyCount = '';
      }

      if (changedPrice[changedPriceKey] !== undefined) {
        inputPrice = changedPrice[changedPriceKey];
      } else if (ticket) {
        const dbPrice = ticket.tariff !== undefined && ticket.tariff !== null 
          ? Number(ticket.tariff) 
          : (ticket.price !== undefined && ticket.price !== null ? Number(ticket.price) : undefined);
        
        inputPrice = dbPrice !== undefined && dbPrice !== null && dbPrice >= 0 ? dbPrice : '';
      }
    } else if (seats.length > 1) {
      const prices = seats.map(seat => {
        const seatCategory = seat.dataset.category;
        const seatRow = seat.dataset.row;
        const seatSeat = seat.dataset.seat;
        const hallIdStr = hallId ? String(hallId) : null
        const changedPriceKey = hallIdStr
          ? [hallIdStr, seatCategory, seatRow, seatSeat].filter(Boolean).join(';')
          : [seatCategory, seatRow, seatSeat].filter(Boolean).join(';');
        
        if (changedPrice[changedPriceKey] !== undefined) {
          return changedPrice[changedPriceKey];
        }
        
        const ticket = tickets.find(
          t => String(t.section) === String(seatCategory)
            && String(t.row) === String(seatRow)
            && String(t.seat) === String(seatSeat)
        ) || tickets.find(
          t => String(t.section) === String(seatCategory)
            && String(t.row) === '-1'
        );
        const price = ticket?.tariff !== undefined && ticket.tariff !== null 
          ? Number(ticket.tariff) 
          : (ticket?.price !== undefined && ticket.price !== null ? Number(ticket.price) : undefined);
        return price;
      });
      const uniquePrices = Array.from(new Set(prices.filter(p => typeof p === 'number')));
      if (uniquePrices.length === 1) groupPrice = uniquePrices[0];
    }
    
    return { inputPrice, inputCount, inputBusyCount, groupPrice }
  }, [
    seats.length, 
    tickets.length,   
    tickets.slice(0, 100).map(t => `${t.section}|${t.row}|${t.seat}|${t.price || t.tariff || ''}`).join(','),
    Object.keys(changedPrice).sort().join(','), 
    hallId
  ])
  return (
    <Card
      className={s.edit}
      title={<Title level={4} style={{ margin: 0 }}>
        {seats.length === 1 && (row && seat ? <>Row <b>{row}</b>, seat <b>{seat}</b></> : `Category ${category?.label}`)}
        {seats.length > 1 && `Edit ${seats.length} seats`}
      </Title>}
    >
      <label className={s.label}>Category</label>
      <Select
        options={categories}
        placeholder={isArray(category)('Multiple categories')}
        defaultValue={isArray(category)(null)}
        onChange={value => handleChange('category', value)}
        labelRender={({ value }) => {
          const item = categories.find(c => c.value === value)
          return (
            <Flex gap={8} align='center' className={s.catOption}>
            {!item?.icon ? 
              <div className={cn(s.catOptionIcon, `svg-scheme-bg-cat-${item?.value}`)} /> :
              <div className={cn(s.catOptionIcon, `svg-scheme-icon-cat-${item?.value}`)} dangerouslySetInnerHTML={{ __html: item?.icon }} />
            }
            <div>{item?.label}</div>
          </Flex>)
        }}
        optionRender={({ data }) =>
          <Flex gap={8} align='center' className={s.catOption}>
            {!data?.icon ? 
              <div className={cn(s.catOptionIcon, `svg-scheme-bg-cat-${data?.value}`)} /> :
              <div className={cn(s.catOptionIcon, `svg-scheme-icon-cat-${data?.value}`)} dangerouslySetInnerHTML={{ __html: data?.icon }} />
            }
            <div>{data?.label}</div>
          </Flex>}
      />
      <Flex className={s.row3} gap={20}>
        {isRegularSeat && <>
          {!!row && <div>
            <label className={s.label}>Row</label>
            <Input value={Array.isArray(row) ? row.join(', ') : (row ?? '')} disabled />
          </div>}
          {!!seat && <div>
            <label className={s.label}>Seat</label>
            <Input value={Array.isArray(seat) ? seat.join(', ') : (seat ?? '')} disabled />
          </div>}
        </>}
        {!isRegularSeat && <>
          <div>
            <label className={s.label}>Booking / sold</label>
            <InputNumber value={seats.length === 1 ? inputBusyCount : (typeof busyCount === 'number' ? busyCount : '')} style={{ width: '100%' }} disabled />
          </div>
            <div>
              <label className={s.label}>Tickets leave</label>
              <InputNumber 
                value={(() => {
                  const displayCount = getDisplayValue('count', seats.length === 1 ? inputCount : (typeof count === 'number' ? count : ''))
                  if (typeof displayCount === 'object' || displayCount === '[object Object]') {
                    return undefined
                  }
                  return typeof displayCount === 'number' ? displayCount : (displayCount !== '' && displayCount !== undefined && displayCount !== null ? displayCount : undefined)
                })()}
                style={{ width: '100%' }} 
                onChange={value => handleChange('count', value)} 
              />
            </div>
        </>}
        <div>
          <label className={s.label}>Price</label>
          <InputNumber 
            value={(() => {
              const displayPrice = getDisplayValue('price', seats.length === 1 ? inputPrice : groupPrice)
              if (typeof displayPrice === 'object' || displayPrice === '[object Object]') {
                return undefined
              }
              return typeof displayPrice === 'number' ? displayPrice : (displayPrice !== '' ? displayPrice : undefined)
            })()}
            onChange={value => handleChange('price', value)} 
            disabled={isDisabled}
          />
        </div>
      </Flex>
      {fieldsToShow.filter(f => !['seat', 'row', 'price', 'count', 'busyCount'].includes(f.value)).map(field => {
        const isCheckbox = field.type === 'checkbox'
        const rest = {
          onChange: (val) => val && handleChange(field.value, isCheckbox ? val.target?.checked : (val.target?.value || val)),
        }
        const isArrayField = isArray(values[field.value])
        if (isCheckbox) {
          rest.checked = isArrayField(false, values[field.value] === true)
          rest.indeterminate = isArrayField(true, undefined)
        } else {
          rest.value = typeof values[field.value] === 'number' || typeof values[field.value] === 'string' ? values[field.value] : ''
          rest.placeholder = isArrayField('Multiple values', '')
        }
        return (
          <Fragment key={field.value}>
            {!isCheckbox && <label className={s.label}>{field.label}</label>}
            {!field.type && <Input {...rest} />}
            {field.type === 'select' && <Select {...rest} options={field.options || []} />}
            {field.type === 'number' && <InputNumber {...rest} min={field.min} max={field.max} />}
            {field.type === 'color' && <ColorPicker {...rest} showText />}
            {isCheckbox && <Checkbox className={s.checkbox} {...rest}>{field.label}</Checkbox>}
            {field.type === 'file' && (
              <div className={`svg-scheme-icon-cat-${category}`}>
                <InputSvg
                  {...rest}
                  beforeChange={icon => field.originalColor ? icon : setCurrentColor(icon)}
                />
              </div>
            )}
          </Fragment>
        )
      })}
      {seats.length === 1 && !!ticket && !!row &&
        <Flex gap={16} style={{ marginTop: 20 }}>
          <Button type='primary' icon={<DownloadOutlined />} size='large' onClick={async () => {
            const pdf = await getTicketPdf({ t_id: ticket.fuckingTrip, seat: ticket.fullSeat })
            downloadBlob(pdf, 'ticket.pdf')
          }}>
            Download pdf
          </Button>
        </Flex>
      }
      <Flex gap={16} style={{ marginTop: 20 }}>
        <Button 
          type='primary' 
          icon={<ArrowLeftOutlined />} 
          size='large' 
          ghost 
          onClick={() => {
            if (onOk) {
              onOk()
            }
          }} 
          style={{ flex: '1 1 0' }}
        >
          Back
        </Button>
      </Flex>
    </Card>
  )
}