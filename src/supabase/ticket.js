import { supabase } from './client'

function generateTicketCode(tripId, tripSeatId) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
  let randomPart = ''
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return `${tripId}-${tripSeatId}-${randomPart}`
}

async function generateQRCode(code) {
  try {
    const { qrBase64 } = await import('../utils/utils')
    return await qrBase64(code)
  } catch (error) {
    console.error('Error generating QR code:', error)
    return null
  }
}

export async function getTicketsBySchedule(scheduleId, filters = {}) {
  try {
    let query = supabase
      .from('ticket')
      .select(`
        *,
        trip:trip(*),
        order:order(*),
        schedule:schedule(*)
      `)
      .eq('id_schedule', scheduleId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.availableOnly) {
      query = query.eq('status', 1).is('id_order', null)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get tickets error:', error)
    return { data: null, error }
  }
}

export async function returnTicketToSale(tripId, idSeat, orderId = null) {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('ticket')
      .select('id_trip, id_seat, id_order, status, pass, id_trip_seat, code')
      .eq('id_trip', tripId)
      .eq('id_seat', idSeat)
      .single()

    if (ticketError) {
      console.error('Error finding ticket:', ticketError)
      return { data: null, error: ticketError }
    }

    if (!ticket) {
      return { data: null, error: { message: 'Ticket not found' } }
    }

    const ticketOrderId = orderId || ticket.id_order

    let newCode = null
    let newQRCode = null
    
    const ticketTripId = ticket.id_trip || tripId
    
    if (ticketTripId && ticket.id_trip_seat) {
      newCode = generateTicketCode(ticketTripId, ticket.id_trip_seat)
      
      try {
        newQRCode = await generateQRCode(newCode)
        console.log('✅ Generated new ticket code and QR code:', { 
          oldCode: ticket.code, 
          newCode,
          hasQRCode: !!newQRCode 
        })
      } catch (qrError) {
        console.error('⚠️ Error generating QR code:', qrError)
      }
    } else {
      console.warn('⚠️ Cannot generate new code: missing id_trip or id_trip_seat', {
        id_trip: ticket.id_trip,
        id_trip_seat: ticket.id_trip_seat
      })
    }

    const updateData = {
      id_order: null, 
      status: 1, 
      pass: false, 
      updated_at: new Date().toISOString()
    }

    if (newCode) {
      updateData.code = newCode
    }
    if (newQRCode) {
      updateData.code_qr_base64 = newQRCode
    }

    console.log('🔄 Updating ticket to return to sale:', { tripId, idSeat, updateData })

    const { data: updatedTicket, error: updateError } = await supabase
      .from('ticket')
      .update(updateData)
      .eq('id_trip', tripId)
      .eq('id_seat', idSeat)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Error updating ticket:', updateError)
      return { data: null, error: updateError }
    }

    if (!updatedTicket) {
      console.error('❌ Ticket update verification failed: updatedTicket is null')
      return { 
        data: null, 
        error: { 
          message: 'Ticket update verification failed: updatedTicket is null'
        } 
      }
    }
    
    if (updatedTicket.id_order !== null) {
      console.warn('⚠️ Warning: Ticket id_order is not null after update:', updatedTicket.id_order)
    }
    
    if (updatedTicket.status !== 1) {
      console.warn('⚠️ Warning: Ticket status is not 1 after update:', updatedTicket.status)
    }

    console.log('✅ Ticket successfully updated:', { 
      tripId, 
      idSeat, 
      id_order: updatedTicket.id_order, 
      status: updatedTicket.status,
      pass: updatedTicket.pass,
      oldCode: ticket.code,
      newCode: updatedTicket.code,
      codeUpdated: ticket.code !== updatedTicket.code,
      qrCodeUpdated: !!newQRCode
    })

    if (ticketOrderId) {
      const { error: orderUpdateError } = await supabase
        .from('order')
        .update({
          id_order_status: 4,
          last_edit_datetime: new Date().toISOString()
        })
        .eq('id_order', ticketOrderId)

      if (orderUpdateError) {
        console.warn('⚠️ Could not update order status to cancelled:', orderUpdateError)
      } else {
        console.log('✅ Order status updated to cancelled (4) for order:', ticketOrderId)
      }
    }

    return { data: updatedTicket, error: null }
  } catch (error) {
    console.error('❌ returnTicketToSale error:', error)
    return { data: null, error }
  }
}

export async function removeTicketFromSale(tripId, idSeat) {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('ticket')
      .select('id_trip, id_seat, status')
      .eq('id_trip', tripId)
      .eq('id_seat', idSeat)
      .single()

    if (ticketError) {
      console.error('Error finding ticket:', ticketError)
      return { data: null, error: ticketError }
    }

    if (!ticket) {
      return { data: null, error: { message: 'Ticket not found' } }
    }

    const updateData = {
      status: 2,
      updated_at: new Date().toISOString()
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('ticket')
      .update(updateData)
      .eq('id_trip', tripId)
      .eq('id_seat', idSeat)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return { data: null, error: updateError }
    }

    return { data: updatedTicket, error: null }
  } catch (error) {
    console.error('removeTicketFromSale error:', error)
    return { data: null, error }
  }
}

export async function getTicketsByTrip(tripId) {
  try {
    const { data, error } = await supabase
      .from('ticket')
      .select(`
        *,
        trip:trip(*),
        schedule:schedule(*)
      `)
      .eq('id_trip', tripId)

    if (error) throw error

    const grouped = data?.reduce((acc, ticket) => {
      const parts = ticket.id_seat?.split(';') || []
      if (parts.length >= 4) {
        const [, category, row, seat] = parts
        if (!acc[category]) acc[category] = {}
        if (!acc[category][row]) acc[category][row] = {}
        acc[category][row][seat] = ticket
      }
      return acc
    }, {})

    return { data: grouped || {}, error: null }
  } catch (error) {
    console.error('Get tickets by trip error:', error)
    return { data: null, error }
  }
}

export async function checkTicket(code) {
  try {
    const { data, error } = await supabase
      .from('ticket')
      .select(`
        *,
        order:orders(*),
        schedule:schedule(*),
        trip:trip(*)
      `)
      .eq('code', code)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          data: null, 
          error: { message: 'Ticket not found', code: '404' } 
        }
      }
      throw error
    }

    const isPaid = data.status === 2 || 
      (data.order?.id_order_status !== 3 && data.order?.pay_datetime)

    if (!isPaid) {
      return { 
        data: null, 
        error: { message: 'Ticket not paid', code: '404' } 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Check ticket error:', error)
    return { data: null, error }
  }
}

export async function updateTicketPass(ticketId, seatId, passed) {
  try {
    const updateData = {
      pass: passed ? 1 : 0,
      pass_datetime: passed ? new Date().toISOString() : null,
      out_datetime: passed ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ticket')
      .update(updateData)
      .eq('id_trip_seat', ticketId)
      .eq('id_seat', seatId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Update ticket pass error:', error)
    return { data: null, error }
  }
}

export async function getAvailableSeats(scheduleId, tripId) {
  try {
    const { data: tickets, error: ticketsError } = await supabase
      .from('ticket')
      .select('*')
      .eq('id_schedule', scheduleId)
      .eq('id_trip', tripId)

    if (ticketsError) throw ticketsError

    const { data: trip, error: tripError } = await supabase
      .from('trip')
      .select('*')
      .eq('id_trip', tripId)
      .single()

    if (tripError) throw tripError

    const seats_sold = {}
    const prices = trip.json?.price || []

    tickets?.forEach(ticket => {
      const parts = ticket.id_seat?.split(';') || []
      if (parts.length >= 4) {
        const [, category, row, seat] = parts
        if (!seats_sold[category]) seats_sold[category] = {}
        if (!seats_sold[category][row]) seats_sold[category][row] = {}

        const seatOptions = []
        if (ticket.tariff) {
          const priceIndex = prices.findIndex(p => 
            p.includes(ticket.tariff) && p.includes(ticket.currency)
          )
          seatOptions.push(priceIndex >= 0 ? priceIndex : null)
        }
        if (ticket.id_order) {
          seatOptions.push(2) 
        }
        const cartBooking = ticket.booking_limit
        if (cartBooking) {
          seatOptions.push(3) 
        }

        seats_sold[category][row][seat] = seatOptions
      }
    })

    return {
      data: {
        seats_sold,
        price: prices
      },
      error: null
    }
  } catch (error) {
    console.error('Get available seats error:', error)
    return { data: null, error }
  }
}