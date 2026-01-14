import { get } from 'lodash'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchData, fetchStadiumScheme, setStadiumScheme, setStadiumSchemeStatus, getStadium, getStadiumSchemeStatus } from '../../redux/data'
import { useParams, useNavigate } from 'react-router-dom'
import { keyBy } from 'lodash'
import dayjs from 'dayjs'
import { Table, Col, Row, Form, Button, Select, DatePicker, TimePicker, message, Input, Collapse, InputNumber, Switch, List, Card, Space, Tag, App } from 'antd'
import { LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined, FilePdfOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import TicketsApi from '../../api/tickets'
import { useData } from '../../api/data'
import { axios } from '../../api/axios'
import { createStadium, updateStadium } from '../../supabase/stadium'
import { createSchedule, updateSchedule } from '../../supabase/schedule'
import { createPromocode, updatePromocode } from '../../supabase/promocode'
import { supabase } from '../../supabase/client'
import SvgSchemeEditor from '../../components/SvgSchemeEditor'
import Sidebar from '../../components/Layout/sidebar'
import { getCitiesOptions, getCountriesOptions, getLangValue, getCurrencyList, getDefaultCurrency } from '../../redux/config'
import { downloadBlob, jsonBase64, qrBase64, toBase64 } from '../../utils/utils'
import './event.scss'
import { EMPTY_ARRAY, NON_SEAT_ROW } from '../../consts'
import Wysiwyg from '../../components/Wysiwyg'
import { fetchTicketsPaymentData, getTicketPdf } from '../../api/tickets/request'
import { getColumnSearch } from '../../utils/components'
import ControllersAccordion from '../User/ControllersAccordion'
import PromocodesAccordion from '../../components/Accordions/PromocodesAccordion'
import { returnTicketToSale, removeTicketFromSale } from '../../supabase/ticket'

const getOptions = obj => Object.values(obj || {})
  .filter(item => item && item.id) 
  .map(item => ({ 
    label: item.en || item.name_en || String(item.id) || '', 
    value: item.id 
  }))
  .filter(opt => opt.value != null) 
  .sort((item1, item2) => (item1.label || '').localeCompare(item2.label || ''))

const updateLang = (lang_vls) => {
  return Promise.resolve({ code: '200' })
}

const expandNonSeats = (changed, tickets = []) => {
  const { nonSeats, seats } = Object.entries(changed).reduce((acc, [key, value]) => {
    if (!key.includes(';')) acc.nonSeats = [...acc.nonSeats, [key, value]]
    else acc.seats[key] = value
    return acc
  }, { nonSeats: [], seats: {} })
  return nonSeats.reduce((acc, [key, data]) => {
    const dataObj = typeof data === 'object' && data !== null ? data : (typeof data === 'number' ? { price: data } : {})
    const { price, count } = dataObj

    const priceNum = price !== undefined && price !== null 
      ? (typeof price === 'number' ? price : (typeof price === 'string' && price !== '' ? Number(price) : undefined))
      : undefined
    
    const countNum = count !== undefined && count !== null
      ? (typeof count === 'number' ? count : (typeof count === 'string' && count !== '' ? Number(count) : undefined))
      : undefined
    
    if (priceNum === undefined && (countNum === undefined || countNum === null)) return acc
    const freeTickets = tickets.filter(ticket => 
      ticket.section === key && 
      String(ticket.row) === NON_SEAT_ROW && 
      !ticket.is_sold && 
      !ticket.is_reserved &&
      ticket.status !== 3 && 
      ticket.status !== 2
    )
    const categoryTickets = tickets.filter(ticket => 
      ticket.section === key && 
      String(ticket.row) === NON_SEAT_ROW
    )
    const seatNumbers = categoryTickets
      .map(ticket => {
        const seatNum = typeof ticket.seat === 'number' ? ticket.seat : Number(ticket.seat)
        return isNaN(seatNum) ? 0 : seatNum
      })
      .filter(num => num >= 0)
    let lastSeat = seatNumbers.length > 0 ? Math.max(...seatNumbers) : 0
      if (priceNum !== undefined && priceNum !== null) {
        acc = freeTickets.reduce((acc, ticket) => ({
          ...acc,
          [`${key};${NON_SEAT_ROW};${ticket.seat}`]: priceNum,
        }), acc)
      }
      if (countNum !== undefined && countNum !== null) {
        const diff = countNum - freeTickets.length
        if (diff < 0) {
          acc = freeTickets.slice(0, diff * -1).reduce((acc, ticket) => ({
            ...acc,
            [`${key};${NON_SEAT_ROW};${ticket.seat}`]: -1,
          }), acc)
        } else if (diff > 0) {
          const defaultPrice = priceNum !== undefined ? priceNum : 
            (freeTickets[0]?.tariff || freeTickets[0]?.price) ||
            (categoryTickets[0]?.tariff || categoryTickets[0]?.price)
          
          if (defaultPrice !== undefined && defaultPrice !== null && defaultPrice > 0) {
            acc = Array.from({ length: diff }, (_, i) => i + lastSeat + 1).reduce((acc, i) => ({
              ...acc,
              [`${key};${NON_SEAT_ROW};${i}`]: defaultPrice,
            }), acc)
          } else {
            acc = Array.from({ length: diff }, (_, i) => i + lastSeat + 1).reduce((acc, i) => ({
              ...acc,
              [`${key};${NON_SEAT_ROW};${i}`]: priceNum !== undefined ? priceNum : 0,
            }), acc)
          }
        }
      }
    return acc
  }, seats)
}

const exportTickets = ( tickets, eventId ) => {
  const stringify = ( data ) => {
    const re = /^\s|\s$|[",\n\r]/;
    let ret = String( data || '' )
    if (re.test( ret )) ret = `"${ret.replaceAll( '"', '""' )}"`;
    return ret;
  }
  const headerRow = '\uFEFF' + [ 'Event', 'Category', 'Row', 'Seat', 'Price', 'Currency', 'Code', 'Status' ].join( ',' ) + '\r\n'
  const rows = tickets.
    sort( ( a, b ) =>
      a.section < b.section ? -1 : a.section > b.section ? 1 : 
      a.row < b.row ? -1 : a.row > b.row ? 1 : 
      Number( a.seat ) < Number( b.seat ) ? -1 : Number( a.seat ) > Number( b.seat ) ? 1 : 0
    ).
    map( ticket => [
      ticket.event_id,
      ticket.section,
      ticket.row == NON_SEAT_ROW ? '' : ticket.row,
      ticket.seat,
      ticket.price,
      ticket.currency,
      ticket.code,
      ticket.is_sold ? 'sold' : ticket.is_reserved ? 'ordered' : ticket.disabled ? 'block' : ''
    ].
    map( stringify ).
    join( ',' ) +
    '\r\n'
  )
  rows.unshift(headerRow)
  const blob = new Blob( rows, { type : 'text/csv; charset=utf-8' } )
  const url = URL.createObjectURL( blob )
  const a = document.createElement( 'a' )
  a.href = url
  a.download = `tickets_${eventId}_${(new Date).toISOString().substring(0,10)}.csv`
  a.click()
  URL.revokeObjectURL( url )
}

export default function EventForm() {
  const [ messageApi, contextHolder ] = message.useMessage()
  const { modal } = App.useApp()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'create'
  const [ form ] = Form.useForm()

  const reduxTournaments = useSelector(state => state.data.tournaments || {})
  const reduxStadiums = useSelector(state => state.data.stadiums || {})
  const reduxTeams = useSelector(state => state.data.teams || {})
  
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchData())
  }, [dispatch])

  const { data: queryData, error, isLoading } = useData(null, {
    enabled: true 
  })

  const { data: stripeAccountsData } = useQuery({
    queryKey: ['stripe-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return data || []
    }
  })
  
  const tournamentsCount = queryData?.data?.tournaments ? Object.keys(queryData.data.tournaments).length : Object.keys(reduxTournaments || {}).length
  const stadiumsCount = queryData?.data?.stadiums ? Object.keys(queryData.data.stadiums).length : Object.keys(reduxStadiums || {}).length
  const teamsCount = queryData?.data?.teams ? Object.keys(queryData.data.teams).length : Object.keys(reduxTeams || {}).length
  const scheduleKeys = queryData?.data?.schedule ? Object.keys(queryData.data.schedule).join(',') : ''
  
  const data = useMemo(() => {
    if (!queryData) return null
    
    const { data: responseData, default_lang } = queryData || {}
    const { schedule, stadiums, teams, tournaments, promocodes } = responseData || {}
    
    const finalTournaments = tournaments || reduxTournaments || {}
    const finalStadiums = stadiums || reduxStadiums || {}
    const finalTeams = teams || reduxTeams || {}
    
    let event = {}
    if (!isNew && schedule && schedule[id]) {
      event = { ...schedule[id] }
      
      if (event.datetime || event.start_datetime) {
        const datetime = event.datetime || event.start_datetime
        event.date = dayjs(datetime)
        event.time = event.date
      }
      
      const team1Id = typeof event.team1 === 'object' && event.team1 !== null
        ? (event.team1?.id_team || event.team1?.id || event.team1)
        : event.team1
      event.team1 = team1Id || null
      
      const tournamentId = typeof event.tournament === 'object' && event.tournament !== null
        ? (event.tournament?.id_tournament || event.tournament?.id || event.tournament)
        : (event.tournament || event.id_tournament || null)
      event.tournament = tournamentId || null
      
      const stadiumId = typeof event.stadium === 'object' && event.stadium !== null
        ? (event.stadium?.id_stadium || event.stadium?.id || event.stadium)
        : (event.stadium || event.id_stadium || null)
      
      if (stadiumId && finalStadiums?.[stadiumId]) {
        const stadiumData = finalStadiums[stadiumId]
        event.stadium = {
          id: stadiumId,
          id_stadium: stadiumId,
          ...stadiumData
        }
      } else if (stadiumId) {
        event.stadium = { id: stadiumId, id_stadium: stadiumId }
      } else {
        event.stadium = null
      }
      
    }
    
    const tournamentsArray = Object.keys(finalTournaments).map(tId => ({ 
      id: tId, 
      ...finalTournaments[tId] 
    }))
    
    const stadiumsArray = Object.keys(finalStadiums).map(sId => ({
      id: sId,
      ...finalStadiums[sId]
    }))
    
    const teamsArray = Object.keys(finalTeams).map(tId => ({
      id: tId,
      ...finalTeams[tId]
    }))
      
      const options = {
      s: getOptions(stadiumsArray, 'en'),
      t: getOptions(tournamentsArray, 'en'),
      teams: getOptions(teamsArray, 'en'),
    }
    
    const eventPromocodes = (!isNew && promocodes) ? Object.values(promocodes).filter(promo => {
        if (!promo.schedule || !Array.isArray(promo.schedule)) return false
        const eventId = Number(id)
        return promo.schedule.some(s => Number(s) === eventId || String(s) === String(id))
      }) : []
      
      return {
        event,
        options,
      defaultLang: default_lang || 'en',
        promocodes: eventPromocodes
      }
  }, [queryData, tournamentsCount, stadiumsCount, teamsCount, scheduleKeys, reduxTournaments, reduxStadiums, reduxTeams, id, isNew])



  const [ isSending, setIsSending ] = useState(false)
  const [ changedPrice, setChangedPrice ] = useState({})
  const [statusMap, setStatusMap] = useState({})

  const cities = useSelector(getCitiesOptions)
  const countries = useSelector(getCountriesOptions)
  const currencyList = useSelector(getCurrencyList)
  const defaultCurrency = useSelector(getDefaultCurrency)

  const stadiumIdRef = useRef(null)
  const stadiumId = !isNew && data?.event?.stadium 
    ? (data.event.stadium.id || data.event.stadium.id_stadium || data.event.stadium) 
    : null
  
  const stadiumFromRedux = useSelector(state => !isNew && stadiumId ? getStadium(state, stadiumId) : null)
  const schemeStatusFromRedux = useSelector(state => !isNew && stadiumId ? getStadiumSchemeStatus(state, stadiumId) : null)
  
  const stadium = stadiumFromRedux
  const schemeStatus = schemeStatusFromRedux
  
  useEffect(() => {
    if (isNew || !stadiumId) return
    if (['loading', 'loaded'].includes(schemeStatus)) return
    if (stadiumIdRef.current === stadiumId) return 
    
    stadiumIdRef.current = stadiumId
    dispatch(fetchStadiumScheme(stadiumId))
  }, [isNew, stadiumId, schemeStatus, dispatch])
  
  const parsedScheme = useMemo(() => {
    if (!stadium?.scheme) return undefined
    try {
      if (typeof stadium.scheme === 'string') {
        return JSON.parse(stadium.scheme.replaceAll('\'', '"'))
      }
      return stadium.scheme
    } catch (e) {
      return undefined
    }
  }, [stadium?.scheme])

  const initialValues = useMemo(() => {
    if (isNew) {
      return {
        currency: defaultCurrency
      }
    }
    if (!data?.event || Object.keys(data.event).length === 0) return {}
    
    const eventData = {
      team1: data.event.team1,
      tournament: data.event.tournament,
      date: data.event.date,
      time: data.event.time,
      fee: data.event.fee,
      stripe_account: data.event.id_stripe_account,
      currency: data.event.currency || defaultCurrency
    }
    
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === undefined || eventData[key] === null) {
        delete eventData[key]
      }
    })
    
    const stadiumData = data.event.stadium ? {
      ...data.event.stadium,
      en: data.event.stadium.name_en || data.event.stadium.en || '',
      ru: data.event.stadium.name_ru || data.event.stadium.ru || '',
      ar: data.event.stadium.name_ar || data.event.stadium.ar || '',
      fr: data.event.stadium.name_fr || data.event.stadium.fr || '',
      es: data.event.stadium.name_es || data.event.stadium.es || '',
      country: data.event.stadium.country || null,
      city: data.event.stadium.id_city || data.event.stadium.city || null,
      scheme_blob: parsedScheme || data.event.stadium.scheme_blob 
    } : null
    
    return {
      ...eventData,
      stadium: stadiumData
    }
  }, [isNew, data?.event, parsedScheme, defaultCurrency])
  
  useEffect(() => {
    if (isNew || !parsedScheme || !data?.event?.stadium) return
    
    form.setFieldsValue({
      stadium: {
        scheme_blob: parsedScheme
      }
    })
  }, [isNew, parsedScheme, data?.event?.stadium, form, stadiumId])

  const { isLoading: isLoadingUsers, data: usersMap } = useQuery({
    queryKey: ['usersMap'],
    queryFn: async () => {
      const { queryUsers } = await import('../../supabase/users_query')
      const { data, error } = await queryUsers()
      if (error) {
        return {}
      }
      return (data || []).reduce((acc, item) => ({ ...acc, [item.id_user]: item }), {})
    }
  })

  const mutateTickets = useMutation({ mutationFn: TicketsApi.updateTickets })
  const queryClient = useQueryClient()

  const baseTickets = TicketsApi.useTickets({ event_id: id }, { order: 'section' }, {
    enabled: !isNew,
    staleTime: 30000, 
    cacheTime: 300000 
  })

  const tickets = useQuery({
    queryKey: ['purchases', id],
    queryFn: async () => {
      const { fetchTicketsPaymentDataFromSupabase } = await import('../../api/tickets/request_supabase')
      return await fetchTicketsPaymentDataFromSupabase(baseTickets?.data || [])
    },
    select: data => {
      const { booking } = data?.data || {}
      return baseTickets.data?.map((ticket) => {
        const orderId = ticket.id_order || ticket.sold_info?.buy_id
        const orderData = orderId ? booking[orderId] : null
        
        let sold_info = null
        if (orderId && orderData) {
          const date = orderData.b_payment_datetime
          const day = date && dayjs(date).isValid() ? dayjs(date) : null
          sold_info = {
            user_id: orderData.id_user,
            buy_id: orderId,
          date: day
          }
        } else if (ticket.sold_info) {
          sold_info = ticket.sold_info
        }
        
        return {
          ...ticket,
          sold_info
        }
      }).sort((a, b) => {
        return a.fullSeat.localeCompare(b.fullSeat)
      })
    },
    enabled: !!baseTickets?.data,
    staleTime: 30000, 
    cacheTime: 300000 
  })

  const lastEventIdRef = useRef(null)
  const restoredPricesRef = useRef(null) 
  useEffect(() => {
    if (id !== lastEventIdRef.current) {
      lastEventIdRef.current = id
      restoredPricesRef.current = null 
    }
    
    const ticketsData = tickets?.data || baseTickets?.data || []
    
    if (!isNew && ticketsData && ticketsData.length > 0 && id === lastEventIdRef.current) {
      const hallId = stadiumId || data?.event?.stadium?.id || data?.event?.id_stadium
      if (hallId) {
        const restoredChangedPrice = {}
        let restoredCount = 0
        ticketsData.forEach(ticket => {
          const hallIdStr = String(hallId)
          const ticketKey = [hallIdStr, ticket.section, ticket.row, ticket.seat].filter(Boolean).join(';')
          const price = ticket.tariff !== undefined && ticket.tariff !== null 
            ? Number(ticket.tariff) 
            : (ticket.price !== undefined && ticket.price !== null ? Number(ticket.price) : undefined)
          if (price !== undefined && price !== null && price >= 0) {
            restoredChangedPrice[ticketKey] = price
            restoredCount++
          }
        })
        
        const restoredHash = JSON.stringify(restoredChangedPrice)
        
        if (Object.keys(restoredChangedPrice).length > 0 && restoredHash !== restoredPricesRef.current) {
          restoredPricesRef.current = restoredHash 
          
          setChangedPrice(prev => {
            const prevHash = JSON.stringify(prev)
            if (prevHash === restoredHash) {
              return prev 
            }
            return restoredChangedPrice
          })
        } else if (Object.keys(restoredChangedPrice).length === 0) {
        }
      }
    }
  }, [isNew, id, stadiumId, data?.event?.id_stadium, data?.event?.stadium?.id, tickets?.data?.length, baseTickets?.data?.length])

  const [changingTicket, setChangingTicket] = useState(false)
  
  const ticketsColumns = useMemo(() => [
    {
      dataIndex: 'section',
      title: 'Section',
      sorter: (a, b) => a.section?.localeCompare(b.section),
      ...getColumnSearch('section', { options: parsedScheme?.categories })
    }, {
      dataIndex: 'row',
      title: 'Row',
      sorter: (a, b) => parseInt(a.row, 10) < parseInt(b.row, 10) ? -1 : 1,
      ...getColumnSearch('row')
    }, {
      dataIndex: 'seat',
      title: 'Seat',
      sorter: (a, b) => parseInt(a.seat, 10) < parseInt(b.seat, 10) ? -1 : 1,
      ...getColumnSearch('seat')
    }, {
      dataIndex: 'price',
      title: 'Price',
      sorter: (a, b) => parseInt(a.price, 10) < parseInt(b.price, 10) ? -1 : 1,
    }, {
      key: 'email',
      dataIndex: 'sold_info',
      title: 'Buyer e-mail',
      ...getColumnSearch('sold_info', { getData: item => usersMap[item.sold_info?.user_id]?.email }),
      render: info => {
        const user = usersMap[info?.user_id]
        if (!user) return info?.user_id
        return user.email
      }
    }, {
      key: 'phone',
      dataIndex: 'sold_info',
      title: 'Buyer phone',
      ...getColumnSearch('phone', { getData: item => usersMap[item.sold_info?.user_id]?.phone }),
      render: info => {
        const user = usersMap[info?.user_id]
        return user?.phone
      }
    }, {
      key: 'date',
      dataIndex: 'sold_info',
      title: 'Date',
      ...getColumnSearch('date', { getData: item => item.sold_info?.date, type: 'date' }),
      render: (_, item) => {
        return item.sold_info?.date?.format('DD.MM.YYYY')
      },
      sorter: (a, b) => {
        const d1 = a.sold_info?.date
        const d2 = b.sold_info?.date
        if (!d1?.isValid() && d2?.isValid()) return -1
        if (!d2?.isValid()) return 1
        return d1?.isBefore(d2) ? -1 : 1
      }
    }, {
      key: 'download',
      title: 'Download',
      render: (_, item) => {
        return (
          <Button
            icon={<FilePdfOutlined />}
            onClick={async () => {
              try {
                const pdfTemplate = pdfContent || '' 
                
                const ticketDataWithSchedule = {
                  ...item,
                  schedule: {
                    ...data?.event,
                    team1_table: data?.event?.team1_table || data?.event?.team1,
                    team2_table: data?.event?.team2_table || data?.event?.team2
                  }
                }
                
                const pdf = await getTicketPdf({ 
                  seat: item.fullSeat, 
                  t_id: item.fuckingTrip,
                  ticketData: ticketDataWithSchedule, 
                  pdfTemplate 
                })
                downloadBlob(pdf, `ticket_${item.code || item.fullSeat?.replace(/[^a-zA-Z0-9]/g, '_') || 'ticket'}.pdf`)
              } catch (error) {
                messageApi.error('Ошибка при генерации PDF билета')
              }
            }}
          />
        )
      }
    }, {
      key: 'actions',
      title: 'Actions',
      render: (_, item) => {
        const { fullSeat, status, is_sold } = item
        const onSale = status === 1 && !is_sold
        return (
          <div>
            <Button
              disabled={changingTicket}
              loading={changingTicket === fullSeat}
              danger={!onSale}
              onClick={async (e) => {
                if (onSale) {
                  setChangingTicket(fullSeat)
                  try {
                    const { error } = await removeTicketFromSale(item.fuckingTrip, fullSeat)
                    if (error) {
                      message.error('Ошибка при удалении билета из продажи')
                      return
                    }
                    message.success('Билет удален из продажи')
                    baseTickets.refetch()
                  } catch (error) {
                    messageApi.error('Произошла ошибка')
                  } finally {
                    setChangingTicket(false)
                  }
                } else {
                  modal.confirm({
                    title: 'Confirm Return to Sale',
                    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                    content: 'Are you sure you want to return this ticket to sale? The ticket will be available for purchase again.',
                    okText: 'Yes, Return to Sale',
                    okType: 'danger',
                    cancelText: 'No, Cancel',
                    centered: true,
                    maskClosable: false,
                    onOk: async () => {
                      setChangingTicket(fullSeat)
                      try {
                        const orderId = item.sold_info?.buy_id && item.sold_info?.buy_id !== -1 
                          ? item.sold_info.buy_id 
                          : null
                        const { error } = await returnTicketToSale(item.fuckingTrip, fullSeat, orderId)
                        if (error) {
                          messageApi.error('Ошибка при возврате билета в продажу')
                          return
                        }
                        messageApi.success('Билет возвращен в продажу')
                        baseTickets.refetch()
                      } catch (error) {
                        messageApi.error('Произошла ошибка')
                      } finally {
                        setChangingTicket(false)
                      }
                    }
                  })
                }
              }}
            >
              {onSale ? 'Remove from sail' : (
                status === 1 ? 'Remove order and return to sale' : 'Return to sale'
              )}
            </Button>
          </div>
        )
      }
    }
  ], [usersMap, changingTicket, parsedScheme?.categories])
    
  const emailSubject = data?.event?.email_subject || ''
  const emailContent = data?.event?.email_body || ''
  const pdfContent = data?.event?.pdf_template || ''
  
  const schemeSeatsCount = useMemo(() => {
    if (!parsedScheme?.scheme) return { total: 0, byCategory: {} }
    
    try {
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(parsedScheme.scheme, 'image/svg+xml')
      
      const seatElements = svgDoc.querySelectorAll('.svg-seat[data-category][data-row][data-seat]')
      const categoryElements = svgDoc.querySelectorAll('.svg-seat[data-category]:not([data-row]):not([data-seat])')
      
      const byCategory = {}
      let total = 0
      
      seatElements.forEach(el => {
        const category = el.getAttribute('data-category')
        if (category) {
          byCategory[category] = (byCategory[category] || 0) + 1
          total++
        }
      })
      
      categoryElements.forEach(el => {
        const category = el.getAttribute('data-category')
        const count = parseInt(el.getAttribute('data-count') || '0', 10)
        const busyCount = parseInt(el.getAttribute('data-busyCount') || '0', 10)
        const totalInCategory = count + busyCount
        if (category && totalInCategory > 0) {
          byCategory[category] = (byCategory[category] || 0) + totalInCategory
          total += totalInCategory
        }
      })
      
      return { total, byCategory }
    } catch (e) {
      return { total: 0, byCategory: {} }
    }
  }, [parsedScheme?.scheme])

  const panelStyle = {
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03),0 1px 6px -1px rgba(0, 0, 0, 0.02),0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    marginBottom: 20,
  }

  const t = tickets?.data || EMPTY_ARRAY
  const sumTotal = schemeSeatsCount.total || t.length 
  const sumSold = t.filter(ticket => ticket.is_sold).length
  const sumReserved = t.filter(ticket => ticket.is_reserved).length
  const sumDisabled = t.filter(ticket => ticket.disabled).length - sumSold - sumReserved
  const sumRemains = sumTotal - (sumSold + sumReserved + sumDisabled)
  
  if (isLoading && !isNew && !data) {
    return (
      <>
        <Sidebar buttons sticky>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} block>Events</Button>
        </Sidebar>
        <div style={{ 
          flex: '1 1 0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}>
          <LoadingOutlined style={{ fontSize: '64px' }} />
        </div>
        <Sidebar />
      </>
    )
  }
  
  if (error && !isNew) {
    return (
      <>
        <Sidebar buttons sticky>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} block>Events</Button>
        </Sidebar>
        <div style={{ flex: '1 1 0', padding: '20px' }}>
          <h2>Ошибка загрузки события</h2>
          <p>{error.message || 'Не удалось загрузить данные события'}</p>
        </div>
        <Sidebar />
      </>
    )
  }
  
  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} block>Events</Button>
        <Button icon={<SaveOutlined />} type='primary' onClick={() => form.submit()} loading={isSending} block>Save</Button>
      </Sidebar>
      <Form
        key={`event-form-${id}-${parsedScheme ? 'scheme' : 'no-scheme'}`}
        style={{ flex: '1 1 0'}}
        layout='vertical'
        onFinish={async (dataValues) => {
          setIsSending(true)
          const { template_subject, template_body, pdf_body, promocodes, ...values } = dataValues
          try {
            if (!values.stadium?.scheme_blob) {
              messageApi.error('Не загружена схема зала (SVG)!');
              setIsSending(false);
              return;
            }
            let { stadium: { scheme_blob, ...stadium }, date, time, ...event } = values
            
            
            event.datetime = `${date.format('YYYY-MM-DD')} ${time.format('HH:mm:ss')}+03:00`
            
            const defaultLang = data?.defaultLang || 'en'

            if (!isNew) {
              if (template_subject) event.email_subject = template_subject
              if (template_body) event.email_body = template_body
              if (pdf_body) event.pdf_template = pdf_body
              
              const stadiumId = data?.event?.stadium?.id || data?.event?.stadium || data?.event?.id_stadium
              
              if (values.stripe_account) {
                event.stripe_account = values.stripe_account
              } else if (data?.event?.id_stripe_account) {
                event.stripe_account = data.event.id_stripe_account
              } else {
                event.stripe_account = 1 
              }
              
              if (stadium && stadiumId) {
                const countryId = typeof stadium.country === 'object' ? stadium.country?.id || stadium.country?.value : stadium.country
                const cityId = typeof stadium.city === 'object' ? stadium.city?.id || stadium.city?.value : stadium.city

                let schemeValue = stadium.scheme || ''
                let base64SchemeBlob = ''
                
                if (scheme_blob && typeof scheme_blob === 'object' && scheme_blob !== null) {
                  schemeValue = scheme_blob 
                  
                  const file = new File([JSON.stringify(scheme_blob)], 'scheme.json', {
                    type: 'application/json',
                  })
                  base64SchemeBlob = await toBase64(file)
                } else if (typeof scheme_blob === 'string') {
                  base64SchemeBlob = scheme_blob
                }
                
                const stadiumData = {
                  en: stadium.en || stadium.name_en || '',
                  ru: stadium.ru || stadium.name_ru || '',
                  ar: stadium.ar || stadium.name_ar || '',
                  fr: stadium.fr || stadium.name_fr || '',
                  es: stadium.es || stadium.name_es || '',
                  address_en: stadium.address_en || '',
                  address_ru: stadium.address_ru || '',
                  address_ar: stadium.address_ar || '',
                  address_fr: stadium.address_fr || '',
                  address_es: stadium.address_es || '',
                  country: countryId || null,
                  city: cityId || null,
                  scheme: schemeValue,
                  scheme_blob: base64SchemeBlob
                }
                
                const updateResult = await updateStadium(stadiumId, stadiumData)
                if (updateResult?.error) {
                } else {
                  let savedScheme = null
                  if (updateResult?.data?.scheme) {
                    try {
                      savedScheme = typeof updateResult.data.scheme === 'string' 
                        ? JSON.parse(updateResult.data.scheme.replaceAll('\'', '"')) 
                        : updateResult.data.scheme
                    } catch (e) {
                    }
                  }
                  
                  await dispatch(fetchData())
                  
                  if (savedScheme) {
                    dispatch(setStadiumScheme({ id: stadiumId, scheme: savedScheme }))
                    dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false, isLoaded: true }))
                  }
                }
              }
              
              const updateEventData = {
                ...event,
                datetime: event.datetime,
                time_zone: data?.event?.time_zone || '+03:00',
                stripe_account: event.stripe_account || 1
              }
              
              Object.keys(updateEventData).forEach(key => {
                if (updateEventData[key] === undefined) {
                  delete updateEventData[key]
                }
              })
              
              await updateSchedule(id, updateEventData)
              
              const hallId = stadiumId || data?.event?.stadium?.id || data?.event?.id_stadium
              
              const oldCurrency = data?.event?.currency
              const newCurrency = event.currency
              const currencyChanged = newCurrency && oldCurrency !== newCurrency
              
              if (id && hallId) {
                const ticketsToUpdate = tickets?.data 
                  ? expandNonSeats(changedPrice, tickets.data)
                  : changedPrice
                
                if (Object.keys(ticketsToUpdate).length > 0 || currencyChanged) {
                  const { createOrUpdateTickets } = await import('../../supabase/tickets')
                  const ticketsResult = await createOrUpdateTickets(id, hallId, ticketsToUpdate)
                  
                  if (ticketsResult.error) {
                    messageApi.warning('Билеты обновлены с ошибками. Проверьте консоль.')
                  } else {
                    setChangedPrice(prev => {
                      return { ...ticketsToUpdate, ...prev }
                    })
                    
                    queryClient.invalidateQueries({ queryKey: ['tickets', id] })
                    queryClient.invalidateQueries({ queryKey: ['purchases', id]                     })
                  }
                }
              }
              
              if (promocodes && promocodes.length > 0) {
                for (const promo of promocodes) {
                  const promocodeData = {
                  value: promo.value,
                  discount: promo.discount,
                  max_products: promo.max_products,
                  max_payments: promo.max_payments,
                    limit: `${promo.limit.format('YYYY-MM-DD HH:mm:ss')}+03:00`,
                  active: promo.active ? 1 : 0,
                  json: '{}',
                    schedule: [id]
                  }
                  
                  if (promo.id) {
                    await updatePromocode(promo.id, promocodeData)
                  } else {
                    await createPromocode(promocodeData)
                  }
                }
                messageApi.success('Promocodes updated successfully!')
                
                queryClient.invalidateQueries({ queryKey: ['data'] })
                dispatch(fetchData())
              }
              
              queryClient.invalidateQueries({ queryKey: ['tickets', id] })
              queryClient.invalidateQueries({ queryKey: ['purchases', id] })
              if (stadiumId && stadium) {
                stadiumIdRef.current = null
                await dispatch(fetchStadiumScheme(stadiumId))
                queryClient.invalidateQueries({ queryKey: ['data'], predicate: (query) => {
                  return query.queryKey.includes('stadium')
                }})
              }
              
              messageApi.success(`Событие успешно ${isNew ? 'создано' : 'обновлено'}!`)
              
              setIsSending(false)
              return
            }
            const countryId = typeof stadium.country === 'object' ? stadium.country?.id || stadium.country?.value : stadium.country
            const cityId = typeof stadium.city === 'object' ? stadium.city?.id || stadium.city?.value : stadium.city
            
            let schemeValue = stadium.scheme || ''
            
            if (scheme_blob && typeof scheme_blob === 'object' && scheme_blob.scheme) {
              schemeValue = scheme_blob 
            }
            
            const stadiumData = {
              en: stadium.en || stadium.name_en || '',
              ru: stadium.ru || stadium.name_ru || '',
              ar: stadium.ar || stadium.name_ar || '',
              fr: stadium.fr || stadium.name_fr || '',
              es: stadium.es || stadium.name_es || '',
              address_en: stadium.address_en || '',
              address_ru: stadium.address_ru || '',
              address_ar: stadium.address_ar || '',
              address_fr: stadium.address_fr || '',
              address_es: stadium.address_es || '',
              country: countryId || null,
              city: cityId || null,
              scheme: schemeValue,
              scheme_blob: await jsonBase64(scheme_blob)
            }
            
            const createdStadiumResult = await createStadium(stadiumData)
            if (createdStadiumResult.error) {
              messageApi.error(`Ошибка при создании стадиона: ${createdStadiumResult.error.message}`)
              return
            }
            const stadiumId = createdStadiumResult.data.id_stadium
            
            const eventData = { 
              ...event,
              stadium: stadiumId, 
              stripe_account: values.stripe_account || 1,
              time_zone: '+03:00'
            }
            
            if (template_subject) eventData.email_subject = template_subject
            if (template_body) eventData.email_body = template_body
            if (pdf_body) eventData.pdf_template = pdf_body
            
            const createdEventResult = await createSchedule(eventData)
            if (createdEventResult.error) {
              messageApi.error(`Ошибка при создании события: ${createdEventResult.error.message}`)
              return
            }
            const eventId = createdEventResult.data.id_schedule
            const savedStadiumId = createdEventResult.data.id_stadium
            
            if (!savedStadiumId || savedStadiumId !== stadiumId) {
              if (savedStadiumId !== stadiumId) {
                const { updateSchedule } = await import('../../supabase/schedule')
                const updateResult = await updateSchedule(eventId, { stadium: stadiumId })
                if (updateResult.error) {
                  messageApi.warning('Событие создано, но связь со стадионом не установлена. Проверьте связь вручную.')
                }
              }
            }
            
            let schemeFromForm = null
            try {
              if (scheme_blob && typeof scheme_blob === 'object' && scheme_blob.scheme) {
                schemeFromForm = scheme_blob.scheme
              } else if (scheme_blob && typeof scheme_blob === 'string') {
                const parsed = JSON.parse(scheme_blob.replaceAll('\'', '"'))
                schemeFromForm = parsed?.scheme || parsed
              } else if (parsedScheme && parsedScheme.scheme) {
                schemeFromForm = parsedScheme.scheme
              }
            } catch (e) {
            }
            
            const ticketsToUpdate = {}
            
            
            if (schemeFromForm && schemeFromForm.sections) {
              Object.keys(schemeFromForm.sections).forEach(sectionKey => {
                const section = schemeFromForm.sections[sectionKey]
                if (!section || !section.blocks) return
                
                Object.keys(section.blocks).forEach(rowKey => {
                  const row = section.blocks[rowKey]
                  if (!row || !row.seats) return
                  
                  Object.keys(row.seats).forEach(seatKey => {
                    const seat = row.seats[seatKey]
                    const ticketKey = `${stadiumId};${sectionKey};${rowKey};${seatKey}`
                    
                    const price = changedPrice[ticketKey] !== undefined 
                      ? changedPrice[ticketKey] 
                      : (seat?.price || 0)
                    
                    if (price > 0) {
                      ticketsToUpdate[ticketKey] = price
                    }
                  })
                })
              })
              
            }
            
            Object.keys(changedPrice).forEach(key => {
              if (!ticketsToUpdate[key] && changedPrice[key] > 0) {
                ticketsToUpdate[key] = changedPrice[key]
              }
            })
            
            if (Object.keys(ticketsToUpdate).length > 0) {
              const { createOrUpdateTickets } = await import('../../supabase/tickets')
              const ticketsResult = await createOrUpdateTickets(eventId, stadiumId, ticketsToUpdate)
              
                   if (ticketsResult.error) {
                     messageApi.warning('Билеты созданы с ошибками. Проверьте консоль.')
                   } else {
                     setChangedPrice({})
                     queryClient.invalidateQueries({ queryKey: ['tickets', eventId] })
                     queryClient.invalidateQueries({ queryKey: ['purchases', eventId] })
                   }
            } else {
            }
            
            if (promocodes && promocodes.length > 0) {
              for (const promo of promocodes) {
                const promocodeData = {
                value: promo.value,
                discount: promo.discount,
                max_products: promo.max_products,
                max_payments: promo.max_payments,
                  limit: `${promo.limit.format('YYYY-MM-DD HH:mm:ss')}+03:00`,
                active: promo.active ? 1 : 0,
                json: '{}',
                  schedule: [eventId]
                }
                await createPromocode(promocodeData)
              }
              messageApi.success('Promocodes created successfully!')
            }
            
            await dispatch(fetchData())
            
            queryClient.invalidateQueries({ queryKey: ['tickets', eventId] })
            queryClient.invalidateQueries({ queryKey: ['purchases', eventId] })
            queryClient.invalidateQueries({ queryKey: ['data'] })
            
            messageApi.success('Событие успешно создано!')
            setTimeout(() => {
              navigate(`/event/${eventId}`, { replace: true })
             }, 500)
           } catch (e) {
             messageApi.error(e.message)
          } finally {
            setIsSending(false)
          }
        }}
        initialValues={initialValues}
        form={form}
        className='eventForm'
        size='large'
      >
        <Collapse
          bordered={false}
          size='middle'
          defaultActiveKey={['1', '2', '3']}
          className='eventCollapse'
          items={[
            {
              key: '1',
              label: <b>Event data</b>,
              style: panelStyle,
              children: <Row gutter={20}>
                <Col span={6}>
                  <Form.Item
                    label='Artist'
                    name='team1'
                    rules={[{ required: true, message: 'Please input artist' }]}
                  >
                    <Select
                      placeholder='Artist'
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={data?.options?.teams || []}
                      style={{ width: '100%' }}
                      showSearch
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label='Date'
                    name='date'
                    rules={[{ required: true, message: 'Please input date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label='Start time'
                    name='time'
                    rules={[{ required: true, message: 'Please input start time' }]}
                  >
                    <TimePicker
                      style={{ width: '100%' }}
                      format='HH:mm'
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label='Tournament'
                    name='tournament'
                    rules={[{ required: true, message: 'Please input tournament' }]}
                  >
                    <Select
                      placeholder='Tournament'
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={data?.options?.t || []}
                      style={{ width: '100%' }}
                      showSearch
                    />
                  </Form.Item>
                </Col>
                <Col span={6} style={{ marginTop: 20 }}>
                  <Form.Item
                    label='Fee'
                    name='fee'
                  >
                    <InputNumber style={{ width: '100%' }} addonAfter='%' />
                  </Form.Item>
                </Col>
              </Row>
            },
            {
              key: '4',
              label: <b>Payment Settings</b>,
              style: panelStyle,
              children: <Row gutter={20}>
                <Col span={12}>
                  <Form.Item
                    label='Stripe Account'
                    name='stripe_account'
                    tooltip='Выберите Stripe аккаунт для обработки платежей за билеты'
                  >
                    <Select
                      placeholder='Select Stripe account'
                      options={stripeAccountsData?.map(account => ({
                        label: `${account.name} ${account.is_test_mode ? '(Test)' : '(Live)'}`,
                        value: account.id_stripe_account
                      })) || []}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label='Currency'
                    name='currency'
                    tooltip='Валюта для билетов этого события'
                  >
                    <Select
                      placeholder='Select currency'
                      style={{ width: '100%' }}
                      showSearch
                      filterOption={(input, option) => {
                        const label = option?.label || option?.children || ''
                        const value = option?.value || ''
                        const searchText = input.toLowerCase()
                        return (
                          String(label).toLowerCase().includes(searchText) ||
                          String(value).toLowerCase().includes(searchText)
                        )
                      }}
                    >
                      {currencyList.map(currency => (
                        <Select.Option
                          key={currency.code}
                          value={currency.code}
                          label={`${currency.code} ${currency.en || currency.name_en || ''}`}
                          title={currency.en || currency.name_en || currency.code}
                        >
                          {currency.code} {currency.en || currency.name_en ? `(${currency.en || currency.name_en})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            },

            {
              key: '2',
              label: <b>Location</b>,
              style: panelStyle,
              children: <>
                <Row gutter={20}>
                  <Col span={6}>
                    <Form.Item label='Name' name={['stadium', 'en']}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label='Country' name={['stadium', 'country']}>
                      <Select
                        placeholder='Country'
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={countries}
                        style={{ width: '100%' }}
                        showSearch
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label='City' name={['stadium', 'city']}>
                      <Select
                        placeholder='City'
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={cities}
                        style={{ width: '100%' }}
                        showSearch
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label='Address' name={['stadium', 'address_en']}>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item className='scheme_blob' name={['stadium', 'scheme_blob']}>
                  <SvgSchemeEditor
                    tickets={tickets?.data || []}
                    hallId={isNew ? null : (stadiumId || data?.event?.stadium?.id || data?.event?.id_stadium)}
                    changedPrice={changedPrice}
                    onTicketsChange={val => {
                      setChangedPrice(prev => ({ ...prev, ...val }))
                    }}
                  />
                </Form.Item>
              </>
            },
            {
              key: '3',
              label: <b>Remainings</b>,
              style: panelStyle,
              children:
                <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                  <List
                    grid={{ gutter: 16, column: 4 }}
                    dataSource={parsedScheme?.categories || EMPTY_ARRAY}
                    renderItem={(item, index) => {
                      const t = tickets?.data || EMPTY_ARRAY
                      const schemeCount = schemeSeatsCount.byCategory[item.value] || 0
                      const ticketsCount = t.filter(ticket => ticket.section === item.value).length
                      const totalCount = schemeCount > 0 ? schemeCount : ticketsCount
                      
                      const soldCount = t.filter(ticket => ticket.section === item.value && ticket.is_sold).length
                      const reservedCount = t.filter(ticket => ticket.section === item.value && ticket.is_reserved).length
                      const disabledCount = t.filter(ticket => ticket.section === item.value && ticket.disabled).length - soldCount - reservedCount
                      const remainsCount = totalCount - (soldCount + reservedCount + disabledCount)
                      
                      return (
                        <List.Item  style={{ marginBottom: 40, width: 300, textAlign: 'right' }}>
                          <List.Item.Meta
                            title={<span style={{ color: item.color }}><span style={{ verticalAlign: 'middle', marginRight: 6 }} dangerouslySetInnerHTML={{ __html: item.icon }} />{item.label}</span>}
                            description={<>Total <b>{totalCount}</b> tickets</>}
                          />
                          Sold <b>{soldCount}</b><br />
                          Reserved <b>{reservedCount}</b><br />
                          Disabled <b>{disabledCount}</b><br />
                          Remains <b>{remainsCount}</b>
                        </List.Item>
                      )
                    }}
                  />
                  <div style={{ width: 300, marginTop: -30 }}>
                    <List.Item.Meta
                      title={<span style={{ color: '#000' }}>Summary</span>}
                      description={<>Total <b>{sumTotal}</b> tickets</>}
                    />
                    Sold <b>{sumSold}</b><br />
                    Reserved <b>{sumReserved}</b><br />
                    Disabled <b>{sumDisabled}</b><br />
                    Remains <b>{sumRemains}</b>
                  </div>
                </div>
            },
            {
              key: '5',
              label: <b>E-mail template</b>,
              style: panelStyle,
              children:
                <div>
                  <Form.Item initialValue={emailSubject} label='Subject' name='template_subject'>
                    <Input placeholder="Your Tickets - Order #{order_id}" />
                  </Form.Item>
                  <Form.Item initialValue={emailContent} label='Body' name='template_body'>
                    <Input.TextArea 
                      rows={8}
                      placeholder={`Hello {user_name}!\n\nYour order #{order_id} with {ticket_count} ticket(s) is confirmed.\n\nThank you for your purchase!`}
                    />
                  </Form.Item>
                  <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                    <b>Available fields:</b> user_name, order_id, ticket_count
                  </div>
                </div>
            },
            {
              key: '6',
              label: <b>PDF ticket</b>,
              style: panelStyle,
              children:
                <div>
                  <Form.Item initialValue={pdfContent} name='pdf_body'>
                    <Input.TextArea 
                      rows={10}
                      placeholder={`Available placeholders:\n{event_name} {event_date}\n{code} {section} {row} {seat}\n{price} {currency}\n\nExample: Section {section}, Row {row}, Seat {seat}`}
                    />
                  </Form.Item>
                  <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                    <b>Available fields:</b> event_name, event_date, code, section, row, seat, price, currency
                  </div>
                </div>
            },
            {
              key: '7',
              label: <b>Tickets</b>,
              style: panelStyle,
              children:
                <>
                  <Button
                    size='large'
                    type='default'
                    htmlType='button'
                    icon={<DownloadOutlined />}
                    onClick={() => exportTickets(tickets.data, id)}
                  >
                    Download CSV
                  </Button>
                  <Table
                    rowKey={(record) => record.code || record.fullSeat || `ticket-${record.section}-${record.row}-${record.seat}`}
                    columns={ticketsColumns}
                    dataSource={tickets.data || []}
                  />
                </>
            },
            {
              key: '8',
              label: <b>Promocodes</b>,
              style: panelStyle,
              children: (
                <PromocodesAccordion 
                  eventId={id && !isNew ? Number(id) : null}
                  promocodes={data?.promocodes || []}
                  messageApi={messageApi}
                  form={form}
                />
              )
            },
            {
              key: '9',
              label: <b>Ticket controllers</b>,
              style: panelStyle,
              children: <ControllersAccordion eventId={id && !isNew ? Number(id) : null} />
            }
          ]}
        />
        {contextHolder}
      </Form>
      <Sidebar />
    </>
  )
}