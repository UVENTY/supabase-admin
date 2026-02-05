export function getEventsContext(eventId, schedule, teams, stadiums, tournaments, ticketsData, ticketsPurchases, cities, countries) {
  if (!schedule || Object.keys(schedule).length === 0) {
    return { events: [] }
  }

  const eventIdsToProcess = eventId ? [String(eventId)] : Object.keys(schedule)

  const events = eventIdsToProcess.map(id => {
    const event = schedule[id]
    
    const eventTickets = ticketsData?.[id] || { tickets: [], prices: new Set(), sections: new Set() }
    
    const purchasesFromRedux = ticketsPurchases[id]
    
    const pricesArray = Array.from(eventTickets.prices || []).filter(p => p !== null && p !== undefined && p > 0).sort((a, b) => a - b)
    const sectionsArray = Array.from(eventTickets.sections || [])
    
    let ticketsList = eventTickets.tickets || []
    let soldTicketsCount = 0
    let availableTicketsCount = 0
    let purchaseDates = {}
    let soldTicketsList = []
    
    if (purchasesFromRedux && Array.isArray(purchasesFromRedux)) {
      ticketsList = purchasesFromRedux
      soldTicketsCount = purchasesFromRedux.filter(t => t.sold_info).length
      availableTicketsCount = purchasesFromRedux.filter(t => !t.sold_info && t.status !== 'disabled').length
      
      soldTicketsList = purchasesFromRedux
        .filter(t => t.sold_info)
        .map(t => ({
          section: t.section,
          row: t.row,
          seat: t.seat,
          tariff: t.tariff,
          currency: t.currency,
          purchaseDate: t.sold_info?.date || null
        }))
      
      purchasesFromRedux.forEach(ticket => {
        if (ticket.sold_info && ticket.sold_info.date) {
          const date = ticket.sold_info.date
          purchaseDates[date] = (purchaseDates[date] || 0) + 1
        }
      })
    } else {
      soldTicketsCount = ticketsList.filter(t => t.status === 'sold' || t.status === 1).length
      availableTicketsCount = ticketsList.filter(t => t.status !== 'disabled' && t.status !== 'sold' && t.status !== 1).length
    }
    
    let team1Id = null
    if (event?.team1) {
      if (typeof event.team1 === 'object' && event.team1 !== null) {
        team1Id = event.team1.id_team || event.team1.id || event.team1
      } else {
        team1Id = event.team1
      }
    }
    
    let stadiumId = null
    if (event?.stadium) {
      if (typeof event.stadium === 'object' && event.stadium !== null) {
        stadiumId = event.stadium.id_stadium || event.stadium.id || event.stadium
      } else {
        stadiumId = event.stadium
      }
    } else if (event?.id_stadium) {
      stadiumId = event.id_stadium
    }
    
    let tournamentId = null
    if (event?.tournament) {
      if (typeof event.tournament === 'object' && event.tournament !== null) {
        tournamentId = event.tournament.id_tournament || event.tournament.id || event.tournament
      } else {
        tournamentId = event.tournament
      }
    } else if (event?.id_tournament) {
      tournamentId = event.id_tournament
    }
    
    const team1Data = team1Id ? (teams[team1Id] || teams[String(team1Id)] || teams[Number(team1Id)]) : null
    const stadiumData = stadiumId ? (stadiums[stadiumId] || stadiums[String(stadiumId)] || stadiums[Number(stadiumId)]) : null
    const tournamentData = tournamentId ? (tournaments[tournamentId] || tournaments[String(tournamentId)] || tournaments[Number(tournamentId)]) : null
    
    let countryName = null
    let cityName = null
    if (stadiumData) {
      const countryCode = stadiumData.country || null
      if (countryCode && countries) {
        const countryData = countries[countryCode] || countries[String(countryCode).toUpperCase()] || countries[String(countryCode).toLowerCase()]
        if (countryData) {
          countryName = countryData.name || countryData.name_en || countryData.en || countryCode
        } else {
          countryName = countryCode
        }
      }
      
      const cityId = stadiumData.city || stadiumData.id_city
      if (cityId && cities) {
        const cityData = cities[cityId] || cities[String(cityId)] || cities[Number(cityId)]
        if (cityData) {
          cityName = cityData.name_en || cityData.en || cityData.name || String(cityId)
        } else {
          cityName = String(cityId)
        }
      }
    }
    
    return {
      id: id,
      artist: team1Data ? (team1Data.en || team1Data.name_en || team1Data.name || '') : '',
      stadium: stadiumData ? (stadiumData.en || stadiumData.name_en || stadiumData.name || '') : '',
      tournament: tournamentData ? (tournamentData.en || tournamentData.name_en || tournamentData.name || '') : '',
      country: countryName, 
      city: cityName, 
      date: event?.datetime || event?.start_datetime || '',
      currency: event?.currency || '',
      duration: event?.duration || null,
      prices: pricesArray,
      sections: sectionsArray,
      totalTickets: ticketsList.length,
      soldTickets: soldTicketsCount,
      availableTickets: availableTicketsCount,
      minPrice: pricesArray.length > 0 ? Math.min(...pricesArray) : null,
      maxPrice: pricesArray.length > 0 ? Math.max(...pricesArray) : null,
      averagePrice: pricesArray.length > 0 
        ? Math.round((pricesArray.reduce((a, b) => a + b, 0) / pricesArray.length) * 100) / 100 
        : null,
      purchaseDates: purchaseDates, 
      soldTicketsList: soldTicketsList 
    }
  }).filter(event => event.id) 
  
  return { events }
}
