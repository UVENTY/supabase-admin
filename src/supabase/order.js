import { supabase } from './client'

export async function createOrder(orderData) {
  try {
    const { seats, promocode, user_id, currency } = orderData

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client: user_id,
        sum: orderData.sum || 0,
        currency: currency || 'EUR',
        id_order_status: 1, 
        options: {
          tickets: {
            seats
          }
        },
        create_datetime: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    for (const [tripId, tripSeats] of Object.entries(seats)) {
      for (const seatId of Object.keys(tripSeats)) {
        const parts = seatId.split(';')
        
        const { error: ticketError } = await supabase
          .from('ticket')
          .update({
            id_order: order.id_order,
            status: 3, 
            updated_at: new Date().toISOString()
          })
          .eq('id_trip', tripId)
          .eq('id_seat', seatId)
          .is('id_order', null) 

        if (ticketError) {
          console.error('Error updating ticket:', ticketError)
        }
      }
    }

    if (promocode) {
      const { data: promoData } = await supabase
        .from('promocode')
        .select('id_promocode')
        .eq('value', promocode)
        .eq('active', true)
        .single()

      if (promoData) {
        await supabase
          .from('order_prop_items_int')
          .insert({
            id_order: order.id_order,
            id_order_prop: 2, 
            value: promoData.id_promocode
          })
      }
    }

    await supabase
      .from('cart')
      .delete()
      .eq('id_user', user_id)

    return { data: order, error: null }
  } catch (error) {
    console.error('Create order error:', error)
    return { data: null, error }
  }
}

export async function getUserOrders(userId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        tickets:ticket(*)
      `)
      .eq('client', userId)
      .order('create_datetime', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get user orders error:', error)
    return { data: null, error }
  }
}

export async function getOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        tickets:ticket(*),
        client:users(*)
      `)
      .eq('id_order', orderId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get order by id error:', error)
    return { data: null, error }
  }
}

export async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const updateData = {
      id_order_status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 2) { 
      updateData.pay_datetime = new Date().toISOString()
    } else if (status === 6) { 
      updateData.offer_datetime = new Date().toISOString()
    } else if (status === 1) { 
      updateData.process_datetime = new Date().toISOString()
    } else if (status === 5) { 
      updateData.pending_datetime = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        ...updateData,
        ...additionalData
      })
      .eq('id_order', orderId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Update order status error:', error)
    return { data: null, error }
  }
}

