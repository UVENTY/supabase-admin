import dayjs from 'dayjs'

export function getEventOptions(schedule, teams) {
  return Object.keys(schedule).map(eventId => {
    const event = schedule[eventId]
    let eventName = ''
    
    let team1Id = null
    if (event?.team1) {
      if (typeof event.team1 === 'object' && event.team1 !== null) {
        team1Id = event.team1.id_team || event.team1.id || event.team1
      } else {
        team1Id = event.team1
      }
    }
    
    const team1Data = team1Id ? (teams[team1Id] || teams[String(team1Id)] || teams[Number(team1Id)]) : null
    if (team1Data) {
      const name = team1Data.en || team1Data.name_en || team1Data.name || ''
      if (name) {
        eventName = name
      }
    }
    
    if (eventName) {
      eventName = eventName.toUpperCase()
    }
    
    const date = event?.datetime || event?.start_datetime
    let datePart = ''
    if (date) {
      const formattedDate = dayjs(date).format('DD.MM.YYYY')
      datePart = formattedDate
    }
    
    let label = `Event ID ${eventId}`
    if (eventName) {
      label += ` - ${eventName}`
    }
    if (datePart) {
      label += ` дата концерта ${datePart}`
    }
    
    return {
      value: eventId,
      label: label
    }
  })
}
