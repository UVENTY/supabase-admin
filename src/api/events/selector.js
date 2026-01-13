import { renameKeys } from '../utils'

const isArray = Array.isArray
const entries = Object.entries

/**
 * @typedef {Object} Ticket
 * @property {string} event_id - Event ID
 * @property {string} hall_id - Hall ID
 * @property {string} date_start - Start date
 * @property {string} section - Section
 * @property {string} row - Row
 * @property {number} seat - Seat
 * @property {number} price - Price
 * @property {string} currency - Currency
 *
 * @param {*} data
 * @returns {Ticket[]} Array of tickets
 */
export const selectFlatArray = data =>
  Object.values(data.trip).reduce((tickets, group) => {
    const commonData = renameKeys({
      sc_id: 'event_id',
      stadium: 'hall_id',
      t_start_datetime: 'date_start',
    }, group, true)
    const { seats_sold = {}, price: pricesList = [] } = group.t_options || {}
    entries(seats_sold).forEach(([section, rows]) => {
      entries(rows).forEach(([row, seats]) => {
        entries(seats).forEach(([seat, seatOptions]) => {
          const priceString = pricesList[isArray(seatOptions) ? seatOptions[0] : null]
          const [ price, currency ] = typeof priceString === 'string' ? priceString.split(' ') : []
          const range = seat.split(';').map(Number).filter(Boolean)
          if (range.length < 1) return
          Array.from(
            { length: range.length === 2 ? range[1] - range[0] + 1 : 1 },
            (_, i) => i + range[0]
          ).forEach(seat => tickets.push({
            ...commonData,
            section,
            row,
            seat,
            price: Number(price),
            currency
          }))
        })
      })
    })
    return tickets
  }, [])
