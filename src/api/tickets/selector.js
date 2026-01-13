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
 * @property {boolean} disabled - Is ticket sold
 * @property {boolean} is_sold - Is ticket sold
 * @property {boolean} is_reserved - Is ticket reserved
 * @property {object} sold_info - Sold info
 * @property {string} sold_info.user_id
 * @property {string} sold_info.buy_id
 * @property {object} reserved_info - Reserved info
 * @property {string} reserved_info.user_id
 * @property {string} reserved_info.until_date - Reserved until date
 *
 *
 * @param {*} data
 * @returns {Ticket[]} Array of tickets
 */
export const selectFlatArray = ({ old: data, new: list }) => {
  const newDataMap = (list?.ticket || []).reduce((acc, item) => {
    const [ , section, row, seat ] = item.seat.split(';')
    const { currency, code, code_qr_base64, status, tariff, price, id_order, user_id } = item
    const key = [section, row, seat].join(';')
    acc[key] = { 
      currency, 
      code, 
      code_qr_base64, 
      status: Number(status), 
      fullSeat: item.seat,
      tariff: tariff !== undefined ? Number(tariff) : (price !== undefined ? Number(price) : undefined),
      price: price !== undefined ? Number(price) : (tariff !== undefined ? Number(tariff) : undefined),
      id_order: id_order || null,
      user_id: user_id || null
    }
    return acc
  }, {})
  
  return Object.values(data.trip).reduce((tickets, group) => {    
    const commonData = renameKeys({
      sc_id: 'event_id',
      stadium: 'hall_id',
      t_start_datetime: 'date_start',
      t_id: 'fuckingTrip'
    }, group, true)
    const { seats_sold = {}, price: pricesList = [] } = group.t_options || {}
        entries(seats_sold).forEach(([section, rows]) => {
          entries(rows).forEach(([row, seats]) => {
            entries(seats).forEach(([seat, seatOptions]) => {
              const priceString = pricesList[isArray(seatOptions) ? seatOptions[0] : null]
              const [ priceFromList, currencyFromList ] = typeof priceString === 'string' ? priceString.split(' ') : []
              let range = seat.split(';').map(Number).filter(Boolean)
              if (range.length <= 1) range = [seat]
              let status = {}
              if (seatOptions.length > 1) {
                const [ , user_id, buy_id, until_date ] = seatOptions
                status = {
                  disabled: true,
                  is_sold: seatOptions.length === 3,
                  is_reserved: seatOptions.length === 4,
                  sold_info: until_date ? {} : {
                    user_id,
                    buy_id
                  },
                  reserved_info: !until_date ? {} : {
                    user_id,
                    buy_id,
                    until_date
                  }
                }
              }
              Array.from(
                { length: range.length === 2 ? range[1] - range[0] + 1 : 1 },
                (_, i) => Number(range[0]) ? i + Number(range[0]) : range[0]
              ).forEach(seatNum => {
                const seatKey = [section, row, seatNum].join(';')
                const newData = newDataMap[seatKey]
                
                const finalPrice = newData?.tariff !== undefined 
                  ? Number(newData.tariff) 
                  : (newData?.price !== undefined 
                    ? Number(newData.price) 
                    : Number(priceFromList || 0))
                
                const finalCurrency = newData?.currency || currencyFromList || 'USD'
                
                if (newData?.id_order || newData?.status === 3) {
                  if (!status.sold_info && newData?.id_order) {
                    status.sold_info = {
                      user_id: newData.user_id,
                      buy_id: newData.id_order
                    }
                  }
                  status.is_sold = true
                  status.disabled = true
                  status.is_reserved = false 
                }
                
                if (newData?.status === 2 && !status.is_sold) {
                  status.is_reserved = true
                  status.disabled = true
                }
                
                tickets.push({
                  ...commonData,
                  section,
                  row,
                  seat: seatNum,
                  price: finalPrice,
                  tariff: finalPrice, 
                  currency: finalCurrency,
                  ...status,
                  ...(newData || {})
                })
              })
            })
          })
        })

    const filteredTickets = tickets.filter(seat => seat.row !== '0')
    
    const addedTicketsMap = new Map()
    filteredTickets.forEach(t => {
      const key = [t.section, t.row, t.seat].join(';')
      addedTicketsMap.set(key, true)
    })
    
    Object.entries(newDataMap).forEach(([key, newData]) => {
      if (!addedTicketsMap.has(key) && (newData?.id_order || newData?.status === 3)) {
        const [section, row, seat] = key.split(';')
        if (section && row && seat) {
          const firstTrip = Object.values(data.trip)[0]
          if (firstTrip) {
            const commonData = renameKeys({
              sc_id: 'event_id',
              stadium: 'hall_id',
              t_start_datetime: 'date_start',
              t_id: 'fuckingTrip'
            }, firstTrip, true)
            
            filteredTickets.push({
              ...commonData,
              section,
              row,
              seat,
              price: newData?.tariff || newData?.price || 0,
              tariff: newData?.tariff || newData?.price || 0,
              currency: newData?.currency || 'USD',
              code: newData?.code || '',
              code_qr_base64: newData?.code_qr_base64 || '',
              status: newData?.status || 3,
              disabled: true,
              is_sold: true,
              is_reserved: false,
              sold_info: newData?.id_order ? {
                user_id: newData.user_id,
                buy_id: newData.id_order
              } : null,
              id_order: newData?.id_order || null,
              user_id: newData?.user_id || null,
              fullSeat: newData?.fullSeat || `${data.trip?.[0]?.stadium || ''};${key}`
            })
          }
        }
      }
    })
    
    return filteredTickets
  }, [])
}
