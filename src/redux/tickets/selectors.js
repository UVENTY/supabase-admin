import { createSelector } from 'reselect'

function addFileToMatchTickets(match, filesMap) {
  if (!match || !match.tickets) return match
  return {
    ...match,
    tickets: match.tickets.map(ticket => ({ ...ticket, isFile: filesMap[ticket.seatId] }))
  }
}

export const getMatchTickets = createSelector(
  state => state.tickets.ticketsByMatch,
  state => state.tickets.ticketsWithFile,
  (state, matchId) => matchId,
  (ticketsByMatch, withFile, matchId) => {
    const res = matchId ?
      addFileToMatchTickets(ticketsByMatch[matchId], withFile) :
      Object.values(ticketsByMatch).filter(item => item.tickets.length > 0).map(item => addFileToMatchTickets(item, withFile))

    return res
  }
)