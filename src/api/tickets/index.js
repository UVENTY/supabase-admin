/**
 * @typedef { Object } Ticket
 * @property { string } category - категория места
 * @property { string } row - ряд
 * @property { string } seat - место
 * @property { number } count - количество билетов (для категорий без местНу )
 * @property { number } price - цена
 * @property { string } currency - валюта
 */


import { useMutation, useQuery } from '@tanstack/react-query'
import { filter, group, order, pipe, renameKeys } from '../utils'
import { selectFlatArray } from './selector'
import { createTickets, createTrip, editTickets, fetchTickets } from './request'

export const transformFetchQuery = query => renameKeys({ event_id: 'filter', skip: 'lo', limit: 'lc' }, query)

export default (function() {
  const eventTrip = {}
  const eventTickets = {}

  /**
   * @param { object } options
   * @param { string } options.event_id - id мероприятия, для которого получаем билеты
   * @param { number } options.skip - кол-во пропущенных с начала списка записей 
   * @param { number } options.limit - ограничение по количеству выбираемых записей
   * @param { object } fn
   * @param { Function } fn.filter - функция фильтрации данных
   * @param { Function } fn.order - функция сортировки данных
   * @param { Function } fn.group - функция группировки данных
   * @param { import('@tanstack/react-query').UseQueryOptions } queryOptions
   * @returns { import('@tanstack/react-query').UseQueryResult }
   */
  const useTickets = (options = {}, fn = {}, { select, ...queryOptions } = {}) => {
    const { event_id, ...params } = options || {}
    return useQuery({
      ...queryOptions,
      queryKey: ['tickets', event_id, params],
      queryFn: () => fetchTickets(transformFetchQuery({ event_id, ...params })),
      select: pipe(
      selectFlatArray,
      tickets => {
        eventTrip[event_id] = tickets[0]?.fuckingTrip
        eventTickets[event_id] = tickets.map(({ section, row, seat }) => [section, row, seat].join(';'))
        return tickets
      },
      filter(fn.filter),
      order(fn.order),
      group(fn.group),
      select
    )
    })
  }
  
  /**
   * @param { object } options
   * @param { string } options.event_id
   * @param { string } options.hall_id
   * @param { string } options.row
   * @param { object } options.tickets
   * @returns { import('@tanstack/react-query').UseMutationResult }
   */
  const updateTickets = (options) => {
    const { event_id, hall_id, category, row, tickets } = options
    if (!event_id || !hall_id) throw new Error('Не переданы обязательные параметры')
    const tripId = eventTrip[event_id]
    const { editList, ...params } = Object.entries(tickets).reduce((acc, [key, data]) => {
      const fullKey = [hall_id, category, row, key].filter(Boolean).join(';')
      const value = typeof data === 'object' ? data.price : data
      const price = value && parseFloat(value)
      if (value) {
        let priceIndex = acc.price.indexOf(price)
        if (priceIndex === -1) {
          acc.price.push(price)
          priceIndex = acc.price.length - 1
        }
        acc.seats_sold[fullKey] = priceIndex
      }
      const parts = fullKey.split(';').slice(-3).join(';')
      const itm = {
        seat: fullKey,
        del: price < 0,
        new: !eventTickets[event_id].includes(parts)
      }
      if (price) {
        itm.price = price > 0 ? price : undefined
      }
      if (data?.code_qr) {
        itm.code_qr_base64 = data.code_qr
      }
      acc.editList.push(itm)
      return acc
    }, {
      seats_sold: {},
      price: [],
      editList: []
    })
    if (tripId) {
       const data = JSON.stringify(editList)
       return editTickets(tripId, { data })
    }
    const data = JSON.stringify({
      t_options: {
        ...params
      },
      st_id: event_id,
      t_start_address: `sc_id\u0000${event_id}`
    })
    return createTickets({ data })
  }

  return {
    useTickets,
    updateTickets
  }
})()
