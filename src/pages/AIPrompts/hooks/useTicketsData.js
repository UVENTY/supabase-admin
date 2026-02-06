import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../supabase/client'

export function useTicketsData(eventIds) {
  return useQuery({
    queryKey: ['events-tickets', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return {}
      
      const { data: tickets, error } = await supabase
        .from('ticket')
        .select('id_schedule, section, row, seat, tariff, currency, status')
        .in('id_schedule', eventIds)
      
      if (error) {
        console.error('Error fetching tickets:', error)
        return {}
      }
      
      const grouped = {}
      tickets.forEach(ticket => {
        const eventId = String(ticket.id_schedule)
        if (!grouped[eventId]) {
          grouped[eventId] = {
            tickets: [],
            prices: new Set(),
            sections: new Set()
          }
        }
        grouped[eventId].tickets.push(ticket)
        if (ticket.tariff !== null && ticket.tariff !== undefined) {
          grouped[eventId].prices.add(ticket.tariff)
        }
        if (ticket.section) {
          grouped[eventId].sections.add(ticket.section)
        }
      })
      
      return grouped
    },
    enabled: eventIds.length > 0
  })
}
