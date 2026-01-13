import { useMutation, useQuery } from '@tanstack/react-query'
import { filter, group, order, pipe, renameKeys } from '../utils'
import { selectFlatArray } from './selector'
import { fetchTickets } from './request'

export const useEvents = ({ event_id, extend } = {}, fn = {}, queryOptions = {}) => {
  // let queryFn = fetchTickets(renameKeys({ event_id: 'key' }, { event_id }))
  /* if (extend) {
    const fns = extend.map(key => {

    })
    queryFn = waterfall([
      async function(cb) {
        const res = await queryFn
        cb(null, res)
      },
      
    ])
  } */

  return useQuery({
    ...queryOptions,
    queryKey: ['tickets', event_id, params],
    queryFn: () => fetchTickets(renameKeys({ event_id: 'key' }, { event_id })),
    select: pipe(
      selectFlatArray,
      filter(fn.filter),
      order(fn.order),
      group(fn.group)
    )
  })
}
/**
 * @param { object } options
 * @param { string } options.event_id
 * @param { string } options.hall_id
 * @param { Ticket[] } options.tickets
 * @returns { import('@tanstack/react-query').UseMutationResult }
 */
const useCreate = (options) => {
  const { event_id, hall_id, tickets } = options
  if (!event_id || !hall_id) throw new Error('Не переданы обязательные параметры')
  const params = tickets.reduce((acc, ticket) => {
    const key = [hall_id, ticket.category, ticket.row, ticket.seat].join(';')
    const price = [ticket.price, ticket.currency].filter(Boolean).join(' ').toUpperCase()
    let priceIndex = acc.price.indexOf(price)
    if (priceIndex === -1) {
      acc.price.push(price)
      priceIndex = acc.price.length - 1
    }
    acc.t_options[key] = priceIndex
    return acc
  }, {
    t_options: {},
    price: [],
  })
  params.t_start_address = `sc_id\u0000${event_id}`
  const data = JSON.stringify({
    ...params,
    t_start_address: `sc_id\u0000${event_id}`
  })
  return useMutation({
    mutationFn: () => fetchTickets({ data })
  })
}

export default {
  useFetch: useTickets,
  useCreate
}

