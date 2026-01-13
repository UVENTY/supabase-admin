import { createSelector } from 'reselect'

const extendTeam = (id, teams, stadiums) => {
  const team = teams[id]
  if (!team) return null
  const stadium = stadiums[team.stadium]
  return {
    ...team,
    stadium
  }
}

export const getStadium = createSelector(
  (state, stadiumId) => stadiumId,
  state => state.data.stadiums,
  (id, stadiums) => stadiums[id]
)

export const getStadiumsList = createSelector(
  state => state.data.stadiums,
  stadiums => Object.values(stadiums)
)

export const getTournament = createSelector(
  (state, tournamentId) => tournamentId,
  state => state.data.tournaments,
  (id, tournaments) => {
    return tournaments[String(id)] || tournaments[Number(id)] || tournaments[id]
  }
)

export const getTournamentsList = createSelector(
  state => state.data.tournaments,
  tournaments => Object.values(tournaments)
)

export const getTeam = createSelector(
  (state, teamId) => teamId,
  state => state.data.teams,
  state => state.data.stadiums,
  extendTeam
)

export const getTeams = createSelector(
  state => state.data.teams,
  teams => Object.values(teams)
)

export const getMatch = createSelector(
  (state, matchId) => matchId,
  state => state.data.schedule,
  state => state.data.teams,
  state => state.data.tournaments,
  state => state.data.stadiums,
  (id, schedule, teams, tournaments, stadiums) => {
    const match = schedule[id]
    if (!match) {
      return null
    }
    return {
      ...match,
      team1: extendTeam(match.team1, teams, stadiums),
      team2: extendTeam(match.team2, teams, stadiums),
      stadium: stadiums[match.stadium],
      tournament: tournaments[match.tournament]
    }
  }
)

export const getSchedule = createSelector(
  state => state,
  state => {
    const { schedule } = state.data
    return Object.keys(schedule).reduce((acc, id) => ({
      ...acc,
      [id]: getMatch(state, id)
    }), {})
  }
)

export const getScheduleList = createSelector(
  state => state,
  state => {
    const { schedule } = state.data
    return Object.keys(schedule).map(id => getMatch(state, id))
  }
)

export const getStadiumSchemeStatus = createSelector(
  state => state.data.stadiums,
  (state, id) => id,
  (stadiums, id) => {
    if (stadiums[id]) {
      if (stadiums[id].isSchemeLoading) return 'loading'
      if (stadiums[id].isSchemeLoaded) return 'loaded'
    }
    return null
  }
)

export const getNotifications = createSelector(
  state => state,
  state => {
    const { notifications } = state.data
    return notifications.map(item => ({
      ...item,
      match: getMatch(state, item.match_id)
    }), {})
  }
)