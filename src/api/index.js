import { fetchTickets, transformFetchQuery as transformTickets } from "./tickets/request"

export const extend = {
  tickets: params => fetchTickets(transformTickets(params))
}