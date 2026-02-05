import { useQuery } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '../../../supabase/client'
import { setTicketsPurchases } from '../../../redux/data'
import dayjs from 'dayjs'

export function useTicketPurchases(selectedEventIds) {
  const dispatch = useDispatch()
  const ticketsPurchases = useSelector(state => state.data.ticketsPurchases || {})

  const { data: purchasesLoadingData, isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases-for-ai', selectedEventIds],
    queryFn: async () => {
      if (selectedEventIds.length === 0) {
        return {}
      }
      
      const results = {}
      for (const eventId of selectedEventIds) {
        const eventIdStr = String(eventId)
        
        if (ticketsPurchases[eventIdStr]) {
          continue 
        }
        
        const { data: baseTickets, error: ticketsError } = await supabase
          .from('ticket')
          .select('*')
          .eq('id_schedule', eventId)
        
        if (ticketsError) {
          continue
        }
        
        if (!baseTickets || baseTickets.length === 0) {
          continue
        }
        
        try {
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
          
          dispatch(setTicketsPurchases({ eventId: eventIdStr, tickets: serializableTickets }))
          results[eventIdStr] = serializableTickets
        } catch (error) {

        }
      }
      
      return results
    },
    enabled: selectedEventIds.length > 0
  })

  return { purchasesLoadingData, isLoadingPurchases }
}
