import axios from '../../utils/axios'
import { setTicketByMatch, setLoading, setTicketsFile } from '.'

function parseTrips(trips) {
  return trips ? Object.values(trips)
    .filter(trip =>
      trip.t_options &&
      (trip.t_options.price || []).length > 0 &&
      Object.values(trip.t_options.seats_sold || {}).length > 0
    )
    .reduce((acc, trip) => {
      const { t_id, t_create_datetime, t_start_address, t_options, stadium } = trip
      const matchId = t_start_address.split('sc_id\x00')[1]
      if (!acc[matchId]) {
        acc[matchId] = {
          matchId,
          tickets: []
        }
      }

      const seatsSold = t_options.seats_sold || {}
      const prices = t_options.price
      const tickets = []
      Object.keys(seatsSold)
        .forEach(block => {
          if (typeof seatsSold[block] !== 'object') return
          Object.keys(seatsSold[block]).forEach(row => {
            if (typeof seatsSold[block][row] !== 'object') return
            Object.keys(seatsSold[block][row]).forEach(seat => {
              const seatValues = seatsSold[block][row][seat]
              const priceIndex = seatValues[0]
              const soldToUser = seatValues[1] || null
              if (priceIndex !== 0 && !priceIndex) return
              const price = prices[priceIndex]
              const [ priceValue, priceCurrency ] = price.split(' ')
              const ticket = {
                tripId: t_id,
                stadium,
                created: t_create_datetime,
                block,
                row,
                price: `${parseFloat(priceValue).toFixed(2)}`,
                currency: priceCurrency,
                soldToUser
              }
              if (seat.includes(';')) {
                const [ rangeStart, rangeEnd ] = seat.split(';').map(Number)
                for (var i = rangeStart; i <= rangeEnd; i++) {
                  tickets.push({ ...ticket, seat: i, seatId: [stadium, block, row, i].join(';') })
                }
              } else {
                tickets.push({ ...ticket, seat, seatId: [stadium, block, row, seat].join(';') })
              }
            })
          })
        })
      acc[matchId].tickets = acc[matchId].tickets.concat(tickets)
      return acc
    }, {}) : {}
}

export const fetchTicketGroups = async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const res = await axios.postWithAuth('/trip', { lc: 0 })
    const tripsByMatch = parseTrips(res.data?.data?.trip)

    dispatch(setTicketByMatch(tripsByMatch))
  } catch (e) {
    console.error(e)
  } finally {
    dispatch(setLoading(false))
  }
}

export const fetchAllTickets = async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const res = await axios.postWithAuth('/trip/get', { lc: 0 })
    const tripsByMatch = parseTrips(res.data?.data?.trip)
    
    dispatch(setTicketByMatch(tripsByMatch))
  } catch (e) {
    console.error(e)
  } finally {
    dispatch(setLoading(false))
  }
}

export const fetchTicketsFiles = (tripsId) => async (dispatch) => {
  try {
    const promises = tripsId.map(trip => axios.postWithAuth(`/trip/get/${trip}/ticket/read`))
    const files = await Promise.all(promises)
    const seats = files
      .reduce((acc, { data }) => ([
        ...acc,
        ...data.data?.seats
      ]), [])
      .reduce((acc, seatId) => ({ ...acc, [seatId]: true }), {})
    dispatch(setTicketsFile(seats))
  } catch (e) {
    console.error(e)
  }
}
