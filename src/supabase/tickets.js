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

export async function createOrUpdateTickets(eventId, stadiumId, ticketsData) {
  try {

    if (!eventId || !stadiumId) {
      throw new Error('eventId и stadiumId обязательны')
    }

    let trip = null
    
    const { data: existingTrips, error: tripFindError } = await supabase
      .from('trip')
      .select('id_trip')
      .eq('id_schedule', eventId)
      .limit(1)

    if (tripFindError) {
      console.error('❌ Error finding trip:', tripFindError)
    }

    if (existingTrips && existingTrips.length > 0) {
      trip = existingTrips[0]
    } else {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedule')
        .select('start_datetime, duration')
        .eq('id_schedule', eventId)
        .single()

      if (scheduleError) {
        throw new Error(`Не удалось получить данные события: ${scheduleError.message}`)
      }

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id_user')
        .limit(1)

      if (userError || !users || users.length === 0) {
        throw new Error(`Не удалось найти пользователя для trip: ${userError?.message || 'No users found'}`)
      }
      
      const firstUser = users[0]

      const startDatetime = scheduleData.start_datetime || new Date().toISOString()
      const duration = scheduleData.duration || 120 
      const completeDatetime = new Date(new Date(startDatetime).getTime() + duration * 60000).toISOString()

      const { data: newTrip, error: tripCreateError } = await supabase
        .from('trip')
        .insert({
          id_schedule: eventId,
          driver: firstUser.id_user, 
          from: '',
          to: '',
          start_plan_datetime_interval: 0,
          start_plan_datetime: startDatetime,
          complete_plan_datetime: completeDatetime,
          start_datetime: startDatetime,
          complete_datetime: completeDatetime,
          looking_for_clients: false,
          canceled: false
        })
        .select('id_trip')
        .single()

      if (tripCreateError) {
        throw new Error(`Не удалось создать trip: ${tripCreateError.message}`)
      }
      trip = newTrip
    }

    const tripId = trip.id_trip

    let eventCurrency = 'EUR' 
    try {
      const { data: scheduleData } = await supabase
        .from('schedule')
        .select('currency')
        .eq('id_schedule', eventId)
        .single()
      
      if (scheduleData?.currency) {
        eventCurrency = scheduleData.currency
      } else {
        const { data: tripData } = await supabase
          .from('trip')
          .select('currency')
          .eq('id_trip', tripId)
          .single()
        
        if (tripData?.currency) {
          eventCurrency = tripData.currency
        }
      }
    } catch (error) {
      // Используем EUR по умолчанию при ошибке получения валюты
    }


    const { data: existingTicketsMap } = await supabase
      .from('ticket')
      .select('id_seat, id_trip_seat, id_trip')
      .eq('id_schedule', eventId)

    const existingTicketsByIdSeat = {}
    if (existingTicketsMap) {
      existingTicketsMap.forEach(ticket => {
        existingTicketsByIdSeat[ticket.id_seat] = ticket
      })
    }

    const maxTripSeat = existingTicketsMap 
      ? Math.max(...existingTicketsMap.filter(t => t.id_trip === tripId).map(t => t.id_trip_seat || 0), 0)
      : 0

    let tripSeatCounter = maxTripSeat + 1

    const ticketsToInsert = []
    const ticketsToUpdate = []
    const ticketsToDelete = [] 

    const ticketsToProcess = []
    Object.entries(ticketsData || {}).forEach(([seatKey, price]) => {
      const parts = seatKey.split(';')
      
      if (parts.length < 3) {
        return
      }
      
      let hallId, section, row, seat, idSeat
      
      if (parts.length === 4) {
        [hallId, section, row, seat] = parts
        idSeat = `${hallId};${section};${row};${seat}`
      } else if (parts.length === 3) {
        [section, row, seat] = parts
        hallId = stadiumId || null
        idSeat = hallId ? `${hallId};${section};${row};${seat}` : `${section};${row};${seat}`
      } else {
        return
      }
      
      const ticketPrice = typeof price === 'number' ? price : parseFloat(price) || 0
      
      if (price === -1) {
        const existingTicket = existingTicketsByIdSeat[idSeat]
        if (existingTicket) {
          ticketsToDelete.push(idSeat)
        }
        return
      }
      
      if (ticketPrice <= 0) {
        return
      }
      
      const existingTicket = existingTicketsByIdSeat[idSeat]
      
      if (existingTicket) {
        ticketsToUpdate.push({
          id_seat: idSeat,
          id_schedule: eventId,
          tariff: ticketPrice,
          currency: eventCurrency
        })
      } else {
        const currentTripSeatId = tripSeatCounter++
        const ticketCode = generateTicketCode(tripId, currentTripSeatId)
        ticketsToProcess.push({
          id_seat: idSeat,
          eventId,
          tripId,
          tripSeatCounter: currentTripSeatId,
          ticketPrice,
          section,
          row,
          seat,
          ticketCode
        })
      }
    })
    
    const ticketsWithQR = await Promise.all(ticketsToProcess.map(async (ticket) => {
      const qrCodeBase64 = await generateQRCode(ticket.ticketCode)
      return {
        id_schedule: ticket.eventId,
        id_seat: ticket.id_seat,
        id_trip: ticket.tripId,
        id_trip_seat: ticket.tripSeatCounter,
        tariff: ticket.ticketPrice,
        currency: eventCurrency, 
        section: ticket.section,
        block: ticket.row, 
        row: ticket.row,
        seat: ticket.seat,
        status: 1, 
        pass: false,
        code: ticket.ticketCode,
        code_qr_base64: qrCodeBase64 || null
      }
    }))
    
    ticketsToInsert.push(...ticketsWithQR)

    if (ticketsToUpdate.length > 0) {
      const seatKeys = ticketsToUpdate.map(t => t.id_seat)
      const { data: existingTicketsForUpdate } = await supabase
        .from('ticket')
        .select('id_seat, code, code_qr_base64, id_trip, id_trip_seat')
        .eq('id_schedule', eventId)
        .in('id_seat', seatKeys)
      
      const existingTicketsMap = {}
      if (existingTicketsForUpdate) {
        existingTicketsForUpdate.forEach(ticket => {
          existingTicketsMap[ticket.id_seat] = ticket
        })
      }
      
      const BATCH_SIZE = 50
      let updatedCount = 0
      
      // Сохраняем начальное значение tripSeatCounter для использования в цикле
      const initialTripSeatCounter = tripSeatCounter
      
      for (let i = 0; i < ticketsToUpdate.length; i += BATCH_SIZE) {
        const batch = ticketsToUpdate.slice(i, i + BATCH_SIZE)
        
        const batchStartIndex = i
        // Сохраняем значение для текущей итерации цикла
        const currentTripSeatCounter = initialTripSeatCounter
        const updatePromises = await Promise.all(batch.map(async (ticket, batchIndex) => {
          const existingTicket = existingTicketsMap[ticket.id_seat]
          const updateData = { 
            tariff: ticket.tariff,
            currency: eventCurrency
          }
          
          if (!existingTicket?.code || !existingTicket?.code_qr_base64) {
            let ticketCode = existingTicket?.code
            if (!ticketCode && existingTicket?.id_trip && existingTicket?.id_trip_seat) {
              ticketCode = generateTicketCode(existingTicket.id_trip, existingTicket.id_trip_seat)
            } else if (!ticketCode) {
              const localCounter = currentTripSeatCounter + batchStartIndex + batchIndex 
              ticketCode = generateTicketCode(tripId, localCounter)
            }
            const qrCodeBase64 = existingTicket?.code_qr_base64 || await generateQRCode(ticketCode)
            
            updateData.code = ticketCode
            if (qrCodeBase64) {
              updateData.code_qr_base64 = qrCodeBase64
            }
          }
          
          return supabase
            .from('ticket')
            .update(updateData)
            .eq('id_schedule', ticket.id_schedule)
            .eq('id_seat', ticket.id_seat)
        }))
        
        const results = updatePromises
        const errors = results.filter(r => r.error)
        
        if (errors.length > 0) {
          console.error(`❌ Error updating batch ${Math.floor(i / BATCH_SIZE) + 1}:`, errors[0].error)
          return { error: errors[0].error, updated: updatedCount }
        }
        
        updatedCount += batch.length
      }
      
    }

    if (eventCurrency) {
      const { data: allEventTickets, error: allTicketsError } = await supabase
        .from('ticket')
        .select('id_seat, currency')
        .eq('id_schedule', eventId)
      
      if (!allTicketsError && allEventTickets && allEventTickets.length > 0) {
        const ticketsWithWrongCurrency = allEventTickets.filter(t => t.currency !== eventCurrency)
        
        if (ticketsWithWrongCurrency.length > 0) {
          
          const BATCH_SIZE = 100
          for (let i = 0; i < ticketsWithWrongCurrency.length; i += BATCH_SIZE) {
            const batch = ticketsWithWrongCurrency.slice(i, i + BATCH_SIZE)
            const seatKeys = batch.map(t => t.id_seat)
            
            const { error: currencyUpdateError } = await supabase
              .from('ticket')
              .update({ currency: eventCurrency })
              .eq('id_schedule', eventId)
              .in('id_seat', seatKeys)
            
            if (currencyUpdateError) {
              console.error(`❌ Ошибка обновления валюты для билетов:`, currencyUpdateError)
            }
          }
          
        }
      }
    }

    if (ticketsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('ticket')
        .delete()
        .eq('id_schedule', eventId)
        .in('id_seat', ticketsToDelete)
      
      if (deleteError) {
        console.error('❌ Error deleting tickets:', deleteError)
      }
    }

    if (ticketsToInsert.length === 0) {
      if (ticketsToUpdate.length === 0 && ticketsToDelete.length === 0) {
        return { data: null, error: null }
      }
      return { data: [...(ticketsToUpdate || []), ...(ticketsToDelete || [])], error: null }
    }

    const { data, error } = await supabase
      .from('ticket')
      .insert(ticketsToInsert)
      .select()

    if (error) {
      console.error('❌ Error creating tickets:', error)
      throw error
    }

    return { data: [...(ticketsToUpdate || []), ...(data || [])], error: null }
  } catch (error) {
    console.error('❌ createOrUpdateTickets error:', error)
    return { data: null, error }
  }
}