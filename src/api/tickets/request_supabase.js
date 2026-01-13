import { supabase } from '../../supabase/client'
import dayjs from 'dayjs'

export async function fetchTicketsFromSupabase(params) {
  const { filter: event_id } = params || {}
  
  if (!event_id) {
    return { old: { trip: [] }, new: { ticket: [] } }
  }

  try {
    const { data: trips, error: tripsError } = await supabase
      .from('trip')
      .select('*')
      .eq('id_schedule', event_id)

    if (tripsError) {
      console.error('Error fetching trips:', tripsError)
      return { old: { trip: [] }, new: { ticket: [] } }
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from('ticket')
      .select('*')
      .eq('id_schedule', event_id)

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return { old: { trip: trips || [] }, new: { ticket: [] } }
    }

    const transformedTrips = (trips || []).map(trip => ({
      sc_id: trip.id_schedule,
      stadium: trip.id_schedule,
      t_id: trip.id_trip,
      t_start_datetime: trip.start_plan_datetime || trip.start_datetime,
      t_options: {
        seats_sold: {},
        price: []
      }
    }))

    const priceMap = new Map()
    const seatsSold = {}

    tickets.forEach(ticket => {
      const parts = ticket.id_seat.split(';')
      if (parts.length >= 4) {
        const [, section, row, seat] = parts
        const price = ticket.tariff || 0
        const currency = ticket.currency || 'USD'
        const priceKey = `${price} ${currency}`
        
        let priceIndex = priceMap.get(priceKey)
        if (priceIndex === undefined) {
          priceIndex = priceMap.size
          priceMap.set(priceKey, priceIndex)
        }

        if (!seatsSold[section]) seatsSold[section] = {}
        if (!seatsSold[section][row]) seatsSold[section][row] = {}
        seatsSold[section][row][seat] = [priceIndex]

        if (ticket.id_order) {
          seatsSold[section][row][seat].push('', ticket.id_order) 
        }
      }
    })

    transformedTrips.forEach(trip => {
      trip.t_options.seats_sold = seatsSold
      trip.t_options.price = Array.from(priceMap.keys())
    })

    const orderIds = [...new Set(tickets.filter(t => t.id_order).map(t => t.id_order))]
    let ordersMap = {}
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('order')
        .select('id_order, client')
        .in('id_order', orderIds)
      
      if (orders) {
        ordersMap = orders.reduce((acc, order) => {
          acc[order.id_order] = order.client 
          return acc
        }, {})
      }
    }

    const transformedTickets = (tickets || []).map(ticket => {
      const parts = ticket.id_seat.split(';')
      const [, section, row, seat] = parts.length >= 4 ? parts : ['', '', '', '']
      
      return {
        seat: ticket.id_seat, 
        section: section || '',
        row: row || '',
        seatNum: seat || '', 
        tariff: ticket.tariff || 0,
        price: ticket.tariff || 0, 
        currency: ticket.currency || 'USD',
        code: ticket.code || '',
        code_qr_base64: ticket.code_qr_base64 || '',
        status: ticket.status || 1,
        id_order: ticket.id_order, 
        user_id: ticket.id_order ? ordersMap[ticket.id_order] : null 
      }
    })

    return {
      old: { trip: transformedTrips },
      new: { ticket: transformedTickets }
    }
  } catch (error) {
    console.error('Error in fetchTicketsFromSupabase:', error)
    return { old: { trip: [] }, new: { ticket: [] } }
  }
}

/**
 * Получает данные о покупках (orders) из Supabase для билетов
 * @param {Array} tickets - Массив билетов с id_order
 * @returns {Object} Объект с данными о заказах в формате { data: { booking: { [buy_id]: { b_payment_datetime, ... } } } }
 */
export async function fetchTicketsPaymentDataFromSupabase(tickets = []) {
  const orderIds = tickets
    .map(ticket => ticket.id_order)
    .filter((id, index, arr) => id && arr.indexOf(id) === index)
  
  if (!orderIds.length) {
    return { data: { booking: {} } }
  }

  try {
    const { data: orders, error: ordersError } = await supabase
      .from('order')
      .select('id_order, client, pay_datetime, id_order_status')
      .in('id_order', orderIds)

    if (ordersError) {
      console.error('Error fetching orders from Supabase:', ordersError)
      return { data: { booking: {} } }
    }

    const booking = {}
    orders.forEach(order => {
      if (order.id_order) {
        booking[order.id_order] = {
          b_payment_datetime: order.pay_datetime ? dayjs(order.pay_datetime).toISOString() : null,
          id_user: order.client, 
          order_status: order.id_order_status
        }
      }
    })

    return { data: { booking } }
  } catch (error) {
    console.error('Error in fetchTicketsPaymentDataFromSupabase:', error)
    return { data: { booking: {} } }
  }
}
