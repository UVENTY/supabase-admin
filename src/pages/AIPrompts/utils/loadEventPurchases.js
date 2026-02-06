import { supabase } from '../../../supabase/client'
import { setTicketsPurchases } from '../../../redux/data'
import dayjs from 'dayjs'

export async function loadEventPurchases(eventId, dispatch) {
  const eventIdStr = String(eventId)
  console.log(`Данные о покупках для события ${eventIdStr} отсутствуют в Redux, загружаем...`)
  
  try {
    const { data: baseTickets, error: ticketsError } = await supabase
      .from('ticket')
      .select('*')
      .eq('id_schedule', eventId)
    
    if (ticketsError || !baseTickets || baseTickets.length === 0) {
      return
    }
    
    const { fetchTicketsPaymentDataFromSupabase } = await import('../../../api/tickets/request_supabase')
    const paymentData = await fetchTicketsPaymentDataFromSupabase(baseTickets)
    const { booking } = paymentData?.data || {}
    
    const ticketsWithPurchases = baseTickets.map((ticket) => {
      const orderId = ticket.id_order || ticket.sold_info?.buy_id
      const orderData = orderId ? booking?.[orderId] : null
      
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
    })
    
    const serializableTickets = ticketsWithPurchases.map(ticket => {
      let dateString = null
      if (ticket.sold_info && ticket.sold_info.date) {
        if (typeof ticket.sold_info.date === 'string') {
          dateString = ticket.sold_info.date
        } else if (ticket.sold_info.date && typeof ticket.sold_info.date.format === 'function') {
          dateString = ticket.sold_info.date.format('YYYY-MM-DD')
        } else if (ticket.sold_info.date instanceof Date) {
          dateString = new Date(ticket.sold_info.date).toISOString().split('T')[0]
        }
      }
      
      return {
        section: ticket.section,
        row: ticket.row,
        seat: ticket.seat,
        tariff: ticket.tariff,
        currency: ticket.currency,
        status: ticket.status,
        sold_info: ticket.sold_info ? {
          user_id: ticket.sold_info.user_id,
          buy_id: ticket.sold_info.buy_id,
          date: dateString
        } : null
      }
    })
    
    const soldCount = serializableTickets.filter(t => t.sold_info).length
    console.log(`Загружено и сохранено в Redux для события ${eventIdStr}: ${serializableTickets.length} билетов, ${soldCount} проданных`)
    
    dispatch(setTicketsPurchases({ eventId: eventIdStr, tickets: serializableTickets }))
  } catch (error) {
    console.error(`Ошибка загрузки покупок для события ${eventIdStr}:`, error)
  }
}
